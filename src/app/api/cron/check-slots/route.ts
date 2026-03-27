import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { sendSlotSMS } from "@/lib/sms";
import { sendSlotEmail } from "@/lib/email";
import type { SlotInfo } from "@/lib/sms";

/**
 * GET /api/cron/check-slots
 *
 * Vercel Cron Job — runs on a schedule to check DPS availability
 * for all active subscribers and send notifications for new slots.
 *
 * Protected by CRON_SECRET header.
 *
 * Flow:
 *  1. Load all active subscribers
 *  2. Group by zip+service to minimize API calls
 *  3. Call Session Manager for each group
 *  4. Compare results against known slots
 *  5. Notify subscribers about new slots
 *  6. Record sent notifications to prevent duplicates
 */

const SESSION_API = process.env.SESSION_MANAGER_URL || "http://127.0.0.1:8100";
const SUBSCRIBERS_FILE = path.join(process.cwd(), "data", "subscribers.json");
const SENT_ALERTS_FILE = path.join(process.cwd(), "data", "sent-alerts.json");

const SERVICE_TYPE_IDS: Record<string, number> = {
  renewal: 71, new: 81, id: 15, cdl: 170, permit: 78, change: 72,
};

type Subscriber = {
  id: string;
  email?: string;
  phone?: string;
  zipCode: string;
  maxDistance: number;
  service: string;
  active: boolean;
};

type SentAlert = {
  subscriberId: string;
  slotKey: string; // "locationId:date"
  sentAt: string;
};

type DPSLocation = {
  Id: number;
  Name: string;
  Address: string;
  City: string;
  Zip: string;
  Distance: number;
  NextAvailableDate: string;
  FirstAvailableDate?: string;
};

// ── Data helpers ──

async function readJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ── Session Manager call ──

async function callDPS(endpoint: string, payload: object): Promise<unknown | null> {
  try {
    const resp = await fetch(`${SESSION_API}/api-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, payload }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    if (result.error) return null;
    return result.data ?? result;
  } catch {
    return null;
  }
}

async function isSessionHealthy(): Promise<boolean> {
  try {
    const resp = await fetch(`${SESSION_API}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

// ── Main cron handler ──

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const healthy = await isSessionHealthy();
  if (!healthy) {
    return NextResponse.json({
      status: "skipped",
      reason: "Session Manager not available",
    });
  }

  const subscribers: Subscriber[] = await readJSON(SUBSCRIBERS_FILE, []);
  const active = subscribers.filter((s) => s.active);

  if (active.length === 0) {
    return NextResponse.json({ status: "ok", message: "No active subscribers" });
  }

  const sentAlerts: SentAlert[] = await readJSON(SENT_ALERTS_FILE, []);
  const sentKeys = new Set(sentAlerts.map((a) => `${a.subscriberId}:${a.slotKey}`));
  const newAlerts: SentAlert[] = [];
  let totalNotified = 0;
  let totalNewSlots = 0;

  // Group subscribers by zip+service
  const groups = new Map<string, { typeId: number; maxDist: number; subs: Subscriber[] }>();
  for (const sub of active) {
    const key = `${sub.zipCode}:${sub.service}`;
    const existing = groups.get(key);
    if (existing) {
      existing.maxDist = Math.max(existing.maxDist, sub.maxDistance);
      existing.subs.push(sub);
    } else {
      groups.set(key, {
        typeId: SERVICE_TYPE_IDS[sub.service] || 71,
        maxDist: sub.maxDistance,
        subs: [sub],
      });
    }
  }

  for (const [groupKey, group] of groups) {
    const [zipCode] = groupKey.split(":");

    // Call DPS for available locations
    const locData = await callDPS("AvailableLocation", {
      TypeId: group.typeId,
      ZipCode: zipCode,
      CityName: "",
      PreferredDay: 0,
    });

    if (!locData) continue;

    let locations: DPSLocation[] = [];
    if (Array.isArray(locData)) {
      locations = locData;
    } else if (typeof locData === "object" && locData !== null) {
      const obj = locData as Record<string, unknown>;
      locations = (obj.Locations ?? obj.locations ?? []) as DPSLocation[];
    }

    // Filter to max distance for this group
    const nearby = locations.filter((loc) => loc.Distance <= group.maxDist);

    for (const loc of nearby) {
      const nextDate = loc.NextAvailableDate || loc.FirstAvailableDate;
      if (!nextDate) continue;

      const slotKey = `${loc.Id}:${nextDate}`;

      // Get time slots
      let times: string[] = [];
      const dateData = await callDPS("AvailableLocationDates", {
        LocationId: loc.Id,
        TypeId: group.typeId,
        SameDay: false,
        StartDate: null,
        PreferredDay: 0,
      });
      if (dateData && typeof dateData === "object") {
        const obj = dateData as Record<string, unknown>;
        const dateSlots = (obj.LocationAvailabilityDates ?? obj.AvailableDates ?? []) as Array<{
          AvailableTimeSlots?: Array<{ StartDateTime: string }>;
        }>;
        if (dateSlots.length > 0 && dateSlots[0].AvailableTimeSlots) {
          times = dateSlots[0].AvailableTimeSlots.map((s) => {
            const d = new Date(s.StartDateTime);
            return d.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
          });
        }
      }

      const formattedDate = new Date(nextDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const slot: SlotInfo = {
        locationName: loc.Name,
        address: `${loc.Address}, ${loc.City}, TX ${loc.Zip}`,
        date: formattedDate,
        distance: Math.round(loc.Distance * 10) / 10,
        times,
      };

      totalNewSlots++;

      // Notify each matching subscriber
      for (const sub of group.subs) {
        if (loc.Distance > sub.maxDistance) continue;

        const dedupeKey = `${sub.id}:${slotKey}`;
        if (sentKeys.has(dedupeKey)) continue;

        // Send notifications
        if (sub.phone) {
          await sendSlotSMS(sub.phone, slot);
        }
        if (sub.email) {
          await sendSlotEmail(sub.email, slot);
        }

        totalNotified++;
        sentKeys.add(dedupeKey);
        newAlerts.push({
          subscriberId: sub.id,
          slotKey,
          sentAt: new Date().toISOString(),
        });
      }
    }

    // Rate limit between groups
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Persist sent alerts (keep last 7 days to prevent unbounded growth)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentAlerts = [...sentAlerts, ...newAlerts].filter(
    (a) => a.sentAt > sevenDaysAgo
  );
  await writeJSON(SENT_ALERTS_FILE, recentAlerts);

  return NextResponse.json({
    status: "ok",
    subscribers: active.length,
    groups: groups.size,
    newSlots: totalNewSlots,
    notificationsSent: totalNotified,
  });
}
