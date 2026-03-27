"""
DPS Alert Service

Sends SMS and email notifications when appointments become available.
Uses Twilio for SMS and Resend for email.

Exposes HTTP API on port 8200 for the poll worker to call.

Environment variables:
  TWILIO_ACCOUNT_SID  — Twilio account SID
  TWILIO_AUTH_TOKEN   — Twilio auth token
  TWILIO_FROM_NUMBER  — Twilio phone number (e.g. +15551234567)
  RESEND_API_KEY      — Resend API key
  RESEND_FROM_EMAIL   — Sender email (e.g. alerts@emergencylicense.com)

Usage:
  python alert-service.py [--port 8200]
"""

import json
import os
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

# Twilio
TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM = os.environ.get("TWILIO_FROM_NUMBER", "")

# Resend
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM_EMAIL", "alerts@emergencylicense.com")

BOOK_URL = "https://public.txdpsscheduler.com/"


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


def format_sms(slot: dict) -> str:
    """Format an SMS message for an available appointment."""
    date = slot.get("date", "")
    if date and "T" in date:
        try:
            dt = datetime.fromisoformat(date.replace("Z", "+00:00"))
            date = dt.strftime("%a %b %d")
        except (ValueError, TypeError):
            pass

    distance = slot.get("distance", "?")
    name = slot.get("location_name", "DPS Office")

    msg = (
        f"DPS APPOINTMENT FOUND!\n\n"
        f"{name}\n"
        f"{slot.get('address', '')}\n"
        f"{distance} mi away | {date}\n\n"
        f"Book NOW before it's taken:\n"
        f"{BOOK_URL}\n\n"
        f"- EmergencyLicense.com"
    )
    return msg


def format_email_html(slot: dict) -> tuple[str, str]:
    """Format email subject and HTML body."""
    name = slot.get("location_name", "DPS Office")
    date = slot.get("date", "Soon")
    distance = slot.get("distance", "?")

    subject = f"DPS Appointment Available - {name} ({date})"

    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0284C7; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
                Appointment Found!
            </h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #E0F0F8;">
            <div style="background: #D1FAE5; color: #059669; padding: 8px 16px;
                        border-radius: 8px; display: inline-block; font-weight: bold;
                        font-size: 14px; margin-bottom: 16px;">
                Available Now
            </div>
            <h2 style="color: #0F172A; margin: 8px 0 4px;">{name}</h2>
            <p style="color: #64748B; margin: 0 0 16px;">
                {slot.get('address', '')}
            </p>
            <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div>
                    <div style="color: #64748B; font-size: 13px;">Distance</div>
                    <div style="color: #0F172A; font-weight: 600; font-size: 18px;">
                        {distance} miles
                    </div>
                </div>
                <div>
                    <div style="color: #64748B; font-size: 13px;">Next Available</div>
                    <div style="color: #0284C7; font-weight: 600; font-size: 18px;">
                        {date}
                    </div>
                </div>
            </div>
            <a href="{BOOK_URL}" style="display: inline-block; background: #EA580C;
               color: white; padding: 14px 32px; border-radius: 10px;
               text-decoration: none; font-weight: 700; font-size: 16px;">
                Book This Appointment Now
            </a>
            <p style="color: #94A3B8; font-size: 13px; margin-top: 24px;">
                Act fast — DPS appointments get taken within minutes of opening.
                This link goes directly to the official Texas DPS scheduler.
            </p>
        </div>
        <div style="padding: 16px 24px; color: #94A3B8; font-size: 12px;
                    text-align: center; border-top: 1px solid #E0F0F8;">
            EmergencyLicense.com | Not affiliated with Texas DPS
            <br>
            <a href="#" style="color: #94A3B8;">Unsubscribe</a>
        </div>
    </div>
    """
    return subject, html


def send_sms(phone: str, message: str) -> bool:
    """Send SMS via Twilio."""
    if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM]):
        log("Twilio not configured. SMS skipped.", "WARN")
        log(f"  Would send to {phone}: {message[:80]}...")
        return True  # Pretend success in dev

    try:
        import requests
        resp = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
            auth=(TWILIO_SID, TWILIO_TOKEN),
            data={
                "From": TWILIO_FROM,
                "To": phone if phone.startswith("+") else f"+1{phone}",
                "Body": message,
            },
            timeout=15,
        )
        if resp.status_code in (200, 201):
            sid = resp.json().get("sid", "unknown")
            log(f"SMS sent to {phone} (SID: {sid})")
            return True
        else:
            log(f"Twilio error {resp.status_code}: {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"SMS send failed: {e}", "ERROR")
        return False


def send_email(email: str, subject: str, html: str) -> bool:
    """Send email via Resend."""
    if not RESEND_KEY:
        log("Resend not configured. Email skipped.", "WARN")
        log(f"  Would send to {email}: {subject}")
        return True  # Pretend success in dev

    try:
        import requests
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": RESEND_FROM,
                "to": [email],
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code in (200, 201):
            log(f"Email sent to {email}: {subject}")
            return True
        else:
            log(f"Resend error {resp.status_code}: {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"Email send failed: {e}", "ERROR")
        return False


class AlertHandler(BaseHTTPRequestHandler):
    """HTTP API for receiving alert requests from the poll worker."""

    def do_POST(self):
        if self.path == "/send":
            content_len = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_len))

            subscriber = body.get("subscriber", {})
            slot = body.get("slot", {})
            phone = subscriber.get("phone")
            email = subscriber.get("email")

            results = {"sms": None, "email": None}

            if phone:
                message = format_sms(slot)
                results["sms"] = send_sms(phone, message)

            if email:
                subject, html = format_email_html(slot)
                results["email"] = send_email(email, subject, html)

            success = any(v for v in results.values() if v is not None)
            self._respond(200 if success else 500, {
                "success": success,
                "results": results,
            })

        elif self.path == "/health":
            self._respond(200, {
                "status": "ok",
                "twilio_configured": bool(TWILIO_SID),
                "resend_configured": bool(RESEND_KEY),
            })
        else:
            self._respond(404, {"error": "Not found"})

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {
                "status": "ok",
                "twilio_configured": bool(TWILIO_SID),
                "resend_configured": bool(RESEND_KEY),
            })
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
    import argparse
    parser = argparse.ArgumentParser(description="DPS Alert Service")
    parser.add_argument("--port", type=int, default=8200)
    args = parser.parse_args()

    log("Alert Service starting...")
    log(f"  Twilio: {'configured' if TWILIO_SID else 'NOT configured (SMS will be logged only)'}")
    log(f"  Resend: {'configured' if RESEND_KEY else 'NOT configured (emails will be logged only)'}")

    server = HTTPServer(("127.0.0.1", args.port), AlertHandler)
    log(f"Listening on http://127.0.0.1:{args.port}")
    log(f"  POST /send   — Send alert to subscriber")
    log(f"  GET  /health  — Health check")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down...")


if __name__ == "__main__":
    main()
