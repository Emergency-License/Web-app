"""
DPS Session Manager Service

Maintains authenticated browser sessions against the Texas DPS scheduler.
These sessions are used by the poll worker to check availability without
each user needing to log in.

Architecture:
  - Launches a Playwright Chromium instance
  - Logs in once (reCAPTCHA is score-based/invisible in a real browser)
  - Stores session cookies that the poll worker reuses
  - Re-authenticates when sessions expire
  - Exposes a local HTTP API for the poll worker to call

The reCAPTCHA Enterprise on the DPS site uses score-based invisible mode
(key: 6LesF7oaAAAAAEvJD0hjmTUib8Q5PGjTo54U2ieP). In a real Chromium
browser with normal behavior patterns, this typically passes automatically.

Usage:
  python session-manager.py --first-name Joe --last-name Smith \
    --dob 01/15/1990 --ssn4 1234 --phone 5551234567

  Then the poll worker calls http://localhost:8100/session to get cookies.
"""

import argparse
import json
import os
import sys
import time
import threading
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
except ImportError:
    print("Install: pip install playwright && playwright install chromium")
    sys.exit(1)

SITE_URL = "https://public.txdpsscheduler.com/"
API_BASE = "https://apptapi.txdpsscheduler.com/api/"
STATE_DIR = Path(__file__).parent / ".sessions"
STATE_DIR.mkdir(exist_ok=True)

# How often to refresh the session (DPS sessions seem to last ~30 min)
SESSION_REFRESH_INTERVAL = 25 * 60  # 25 minutes


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


