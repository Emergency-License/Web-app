import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { sendWelcomeSMS } from "@/lib/sms";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * POST /api/subscribe
 *
 * Registers a user for appointment alerts.
 * Stores subscriber info in a JSON file (will migrate to Vercel KV/Postgres later).
 * Sends a welcome SMS or email confirmation.
 *
 * Body: { email?, phone?, zipCode, maxDistance, service }
 */

const SUBSCRIBERS_FILE = path.join(process.cwd(), "data", "subscribers.json");

type Subscriber = {
  id: string;
  email?: string;
  phone?: string;
  zipCode: string;
  maxDistance: number;
  service: string;
  active: boolean;
  createdAt: string;
};

async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const data = await fs.readFile(SUBSCRIBERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeSubscribers(subs: Subscriber[]): Promise<void> {
  await fs.mkdir(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
  await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, zipCode, maxDistance, service } = body;

    // Validate
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

    const subscribers = await readSubscribers();

    // Check for duplicate
    const existing = subscribers.find(
      (s) =>
        s.active &&
        s.zipCode === zipCode &&
        ((email && s.email === email) || (phone && s.phone === phone))
    );
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already signed up for alerts at this zip code!",
        subscriber: { id: existing.id },
      });
    }

    const dist = Math.min(Number(maxDistance) || 50, 250);

    const subscriber: Subscriber = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: email || undefined,
      phone: phone || undefined,
      zipCode,
      maxDistance: dist,
      service: service || "renewal",
      active: true,
      createdAt: new Date().toISOString(),
    };

    subscribers.push(subscriber);
    await writeSubscribers(subscribers);

    // Send welcome notification (fire-and-forget, don't block the response)
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
