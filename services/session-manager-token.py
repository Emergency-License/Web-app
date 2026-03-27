"""
DPS Session Manager — Token Mode

Simple HTTP service that stores the DPS auth token and proxies API calls.
The token is obtained when a user logs in via the DPS site (VNC browser).
This service just needs the token to make API calls — no browser required.

Architecture:
  1. User logs into DPS via VNC browser (handles reCAPTCHA)
  2. The auth response contains a token
  3. This service stores the token and uses it for all API calls
  4. Token is refreshed by POST /set-token or by re-login via VNC

The token can be set via:
  - POST /set-token {"token": "..."} — set manually
  - --token flag or DPS_AUTH_TOKEN env var — set at startup
  - Auto-extracted from the VNC browser via CDP (if available)

Usage:
  python3 session-manager-token.py --token "Ka3BjU..." --secret YOUR_SECRET
"""

import argparse
import json
import os
import sys
import time
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import URLError

API_BASE = "https://apptapi.txdpsscheduler.com/api/"
CDP_URL = "http://127.0.0.1:9222"

REQUIRED_HEADERS = {
    "Content-Type": "application/json;charset=UTF-8",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://public.txdpsscheduler.com",
    "Referer": "https://public.txdpsscheduler.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
}


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


class TokenSessionManager:
    """Manages the DPS auth token and proxies API calls."""

    def __init__(self, token=None):
        self.token = token
        self.token_set_at = datetime.now() if token else None
        self.last_api_call = None
        self.lock = threading.Lock()

    def set_token(self, token):
        with self.lock:
            self.token = token
            self.token_set_at = datetime.now()
            log(f"Token updated (length: {len(token)})")

    def is_healthy(self):
        return bool(self.token)

    def call_api(self, endpoint, payload):
        """Call the DPS API with the stored auth token."""
        if not self.token:
            return {"error": "No auth token set. Login via VNC to get a token."}

        url = API_BASE + endpoint
        headers = dict(REQUIRED_HEADERS)
        headers["Authorization"] = self.token

        try:
            body = json.dumps(payload).encode("utf-8")
            req = Request(url, data=body, headers=headers, method="POST")
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                self.last_api_call = datetime.now()
                return {"data": data}
        except URLError as e:
            error_msg = str(e)
            if hasattr(e, "code") and e.code == 401:
                log("Token expired or invalid — need re-login via VNC", "WARN")
                return {"error": "Unauthorized — token expired. Re-login via VNC."}
            log(f"API call failed: {error_msg}", "ERROR")
            return {"error": error_msg}
        except Exception as e:
            log(f"API call failed: {e}", "ERROR")
            return {"error": str(e)}

    def try_extract_token_from_cdp(self):
        """Try to extract the auth token from the VNC browser via CDP."""
        try:
            import requests as req_lib
            tabs = req_lib.get(f"{CDP_URL}/json", timeout=3).json()
            if not tabs:
                return None

            # Use websocket to evaluate JS in the page
            import websocket
            ws_url = tabs[0]["webSocketDebuggerUrl"]
            ws = websocket.create_connection(ws_url, timeout=5)

            # Ask the page for the Vuex/Pinia store token
            msg_id = 1
            ws.send(json.dumps({
                "id": msg_id,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                        (() => {
                            // Try to find the auth token in the Vue store
                            const app = document.querySelector('#app');
                            if (app && app.__vue_app__) {
                                const store = app.__vue_app__.config.globalProperties.$store;
                                if (store && store.state) {
                                    // Check common Vuex state paths for auth token
                                    return store.state.auth?.token ||
                                           store.state.token ||
                                           store.state.user?.token ||
                                           JSON.stringify(Object.keys(store.state));
                                }
                            }
                            return null;
                        })()
                    """,
                    "returnByValue": True,
                }
            }))

            result = json.loads(ws.recv())
            ws.close()

            value = result.get("result", {}).get("result", {}).get("value")
            if value and len(str(value)) > 20 and "=" in str(value):
                log(f"Extracted token from browser: {str(value)[:30]}...")
                return str(value)
            return None
        except Exception as e:
            log(f"CDP token extraction failed: {e}", "DEBUG")
            return None


class TokenAPIHandler(BaseHTTPRequestHandler):
    """HTTP API handler."""

    manager: TokenSessionManager = None
    secret: str = None

    def _check_auth(self):
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
                "status": "ok" if self.manager.is_healthy() else "no_token",
                "authenticated": self.manager.is_healthy(),
                "token_set_at": str(self.manager.token_set_at),
                "last_api_call": str(self.manager.last_api_call),
            })
        else:
            self._respond(404, {"error": "Not found"})

    def do_POST(self):
        if not self._check_auth():
            return
        content_len = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_len)) if content_len else {}

        if self.path == "/api-call":
            endpoint = body.get("endpoint", "")
            payload = body.get("payload", {})
            result = self.manager.call_api(endpoint, payload)
            self._respond(200, result)
        elif self.path == "/set-token":
            token = body.get("token", "")
            if not token:
                self._respond(400, {"error": "token required"})
                return
            self.manager.set_token(token)
            self._respond(200, {"status": "ok", "message": "Token updated"})
        elif self.path == "/refresh":
            token = self.manager.try_extract_token_from_cdp()
            if token:
                self.manager.set_token(token)
                self._respond(200, {"status": "ok", "message": "Token refreshed from browser"})
            else:
                self._respond(200, {"status": "no_browser", "message": "Could not extract token from browser"})
        else:
            self._respond(404, {"error": "Not found"})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description="DPS Session Manager (Token Mode)")
    parser.add_argument("--port", type=int, default=8100)
    parser.add_argument("--secret", default=None)
    parser.add_argument("--token", default=None, help="Initial DPS auth token")
    parser.add_argument("--bind", default="0.0.0.0")
    args = parser.parse_args()

    secret = args.secret or os.environ.get("DPS_SESSION_SECRET")
    token = args.token or os.environ.get("DPS_AUTH_TOKEN")

    manager = TokenSessionManager(token)

    if not token:
        log("No initial token. Trying to extract from VNC browser...")
        extracted = manager.try_extract_token_from_cdp()
        if extracted:
            manager.set_token(extracted)
        else:
            log("No token available. Set via POST /set-token or re-login via VNC.", "WARN")

    TokenAPIHandler.manager = manager
    TokenAPIHandler.secret = secret
    server = HTTPServer((args.bind, args.port), TokenAPIHandler)
    log(f"Session API listening on http://{args.bind}:{args.port}")
    if secret:
        log("Auth enabled")
    if manager.is_healthy():
        log("Token loaded — ready to proxy DPS API calls")
    else:
        log("Waiting for token — POST /set-token to activate")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down...")


if __name__ == "__main__":
    main()
