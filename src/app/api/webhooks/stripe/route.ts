import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";
import type { Subscriber } from "@/lib/storage";
import { sendWelcomeSMS } from "@/lib/sms";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler.
 * On checkout.session.completed → activate the subscriber.
 *
 * Stripe sends raw body; we verify signature with STRIPE_WEBHOOK_SECRET.
 */

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret) {
    // Verify signature in production
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Stripe Webhook] Signature verification failed: ${msg}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // No webhook secret set yet — parse the event unverified (initial setup only)
    console.warn("[Stripe Webhook] No STRIPE_WEBHOOK_SECRET set — accepting unverified event");
    event = JSON.parse(body) as Stripe.Event;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriberId = session.metadata?.subscriberId;

    if (!subscriberId) {
      console.error("[Stripe Webhook] No subscriberId in session metadata");
      return NextResponse.json({ received: true });
    }

    const redis = getRedis();
    if (!redis) {
      console.error("[Stripe Webhook] Redis not configured");
      return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
    }

    // Activate the subscriber
    const sub = await redis.hget<Subscriber>("subscribers", subscriberId);
    if (sub) {
      await redis.hset("subscribers", {
        [subscriberId]: {
          ...sub,
          active: true,
          paymentStatus: "paid",
          stripeSessionId: session.id,
          paidAt: new Date().toISOString(),
        },
      });
      console.log(`[Stripe Webhook] Activated subscriber ${subscriberId}`);

      // Send welcome notifications (fire-and-forget)
      if (sub.phone) {
        sendWelcomeSMS(sub.phone, sub.zipCode, sub.maxDistance).catch((err) =>
          console.error("[Stripe Webhook] Welcome SMS error:", err)
        );
      }
      if (sub.email) {
        sendWelcomeEmail(sub.email, sub.zipCode, sub.maxDistance, subscriberId).catch((err) =>
          console.error("[Stripe Webhook] Welcome email error:", err)
        );
      }
    } else {
      console.warn(`[Stripe Webhook] Subscriber ${subscriberId} not found in Redis`);
    }
  }

  return NextResponse.json({ received: true });
}
