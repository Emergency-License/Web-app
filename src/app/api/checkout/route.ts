import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for a subscriber.
 * Body: { subscriberId, email? }
 *
 * Returns: { url } — redirect the client to this URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriberId, email } = body;

    if (!subscriberId) {
      return NextResponse.json(
        { error: "subscriberId required" },
        { status: 400 }
      );
    }

    const url = await createCheckoutSession(subscriberId, email);

    if (!url) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
