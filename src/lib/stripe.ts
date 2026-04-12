import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!secretKey) return null;
  if (!_stripe) {
    _stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

/**
 * Create a Stripe Checkout session for a $25 one-time payment.
 * The subscriberId is passed as metadata so the webhook can activate the subscriber.
 */
export async function createCheckoutSession(
  subscriberId: string,
  customerEmail?: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 2500, // $25.00
          product_data: {
            name: "Priority DPS Appointment Alerts",
            description:
              "24/7 monitoring with instant SMS + email alerts when a DPS appointment opens near you.",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      subscriberId,
    },
    success_url: `${getBaseUrl()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/payment/cancelled`,
  });

  return session.url;
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://emergencylicense.com";
}
