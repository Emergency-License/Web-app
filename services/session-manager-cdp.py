"""
DPS Session Manager — CDP Mode

Connects to an already-authenticated Chromium browser via Chrome DevTools
Protocol (CDP) and proxies DPS API calls through the page's fetch context.

The browser must be started manually with --remote-debugging-port=9222
and the user must log in via VNC. After that, this service:
  - Connects to the browser via CDP
  - Exposes an HTTP API on port 8100
  - Proxies DPS API calls through the authenticated page
  - Auto-refreshes by navigating the page periodically

Usage:
  # 1. Start Chrome on VNC display with CDP:
  #    DISPLAY=:1 chrome --remote-debugging-port=9222 --no-sandbox https://public.txdpsscheduler.com/
  # 2. Log in manually via noVNC
  # 3. Start this service:
  python3 session-manager-cdp.py --secret YOUR_SECRET --port 8100
"""

import argparse
import json
import os
import sys
import time
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Install: pip install playwright")
    sys.exit(1)

CDP_URL = "http://127.0.0.1:9222"
API_BASE = "https://apptapi.txdpsscheduler.com/api/"


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


class CDPSessionManager:
    """Connects to an existing authenticated browser and proxies API calls."""

    def __init__(self):
        self.playwright = None
        self.browser = None
        self.page = None
        self.connected = False
        self.last_api_call = None
        self.lock = threading.Lock()

    def connect(self):
        """Connect to the existing browser via CDP."""
        log("Connecting to browser via CDP...")
        try:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.connect_over_cdp(CDP_URL)
            contexts = self.browser.contexts
            if not contexts or not contexts[0].pages:
                log("No pages found in browser", "ERROR")
                return False
            self.page = contexts[0].pages[0]
            page_url = self.page.url
            log(f"Connected to page: {page_url}")
            self.connected = True
            self.last_api_call = datetime.now()
            return True
        except Exception as e:
            log(f"CDP connection failed: {e}", "ERROR")
            return False

    def is_healthy(self) -> bool:
        """Check if we're still connected to the browser."""
        if not self.connected or not self.page:
            return False
        try:
            # Quick check — can we still access the page?
            self.page.url
            return True
        except Exception:
            self.connected = False
            return False

    def call_api(self, endpoint: str, payload: dict) -> dict:
        """Execute a DPS API call through the authenticated browser page."""
        url = API_BASE + endpoint
        with self.lock:
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
                            if (!resp.ok) {
                                return {error: resp.status, statusText: resp.statusText};
                            }
                            return {data: await resp.json()};
                        } catch(e) {
                            return {error: e.message};
                        }
                    }
                """, [url, payload])
                self.last_api_call = datetime.now()
                return result
            except Exception as e:
                log(f"API call failed: {e}", "ERROR")
                return {"error": str(e)}

    def refresh_session(self):
        """Navigate to keep the session alive."""
        if not self.is_healthy():
            return
        try:
            log("Refreshing session...")
            self.page.goto("https://public.txdpsscheduler.com/", wait_until="networkidle", timeout=30000)
            time.sleep(3)
            log("Session refreshed")
        except Exception as e:
            log(f"Session refresh failed: {e}", "ERROR")

    def shutdown(self):
        """Disconnect (don't close the browser — user may still need it)."""
        if self.playwright:
            self.playwright.stop()
        log("Session manager disconnected.")


class SessionAPIHandler(BaseHTTPRequestHandler):
    """HTTP API for the Next.js app to call."""

    manager: CDPSessionManager = None
    secret: str = None

    def _check_auth(self) -> bool:
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
                "status": "ok" if self.manager.is_healthy() else "disconnected",
                "authenticated": self.manager.connected,
                "last_api_call": str(self.manager.last_api_call),
            })
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
            self.manager.refresh_session()
            self._respond(200, {"status": "refreshed", "healthy": self.manager.is_healthy()})
        else:
            self._respond(404, {"error": "Not found"})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass


def auto_refresh_loop(manager: CDPSessionManager):
    """Periodically refresh the session to keep it alive."""
    while True:
        time.sleep(20 * 60)  # Every 20 minutes
        try:
            manager.refresh_session()
        except Exception as e:
            log(f"Auto-refresh failed: {e}", "ERROR")


def main():
    parser = argparse.ArgumentParser(description="DPS Session Manager (CDP Mode)")
    parser.add_argument("--port", type=int, default=8100)
    parser.add_argument("--secret", default=None, help="Bearer token or DPS_SESSION_SECRET env var")
    parser.add_argument("--bind", default="0.0.0.0")
    args = parser.parse_args()

    secret = args.secret or os.environ.get("DPS_SESSION_SECRET")

    manager = CDPSessionManager()
    if not manager.connect():
        log("Cannot connect to browser. Make sure Chrome is running with --remote-debugging-port=9222", "ERROR")
        sys.exit(1)

    # Start auto-refresh
    refresh_thread = threading.Thread(target=auto_refresh_loop, args=(manager,), daemon=True)
    refresh_thread.start()

    # Start HTTP API
    SessionAPIHandler.manager = manager
    SessionAPIHandler.secret = secret
    server = HTTPServer((args.bind, args.port), SessionAPIHandler)
    log(f"Session API listening on http://{args.bind}:{args.port}")
    if secret:
        log("Auth enabled")
    log("Ready to proxy DPS API calls through the authenticated browser")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down...")
    finally:
        manager.shutdown()


if __name__ == "__main__":
    main()
