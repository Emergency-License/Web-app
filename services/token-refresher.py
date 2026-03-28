"""
DPS Token Auto-Refresher

Automatically refreshes the DPS auth token using 2Captcha to solve
the reCAPTCHA Enterprise challenge. Runs as a background thread
inside the session manager, or standalone.

Flow:
  1. Submit reCAPTCHA Enterprise solve request to 2Captcha
  2. Poll for solution (takes 15-30 seconds)
  3. Call DPS /api/v1/account/auth with solved token + credentials
  4. Extract the auth token from the response
  5. Update the session manager via POST /set-token

Env vars:
  TWOCAPTCHA_API_KEY — 2Captcha API key
  DPS_FIRST_NAME, DPS_LAST_NAME, DPS_DOB, DPS_SSN4, DPS_PHONE
  DPS_CARD_NUMBER — Texas card number (optional)
  SESSION_MANAGER_URL — where to POST the new token (default localhost:8100)
  DPS_SESSION_SECRET — auth for the session manager API
"""

import json
import os
import sys
import time
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import URLError


# reCAPTCHA Enterprise config for DPS site
RECAPTCHA_SITE_KEY = "6LesF7oaAAAAAEvJD0hjmTUib8Q5PGjTo54U2ieP"
RECAPTCHA_PAGE_URL = "https://public.txdpsscheduler.com/"
RECAPTCHA_ACTION = "login"

DPS_AUTH_URL = "https://apptapi.txdpsscheduler.com/api/v1/account/auth"


def log(msg, level="INFO"):
    from datetime import datetime
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


def solve_recaptcha(api_key: str) -> str:
    """Submit reCAPTCHA Enterprise to 2Captcha and wait for solution."""
    log("Submitting reCAPTCHA Enterprise to 2Captcha...")

    # Submit the captcha
    params = {
        "key": api_key,
        "method": "userrecaptcha",
        "googlekey": RECAPTCHA_SITE_KEY,
        "pageurl": RECAPTCHA_PAGE_URL,
        "version": "v3",
        "action": RECAPTCHA_ACTION,
        "enterprise": "1",
        "min_score": "0.9",
        "json": "1",
    }
    submit_url = "https://2captcha.com/in.php?" + urlencode(params)
    resp = json.loads(urlopen(submit_url, timeout=30).read().decode())

    if resp.get("status") != 1:
        raise Exception(f"2Captcha submit failed: {resp}")

    captcha_id = resp["request"]
    log(f"Submitted — captcha ID: {captcha_id}. Waiting for solution...")

    # Poll for result
    for attempt in range(30):  # Max 150 seconds
        time.sleep(5)
        result_url = f"https://2captcha.com/res.php?key={api_key}&action=get&id={captcha_id}&json=1"
        result = json.loads(urlopen(result_url, timeout=15).read().decode())

        if result.get("status") == 1:
            token = result["request"]
            log(f"reCAPTCHA solved! Token length: {len(token)}")
            return token
        elif result.get("request") == "CAPCHA_NOT_READY":
            continue
        else:
            raise Exception(f"2Captcha solve failed: {result}")

    raise Exception("2Captcha timeout — no solution after 150 seconds")


