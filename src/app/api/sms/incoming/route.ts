import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendCancelConfirmSMS, sendCancelledSMS } from "@/lib/sms";
import type { Subscriber } from "@/lib/storage";

/**
 * POST /api/sms/incoming
 *
 * Twilio webhook for incoming SMS messages.
 *
 * Flow:
 *   User texts "CANCEL" → we reply "Reply YES to confirm"
 *   User texts "YES"    → deactivate all their subscriptions, send confirmation
 *
 * Twilio sends form-encoded POST with Body, From, To, etc.
 * We use Redis to track pending cancellations (phone → "pending_cancel").
 */

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Normalize phone to E.164
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = (formData.get("Body") as string || "").trim().toUpperCase();
    const from = formData.get("From") as string || "";

    const redis = getRedis();
    if (!redis) {
      return twimlResponse("System temporarily unavailable. Please try again later.");
    }

    const normalizedFrom = normalizePhone(from);
    const pendingKey = `cancel-pending:${normalizedFrom}`;

    if (body === "CANCEL") {
      // Check if they have active subscriptions
      const allSubs = await redis.hgetall<Record<string, Subscriber>>("subscribers");
      if (!allSubs) {
        return twimlResponse("No active alerts found for this number.");
      }

      const activeSubs = Object.values(allSubs).filter(
        (s) => s.active && s.phone && normalizePhone(s.phone) === normalizedFrom
      );

      if (activeSubs.length === 0) {
        return twimlResponse("No active alerts found for this number.");
      }

      // Mark pending cancel (expires in 10 min)
      await redis.set(pendingKey, "pending", { ex: 600 });

      // Send confirmation request
      await sendCancelConfirmSMS(from);

      // Return empty TwiML (we sent our own message via API)
      return twimlResponse("");

    } else if (body === "YES") {
      // Check if there's a pending cancel
      const pending = await redis.get(pendingKey);

      if (pending !== "pending") {
        return twimlResponse("No pending cancellation. Reply CANCEL first to stop alerts.");
      }

      // Deactivate all subscriptions for this phone
      const allSubs = await redis.hgetall<Record<string, Subscriber>>("subscribers");
      if (allSubs) {
        const updates: Record<string, Subscriber> = {};
        for (const [id, sub] of Object.entries(allSubs)) {
          if (sub.active && sub.phone && normalizePhone(sub.phone) === normalizedFrom) {
            updates[id] = { ...sub, active: false, cancelledAt: new Date().toISOString() } as Subscriber & { cancelledAt: string };
          }
        }
        if (Object.keys(updates).length > 0) {
          await redis.hset("subscribers", updates);
        }
      }

      // Clear pending flag
      await redis.del(pendingKey);

      // Send cancelled confirmation
      await sendCancelledSMS(from);

      return twimlResponse("");

    } else {
      // Any other message — ignore silently
      return twimlResponse("");
    }
  } catch (error) {
    console.error("Incoming SMS error:", error);
    return twimlResponse("");
  }
}

/**
 * Return a TwiML response. Empty string = no reply.
 */
function twimlResponse(message: string): NextResponse {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}
