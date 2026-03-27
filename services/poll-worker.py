"""
DPS Appointment Poll Worker

Continuously checks DPS appointment availability for all active alert
subscribers. When a new slot appears matching a user's criteria, triggers
the alert service to send SMS/email notifications.

Depends on:
  - Session Manager running at http://localhost:8100
  - SQLite database for subscriber tracking
  - Alert service for sending notifications

Usage:
  python poll-worker.py [--interval 120] [--db alerts.db]
"""

import json
import os
import sqlite3
import sys
import time
import requests
from datetime import datetime, timedelta
from pathlib import Path

SESSION_API = os.environ.get("SESSION_API", "http://127.0.0.1:8100")
ALERT_API = os.environ.get("ALERT_API", "http://127.0.0.1:8200")
DB_PATH = Path(__file__).parent / "data" / "alerts.db"

# DPS service type IDs
SERVICE_TYPES = {
    "renewal": 71,
    "new": 81,
    "id": 15,
    "cdl": 170,
    "permit": 78,
    "change": 72,
}


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


def init_db(db_path: Path) -> sqlite3.Connection:
    """Initialize the SQLite database with schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            phone TEXT,
            zip_code TEXT NOT NULL,
            max_distance INTEGER NOT NULL DEFAULT 50,
            service_type TEXT NOT NULL DEFAULT 'renewal',
            preferred_day INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS found_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER NOT NULL,
            location_name TEXT NOT NULL,
            address TEXT,
            slot_date TEXT NOT NULL,
            slot_times TEXT,
            distance REAL,
            service_type TEXT,
            first_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS alerts_sent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id INTEGER NOT NULL,
            slot_id INTEGER NOT NULL,
            channel TEXT NOT NULL,
            sent_at TEXT NOT NULL DEFAULT (datetime('now')),
            status TEXT NOT NULL DEFAULT 'sent',
            FOREIGN KEY (subscriber_id) REFERENCES subscribers(id),
            FOREIGN KEY (slot_id) REFERENCES found_slots(id)
        );

        CREATE INDEX IF NOT EXISTS idx_subscribers_active
            ON subscribers(active, zip_code);
        CREATE INDEX IF NOT EXISTS idx_found_slots_location_date
            ON found_slots(location_id, slot_date);
        CREATE INDEX IF NOT EXISTS idx_alerts_sent_subscriber_slot
            ON alerts_sent(subscriber_id, slot_id);
    """)
    conn.commit()
    return conn


def get_active_subscribers(conn: sqlite3.Connection) -> list[dict]:
    """Get all active alert subscribers."""
    rows = conn.execute(
        "SELECT * FROM subscribers WHERE active = 1"
    ).fetchall()
    return [dict(r) for r in rows]


def group_by_zip_service(subscribers: list[dict]) -> dict:
    """Group subscribers by zip+service to minimize API calls."""
    groups = {}
    for sub in subscribers:
        key = (sub["zip_code"], sub["service_type"])
        if key not in groups:
            groups[key] = {
                "zip_code": sub["zip_code"],
                "service_type": sub["service_type"],
                "type_id": SERVICE_TYPES.get(sub["service_type"], 71),
                "max_distance": 0,
                "subscribers": [],
            }
        # Use the largest max_distance in the group so we cover everyone
        groups[key]["max_distance"] = max(
            groups[key]["max_distance"], sub["max_distance"]
        )
        groups[key]["subscribers"].append(sub)
    return groups


def check_availability(zip_code: str, type_id: int) -> list[dict]:
    """Call DPS API via the session manager to get available locations."""
    try:
        resp = requests.post(
            f"{SESSION_API}/api-call",
            json={
                "endpoint": "AvailableLocation",
                "payload": {
                    "TypeId": type_id,
                    "ZipCode": zip_code,
                    "CityName": "",
                    "PreferredDay": 0,
                },
            },
            timeout=30,
        )
        result = resp.json()

        if "error" in result:
            log(f"API error for ZIP {zip_code}: {result['error']}", "ERROR")
            return []

        data = result.get("data", result)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("Locations", data.get("locations", []))
        return []

    except requests.RequestException as e:
        log(f"Session API unreachable: {e}", "ERROR")
        return []


def get_location_dates(location_id: int, type_id: int) -> list[dict]:
    """Get available dates/times for a specific location."""
    try:
        resp = requests.post(
            f"{SESSION_API}/api-call",
            json={
                "endpoint": "AvailableLocationDates",
                "payload": {
                    "LocationId": location_id,
                    "TypeId": type_id,
                    "SameDay": False,
                    "StartDate": None,
                    "PreferredDay": 0,
                },
            },
            timeout=30,
        )
        result = resp.json()
        if "error" in result:
            return []
        data = result.get("data", result)
        if isinstance(data, dict):
            return data.get("LocationAvailabilityDates",
                          data.get("AvailableDates", []))
        if isinstance(data, list):
            return data
        return []
    except requests.RequestException:
        return []


def is_slot_already_seen(conn: sqlite3.Connection, location_id: int, slot_date: str) -> int | None:
    """Check if we've already recorded this slot. Returns slot ID if exists."""
    row = conn.execute(
        "SELECT id FROM found_slots WHERE location_id = ? AND slot_date = ?",
        (location_id, slot_date),
    ).fetchone()
    return row["id"] if row else None