def authenticate_dps(recaptcha_token: str, credentials: dict) -> str:
    """Call the DPS auth endpoint with the solved reCAPTCHA token."""
    log("Authenticating with DPS...")

    phone = credentials["phone"]
    # Format phone as (###) ###-####
    if len(phone) == 10 and not phone.startswith("("):
        phone = f"({phone[:3]}) {phone[3:6]}-{phone[6:]}"

    payload = {
        "RecaptchaToken": {
            "Action": RECAPTCHA_ACTION,
            "Token": recaptcha_token,
        },
        "UserName": f"{credentials['first_name']}_{credentials['last_name']}_{credentials['ssn4']}",
        "Email": "",
        "CellPhone": phone,
        "UserDetails": {
            "FirstName": credentials["first_name"],
            "LastName": credentials["last_name"],
            "DateOfBirth": credentials["dob"],
            "CardNumber": credentials.get("card_number", ""),
            "LastFourDigitsSsn": credentials["ssn4"],
        },
        "IsEmail": False,
        "IsMobile": True,
        "SelectedLanguage": "EN",
    }

    headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://public.txdpsscheduler.com",
        "Referer": "https://public.txdpsscheduler.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        "IsMFAEnabled": "N",
    }

    body = json.dumps(payload).encode("utf-8")
    req = Request(DPS_AUTH_URL, data=body, headers=headers, method="POST")

    try:
        with urlopen(req, timeout=30) as resp:
            data = resp.read().decode()
            # The auth token is returned in the response
            # It could be in the response body or in a response header
            resp_headers = dict(resp.headers)
            log(f"Auth response status: {resp.status}")

            # Try to parse as JSON
            try:
                resp_json = json.loads(data)
                # Look for token in common fields
                # DPS returns {"success":true,"data":{"token":"..."}}
                data_obj = resp_json.get("data") or resp_json.get("Data") or {}
                if isinstance(data_obj, dict):
                    token = data_obj.get("token") or data_obj.get("Token")
                else:
                    token = None
                if not token:
                    token = (
                        resp_json.get("Token") or
                        resp_json.get("token") or
                        resp_json.get("AuthToken") or
                        resp_json.get("access_token")
                    )
                if token:
                    log(f"Got DPS auth token (length: {len(token)})")
                    return token
                else:
                    log(f"Auth response keys: {list(resp_json.keys())}", "DEBUG")
                    log(f"Auth response: {data[:500]}", "DEBUG")
                    # Maybe the entire response IS the token
                    if isinstance(resp_json, str) and len(resp_json) > 20:
                        return resp_json
            except json.JSONDecodeError:
                # Response might be the raw token
                if len(data) > 20 and "=" in data:
                    log(f"Got raw token from response (length: {len(data)})")
                    return data.strip().strip('"')

            raise Exception(f"Could not extract token from auth response: {data[:300]}")

    except URLError as e:
        if hasattr(e, "read"):
            error_body = e.read().decode()
            log(f"Auth failed ({e.code}): {error_body[:300]}", "ERROR")
        raise Exception(f"DPS auth failed: {e}")


def update_session_manager(token: str, manager_url: str, secret: str):
    """Push the new token to the session manager."""
    url = f"{manager_url}/set-token"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {secret}",
    }
    body = json.dumps({"token": token}).encode("utf-8")
    req = Request(url, data=body, headers=headers, method="POST")
    resp = json.loads(urlopen(req, timeout=10).read().decode())
    log(f"Session manager updated: {resp}")


def refresh_token():
    """Full token refresh cycle: solve captcha → authenticate → update."""
    api_key = os.environ.get("TWOCAPTCHA_API_KEY")
    if not api_key:
        raise Exception("TWOCAPTCHA_API_KEY env var required")

    credentials = {
        "first_name": os.environ.get("DPS_FIRST_NAME", ""),
        "last_name": os.environ.get("DPS_LAST_NAME", ""),
        "dob": os.environ.get("DPS_DOB", ""),
        "ssn4": os.environ.get("DPS_SSN4", ""),
        "phone": os.environ.get("DPS_PHONE", ""),
        "card_number": os.environ.get("DPS_CARD_NUMBER", ""),
    }

    if not all([credentials["first_name"], credentials["last_name"],
                credentials["dob"], credentials["ssn4"], credentials["phone"]]):
        raise Exception("DPS credentials env vars required")

    manager_url = os.environ.get("SESSION_MANAGER_URL", "http://127.0.0.1:8100")
    secret = os.environ.get("DPS_SESSION_SECRET", "")

    # Step 1: Solve reCAPTCHA
    recaptcha_token = solve_recaptcha(api_key)

    # Step 2: Authenticate with DPS
    dps_token = authenticate_dps(recaptcha_token, credentials)

    # Step 3: Update session manager
    if secret:
        update_session_manager(dps_token, manager_url, secret)

    return dps_token


def run_refresh_loop(interval_minutes=20):
    """Continuously refresh the token on a schedule."""
    log(f"Starting token refresh loop (every {interval_minutes} min)")
    while True:
        try:
            token = refresh_token()
            log(f"Token refreshed successfully (length: {len(token)})")
        except Exception as e:
            log(f"Token refresh failed: {e}", "ERROR")
            # Retry sooner on failure
            time.sleep(60)
            continue
        time.sleep(interval_minutes * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="DPS Token Auto-Refresher")
    parser.add_argument("--once", action="store_true", help="Refresh once and exit")
    parser.add_argument("--interval", type=int, default=20, help="Refresh interval in minutes")
    args = parser.parse_args()

    if args.once:
        token = refresh_token()
        print(f"Token: {token[:50]}...")
    else:
        run_refresh_loop(args.interval)