class DPSSessionManager:
    """Manages a pool of authenticated DPS browser sessions."""

    def __init__(self, credentials: dict):
        self.credentials = credentials
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.cookies = []
        self.last_auth_time = None
        self.auth_ok = False
        self.lock = threading.Lock()

    def start(self):
        """Launch browser and authenticate."""
        log("Starting session manager...")
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=False,  # Visible so reCAPTCHA scores well
            args=[
                "--disable-blink-features=AutomationControlled",
                "--window-size=1280,900",
            ],
        )
        self.context = self.browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self.page = self.context.new_page()
        self._authenticate()

    def _authenticate(self):
        """Log into the DPS scheduler."""
        log("Navigating to DPS scheduler...")
        self.page.goto(SITE_URL, wait_until="networkidle")
        time.sleep(1)

        # Select English — the DPS site uses a Vuetify modal with "English" button
        try:
            self.page.click("button:has-text('English')", timeout=8000)
            time.sleep(2)
        except PwTimeout:
            pass

        # Fill login form — DPS uses Vuetify, fields identified by label[for] → input#id
        # IDs like input-145 are auto-generated and may change, so we use label text
        log("Filling login form...")
        creds = self.credentials

        def fill_by_label(label_text, value):
            """Find input by its associated label text (Vuetify pattern)."""
            label = self.page.locator(f"label:has-text('{label_text}')")
            input_id = label.get_attribute("for", timeout=5000)
            if input_id:
                self.page.fill(f"#{input_id}", value, timeout=5000)
            else:
                log(f"Could not find input for label '{label_text}'", "WARN")

        fill_by_label("First Name", creds["first_name"])
        fill_by_label("Last Name", creds["last_name"])
        # DOB field has a stable ID
        self.page.fill("#dob", creds["dob"], timeout=5000)
        # SSN field has a stable ID
        self.page.fill("#last4Ssn", creds["ssn4"], timeout=5000)

        # Select phone or email contact via radio button label
        if creds.get("phone"):
            try:
                # Click the "Cell Phone" radio label (not the input field label)
                self.page.locator("label:has-text('Cell Phone')").first.click(timeout=3000)
                time.sleep(0.5)
                self.page.fill("#cellPhone", creds["phone"], timeout=5000)
            except PwTimeout:
                pass
        elif creds.get("email"):
            try:
                self.page.locator("label:has-text('Email')").first.click(timeout=3000)
                time.sleep(0.5)
                # Email input appears after clicking the radio
                self.page.fill("input[type='email'], #email", creds["email"], timeout=5000)
            except PwTimeout:
                pass

        # Click Log On — reCAPTCHA Enterprise runs invisibly
        log("Submitting login (reCAPTCHA will score automatically)...")
        self.page.click("button:has-text('Log On')")

        # Wait for successful login (service selection page appears)
        try:
            self.page.wait_for_selector(
                'text=Select the type of service',
                timeout=30000,
            )
            self.auth_ok = True
            self.last_auth_time = datetime.now()
            self._save_cookies()
            log("Authentication successful!")
        except PwTimeout:
            log("Login may have failed. Capturing debug info...", "WARN")
            # Capture page state for debugging
            try:
                page_url = self.page.url
                page_title = self.page.title()
                page_text = self.page.text_content("body", timeout=3000)
                # Truncate page text for logging
                snippet = (page_text or "")[:500].replace("\n", " ").strip()
                log(f"Page URL: {page_url}", "DEBUG")
                log(f"Page title: {page_title}", "DEBUG")
                log(f"Page text snippet: {snippet}", "DEBUG")
                # Save screenshot for debugging
                screenshot_path = STATE_DIR / "debug-screenshot.png"
                self.page.screenshot(path=str(screenshot_path))
                log(f"Screenshot saved to {screenshot_path}", "DEBUG")
            except Exception as e:
                log(f"Debug capture failed: {e}", "WARN")

            # Check for error messages (Vuetify alerts)
            try:
                error = self.page.text_content('.v-alert, .error-message, .alert-danger, [role="alert"]', timeout=3000)
                if error:
                    log(f"Login error message: {error.strip()}", "ERROR")
            except PwTimeout:
                log("No error message element found.", "WARN")

            # Give it more time — DPS can be slow
            try:
                self.page.wait_for_selector(
                    'text=Select the type of service',
                    timeout=60000,
                )
                self.auth_ok = True
                self.last_auth_time = datetime.now()
                self._save_cookies()
                log("Authentication successful (delayed)!")
            except PwTimeout:
                log("Authentication failed after extended wait.", "ERROR")

    def _save_cookies(self):
        """Save session cookies to disk and memory."""
        with self.lock:
            self.cookies = self.context.cookies()
            cookie_file = STATE_DIR / "cookies.json"
            with open(cookie_file, "w") as f:
                json.dump(self.cookies, f, indent=2)
            log(f"Saved {len(self.cookies)} cookies to {cookie_file}")

    def get_cookies(self) -> list:
        """Return current session cookies."""
        with self.lock:
            return list(self.cookies)

    def get_cookie_header(self) -> str:
        """Return cookies formatted as a Cookie header value."""
        with self.lock:
            return "; ".join(f"{c['name']}={c['value']}" for c in self.cookies)

    def is_healthy(self) -> bool:
        """Check if the session is still valid."""
        if not self.auth_ok or not self.last_auth_time:
            return False
        elapsed = (datetime.now() - self.last_auth_time).total_seconds()
        return elapsed < SESSION_REFRESH_INTERVAL

    def refresh_if_needed(self):
        """Re-authenticate if session is about to expire."""
        if not self.is_healthy():
            log("Session expired or expiring. Re-authenticating...")
            self._authenticate()

    def call_api(self, endpoint: str, payload: dict) -> dict:
        """Call a DPS API endpoint using the authenticated browser session."""
        url = API_BASE + endpoint
        try:
            result = self.page.evaluate("""
                async ([url, payload]) => {
                    try {
                        const resp = await fetch(url, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(payload),
                            credentials: 'include'
                        });
                        if (!resp.ok) return {error: resp.status, statusText: resp.statusText};
                        return {data: await resp.json()};
                    } catch(e) {
                        return {error: e.message};
                    }
                }
            """, [url, payload])
            return result
        except Exception as e:
            return {"error": str(e)}

    def shutdown(self):
        """Clean up browser resources."""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        log("Session manager shut down.")


