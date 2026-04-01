import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Emergency License",
  description: "Terms and conditions for EmergencyLicense.com SMS appointment alert service.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark text-sm font-medium mb-8"
        >
          &larr; Back to Emergency License
        </a>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-muted-foreground mb-10">
          Last updated: April 1, 2026
        </p>

        <div className="space-y-8 text-card-foreground leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              1. Service Description
            </h2>
            <p>
              Emergency License, operated by Running Bull Technologies LLC
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;),
              monitors Texas Department of Public Safety (DPS) appointment
              availability and sends SMS and/or email alerts when slots open
              near your location. We are <strong>not</strong> affiliated with
              the Texas DPS.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years old (or have parental/guardian
              consent) to use this service. By subscribing, you confirm that
              the phone number and/or email address you provide belong to you
              or that you have authorization to use them.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              3. SMS Program Terms
            </h2>
            <p className="mb-3">
              <strong>Program name:</strong> Emergency License DPS Appointment Alerts<br />
              <strong>Program description:</strong> Automated SMS notifications sent when Texas DPS driver license appointment slots become available near your zip code.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                By entering your mobile phone number on emergencylicense.com and clicking &ldquo;Notify Me,&rdquo; you expressly consent to receive recurring automated SMS text messages from Emergency License at the number provided. Consent is not a condition of purchase.
              </li>
              <li>
                <strong>Message frequency:</strong> Varies. You may receive multiple messages per day when appointment slots open near you. Frequency depends on DPS cancellation activity in your area.
              </li>
              <li>
                <strong>Message &amp; data rates may apply.</strong> Check with your mobile carrier for details.
              </li>
              <li>
                <strong>To stop:</strong> Reply <strong>STOP</strong> or <strong>CANCEL</strong> to any message at any time. You will receive a confirmation and no further messages will be sent.
              </li>
              <li>
                <strong>For help:</strong> Reply <strong>HELP</strong> to any message or email{" "}
                <a href="mailto:support@emergencylicense.com" className="text-primary hover:text-primary-dark underline">
                  support@emergencylicense.com
                </a>.
              </li>
              <li>
                Supported carriers include AT&amp;T, Verizon, T-Mobile, Sprint, and most major US carriers. Carrier support is not guaranteed.
              </li>
              <li>
                We do not share your mobile number with third parties for marketing purposes. See our{" "}
                <a href="/privacy" className="text-primary hover:text-primary-dark underline">Privacy Policy</a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              4. No Guarantee of Appointments
            </h2>
            <p>
              We alert you when appointments become available, but we{" "}
              <strong>cannot guarantee</strong> that a slot will still be open
              by the time you attempt to book. Appointment availability is
              controlled entirely by the Texas DPS. We are a notification
              service only and do not book appointments on your behalf.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              5. Payments &amp; Refunds
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Subscription fees are charged at the time of sign-up as
                displayed on our pricing page.
              </li>
              <li>
                All sales are final. Because appointment availability is
                outside our control, refunds are not provided once monitoring
                has begun.
              </li>
              <li>
                We reserve the right to change pricing at any time. Price
                changes do not affect active subscriptions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              6. Account &amp; Cancellation
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You may cancel your alert subscription at any time by replying{" "}
                <strong>CANCEL</strong> to any SMS or visiting our cancellation
                page.
              </li>
              <li>
                Upon cancellation, alerts stop immediately. Your data is
                deleted within 30 days per our{" "}
                <a
                  href="/privacy"
                  className="text-primary hover:text-primary-dark underline"
                >
                  Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              7. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Use the service for any unlawful purpose.</li>
              <li>
                Resell, redistribute, or commercially exploit our alerts
                without written permission.
              </li>
              <li>
                Interfere with or disrupt our service infrastructure.
              </li>
              <li>
                Provide false information when subscribing.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              Emergency License is provided &ldquo;as is&rdquo; without
              warranties of any kind. To the maximum extent permitted by law,
              Running Bull Technologies LLC shall not be liable for any
              indirect, incidental, or consequential damages arising from your
              use of this service, including but not limited to missed
              appointments, delayed notifications, or carrier delivery
              failures.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              9. Service Availability
            </h2>
            <p>
              We strive for continuous monitoring but do not guarantee
              uninterrupted service. We may temporarily suspend service for
              maintenance, updates, or circumstances beyond our control
              without prior notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              10. Changes to Terms
            </h2>
            <p>
              We may update these terms at any time. Continued use of the
              service after changes are posted constitutes acceptance of the
              updated terms. Material changes will be communicated via SMS or
              email.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              11. Governing Law
            </h2>
            <p>
              These terms are governed by the laws of the State of Texas.
              Any disputes shall be resolved in the courts of Texas.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              12. Contact
            </h2>
            <p>
              Questions about these terms? Email us at{" "}
              <a
                href="mailto:support@emergencylicense.com"
                className="text-primary hover:text-primary-dark underline"
              >
                support@emergencylicense.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
