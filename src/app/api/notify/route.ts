import { NextRequest, NextResponse } from "next/server";
import { sendSlotSMS } from "@/lib/sms";
import { sendSlotEmail } from "@/lib/email";
import type { SlotInfo } from "@/lib/sms";

/**
 * POST /api/notify
 *
 * Send appointment alert notifications to a subscriber.
 * Called by the cron job when new slots are found.
 *
 * Body: {
 *   phone?: string,
 *   email?: string,
 *   slot: { locationName, address, date, distance, times? }
 * }
 *
 * Protected by CRON_SECRET to prevent unauthorized use.
 */
export async function POST(request: NextRequest) {
  // Verify the request is authorized
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phone, email, slot } = body as {
      phone?: string;
      email?: string;
      slot: SlotInfo;
    };

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Phone or email required" },
        { status: 400 }
      );
    }

    if (!slot?.locationName || !slot?.date) {
      return NextResponse.json(
        { error: "Slot info required (locationName, date)" },
        { status: 400 }
      );
    }

    const results: { sms?: { success: boolean }; email?: { success: boolean } } = {};

    if (phone) {
      results.sms = await sendSlotSMS(phone, slot);
    }

    if (email) {
      results.email = await sendSlotEmail(email, slot);
    }

    const anySuccess = Object.values(results).some((r) => r?.success);

    return NextResponse.json({
      success: anySuccess,
      results,
    });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
