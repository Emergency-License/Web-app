import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeSMS } from "@/lib/sms";
import { sendWelcomeEmail } from "@/lib/email";
import { addSubscriber, findDuplicateSubscriber } from "@/lib/storage";

/**
 * POST /api/subscribe
 *
 * Registers a user for appointment alerts.
 * Stores in Vercel Blob. Sends welcome SMS/email.
 *
 * Body: { email?, phone?, zipCode, maxDistance, service }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, zipCode, maxDistance, service } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone number required" },
        { status: 400 }
      );
    }
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json(
        { error: "Valid 5-digit zip code required" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await findDuplicateSubscriber(zipCode, email, phone);
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already signed up for alerts at this zip code!",
        subscriber: { id: existing.id },
      });
    }

    const dist = Math.min(Number(maxDistance) || 50, 250);

    const subscriber = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: email || undefined,
      phone: phone || undefined,
      zipCode,
      maxDistance: dist,
      service: service || "renewal",
      active: false,
      paymentStatus: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    await addSubscriber(subscriber);

    return NextResponse.json({
      success: true,
      message: `Complete payment to activate alerts within ${dist} miles of ${zipCode}.`,
      subscriber: { id: subscriber.id },
      requiresPayment: true,
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