def record_slot(conn: sqlite3.Connection, loc: dict, date_str: str,
                times: list[str], distance: float, service: str) -> int:
    """Record a newly found slot. Returns the slot ID."""
    cur = conn.execute(
        """INSERT INTO found_slots (location_id, location_name, address,
           slot_date, slot_times, distance, service_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            loc.get("Id", 0),
            loc.get("Name", "Unknown"),
            f"{loc.get('Address', '')}, {loc.get('City', '')}, TX {loc.get('Zip', '')}",
            date_str,
            json.dumps(times),
            distance,
            service,
        ),
    )
    conn.commit()
    return cur.lastrowid


def was_alert_sent(conn: sqlite3.Connection, subscriber_id: int, slot_id: int) -> bool:
    """Check if we already alerted this subscriber about this slot."""
    row = conn.execute(
        "SELECT id FROM alerts_sent WHERE subscriber_id = ? AND slot_id = ?",
        (subscriber_id, slot_id),
    ).fetchone()
    return row is not None


def send_alert(subscriber: dict, slot: dict, slot_id: int) -> bool:
    """Send SMS/email alert via the alert service."""
    try:
        resp = requests.post(
            f"{ALERT_API}/send",
            json={
                "subscriber": subscriber,
                "slot": slot,
                "slot_id": slot_id,
            },
            timeout=15,
        )
        return resp.status_code == 200
    except requests.RequestException as e:
        log(f"Alert service error: {e}", "ERROR")
        return False


def record_alert(conn: sqlite3.Connection, subscriber_id: int,
                 slot_id: int, channel: str, status: str = "sent"):
    """Record that we sent an alert."""
    conn.execute(
        """INSERT INTO alerts_sent (subscriber_id, slot_id, channel, status)
           VALUES (?, ?, ?, ?)""",
        (subscriber_id, slot_id, channel, status),
    )
    conn.commit()


def poll_cycle(conn: sqlite3.Connection):
    """Run one complete poll cycle for all active subscribers."""
    subscribers = get_active_subscribers(conn)
    if not subscribers:
        log("No active subscribers. Waiting...")
        return

    groups = group_by_zip_service(subscribers)
    log(f"Polling {len(groups)} zip/service groups for {len(subscribers)} subscribers...")

    total_new_slots = 0
    total_alerts = 0

    for (zip_code, service), group in groups.items():
        type_id = group["type_id"]
        locations = check_availability(zip_code, type_id)

        if not locations:
            continue

        for loc in locations:
            loc_id = loc.get("Id", loc.get("id", 0))
            loc_name = loc.get("Name", loc.get("name", "Unknown"))
            distance = loc.get("Distance", loc.get("distance", 999))
            next_date = loc.get("NextAvailableDate", loc.get("FirstAvailableDate", ""))

            if not next_date:
                continue

            # Check if this is a new slot
            existing_slot_id = is_slot_already_seen(conn, loc_id, next_date)

            if existing_slot_id is None:
                # New slot! Get detailed times
                dates = get_location_dates(loc_id, type_id)
                times = []
                if dates:
                    first_date = dates[0]
                    time_slots = first_date.get("AvailableTimeSlots",
                                               first_date.get("TimeSlots", []))
                    if isinstance(time_slots, list):
                        times = [
                            s.get("StartDateTime", s.get("Time", ""))
                            for s in time_slots[:10]
                        ]

                slot_id = record_slot(conn, loc, next_date, times, distance, service)
                total_new_slots += 1
                log(f"NEW SLOT: {loc_name} - {next_date} ({distance} mi from {zip_code})")
            else:
                slot_id = existing_slot_id

            # Alert matching subscribers
            for sub in group["subscribers"]:
                if distance > sub["max_distance"]:
                    continue  # Too far for this subscriber

                if was_alert_sent(conn, sub["id"], slot_id):
                    continue  # Already notified

                slot_info = {
                    "location_name": loc_name,
                    "address": f"{loc.get('Address', '')}, {loc.get('City', '')}, TX",
                    "date": next_date,
                    "distance": distance,
                    "service": service,
                    "book_url": "https://public.txdpsscheduler.com/",
                }

                channel = "sms" if sub.get("phone") else "email"
                success = send_alert(sub, slot_info, slot_id)
                status = "sent" if success else "failed"
                record_alert(conn, sub["id"], slot_id, channel, status)

                if success:
                    total_alerts += 1
                    log(f"ALERT SENT: {sub.get('phone') or sub.get('email')} "
                        f"-> {loc_name} {next_date}")

        # Rate limit between zip groups
        time.sleep(2)

    log(f"Cycle complete: {total_new_slots} new slots, {total_alerts} alerts sent.")


def check_session_health() -> bool:
    """Verify the session manager is running and healthy."""
    try:
        resp = requests.get(f"{SESSION_API}/health", timeout=5)
        data = resp.json()
        return data.get("status") == "ok"
    except requests.RequestException:
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description="DPS Appointment Poll Worker")
    parser.add_argument("--interval", type=int, default=120,
                        help="Seconds between poll cycles (default: 120)")
    parser.add_argument("--db", default=str(DB_PATH),
                        help="Path to SQLite database")
    args = parser.parse_args()

    db_path = Path(args.db)
    conn = init_db(db_path)
    log(f"Database: {db_path}")
    log(f"Poll interval: {args.interval}s")

    # Verify session manager is running
    if not check_session_health():
        log("Session manager not reachable at " + SESSION_API, "ERROR")
        log("Start it first: python session-manager.py --help")
        sys.exit(1)

    log("Session manager healthy. Starting poll loop...")

    while True:
        try:
            # Ensure session is fresh before polling
            requests.post(f"{SESSION_API}/refresh", timeout=10)
            poll_cycle(conn)
        except Exception as e:
            log(f"Poll cycle error: {e}", "ERROR")

        log(f"Next poll in {args.interval}s...")
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
