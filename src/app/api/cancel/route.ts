import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/**
 * POST /api/cancel
 *
 * Deactivates a subscriber's alerts. Called when they click
 * "Cancel Emergency" — meaning they got their appointment
 * or no longer need alerts.
 *
 * Body: { id: string }
 */

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Subscriber ID required" }, { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
    }

    // Get the subscriber
    const sub = await redis.hget<Record<string, unknown>>("subscribers", id);
    if (!sub) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    // Mark inactive
    const updated = { ...sub, active: false, cancelledAt: new Date().toISOString() };
    await redis.hset("subscribers", { [id]: updated });

    return NextResponse.json({
      success: true,
      message: "Your emergency alerts have been cancelled. Glad you got your appointment!",
    });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