class SessionAPIHandler(BaseHTTPRequestHandler):
    """HTTP API for the poll worker to access session state."""

    manager: DPSSessionManager = None  # Set by main()
    secret: str = None  # Set by main() — if set, all requests must include it

    def _check_auth(self) -> bool:
        """Verify Bearer token if a secret is configured."""
        if not self.secret:
            return True
        auth = self.headers.get("Authorization", "")
        if auth == f"Bearer {self.secret}":
            return True
        self._respond(401, {"error": "Unauthorized"})
        return False

    def do_GET(self):
        if not self._check_auth():
            return
        if self.path == "/health":
            self._respond(200, {
                "status": "ok" if self.manager.is_healthy() else "expired",
                "authenticated": self.manager.auth_ok,
                "last_auth": str(self.manager.last_auth_time),
            })
        elif self.path == "/cookies":
            cookies = self.manager.get_cookies()
            self._respond(200, {"cookies": cookies, "count": len(cookies)})
        elif self.path == "/cookie-header":
            header = self.manager.get_cookie_header()
            self._respond(200, {"cookie_header": header})
        else:
            self._respond(404, {"error": "Not found"})

    def do_POST(self):
        if not self._check_auth():
            return
        if self.path == "/api-call":
            content_len = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_len))
            endpoint = body.get("endpoint", "")
            payload = body.get("payload", {})
            result = self.manager.call_api(endpoint, payload)
            self._respond(200, result)
        elif self.path == "/refresh":
            self.manager.refresh_if_needed()
            self._respond(200, {"status": "refreshed", "healthy": self.manager.is_healthy()})
        else:
            self._respond(404, {"error": "Not found"})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress default logging


def auto_refresh_loop(manager: DPSSessionManager):
    """Background thread that refreshes the session before it expires."""
    while True:
        time.sleep(60)
        try:
            manager.refresh_if_needed()
        except Exception as e:
            log(f"Auto-refresh failed: {e}", "ERROR")


def main():
    parser = argparse.ArgumentParser(description="DPS Session Manager Service")
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--dob", required=True, help="Date of birth MM/DD/YYYY")
    parser.add_argument("--ssn4", required=True, help="Last 4 digits of SSN")
    parser.add_argument("--phone", default=None, help="Cell phone number")
    parser.add_argument("--email", default=None, help="Email address")
    parser.add_argument("--port", type=int, default=8100, help="API port (default 8100)")
    parser.add_argument("--secret", default=None, help="Bearer token for API auth (or DPS_SESSION_SECRET env var)")
    parser.add_argument("--bind", default="0.0.0.0", help="Bind address (default 0.0.0.0)")
    args = parser.parse_args()

    if not args.phone and not args.email:
        print("ERROR: Provide either --phone or --email")
        sys.exit(1)

    secret = args.secret or os.environ.get("DPS_SESSION_SECRET")

    credentials = {
        "first_name": args.first_name,
        "last_name": args.last_name,
        "dob": args.dob,
        "ssn4": args.ssn4,
        "phone": args.phone,
        "email": args.email,
    }

    manager = DPSSessionManager(credentials)
    manager.start()

    if not manager.auth_ok:
        log("Failed to authenticate. Exiting.", "ERROR")
        manager.shutdown()
        sys.exit(1)

    # Start auto-refresh in background
    refresh_thread = threading.Thread(target=auto_refresh_loop, args=(manager,), daemon=True)
    refresh_thread.start()

    # Start HTTP API
    SessionAPIHandler.manager = manager
    SessionAPIHandler.secret = secret
    server = HTTPServer((args.bind, args.port), SessionAPIHandler)
    log(f"Session API listening on http://{args.bind}:{args.port}")
    if secret:
        log(f"Auth enabled — requests require 'Authorization: Bearer <token>'")
    log(f"  GET  /health       — Check session status")
    log(f"  GET  /cookies      — Get session cookies")
    log(f"  POST /api-call     — Proxy a DPS API call")
    log(f"  POST /refresh      — Force session refresh")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down...")
    finally:
        manager.shutdown()


if __name__ == "__main__":
    main()
