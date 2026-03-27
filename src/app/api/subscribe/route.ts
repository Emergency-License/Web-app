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
      active: true,
      createdAt: new Date().toISOString(),
    };

    await addSubscriber(subscriber);

    // Send welcome notification (fire-and-forget)
    if (phone) {
      sendWelcomeSMS(phone, zipCode, dist).catch((err) =>
        console.error("Welcome SMS error:", err)
      );
    }
    if (email) {
      sendWelcomeEmail(email, zipCode, dist).catch((err) =>
        console.error("Welcome email error:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: `We'll alert you when appointments open within ${dist} miles of ${zipCode}.`,
      subscriber: { id: subscriber.id },
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
