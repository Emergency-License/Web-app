import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Emergency License",
  description: "Privacy policy for EmergencyLicense.com SMS appointment alerts.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mb-10">
          Last updated: April 1, 2026
        </p>

        <div className="space-y-8 text-card-foreground leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Who We Are
            </h2>
            <p>
              Emergency License (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
              &ldquo;our&rdquo;) is a service operated by Running Bull
              Technologies LLC. We monitor Texas DPS appointment availability
              and send alerts when slots open near you.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Information We Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Phone number</strong> &mdash; to send SMS appointment
                alerts.
              </li>
              <li>
                <strong>Email address</strong> &mdash; to send email appointment
                alerts (if provided).
              </li>
              <li>
                <strong>ZIP code and search radius</strong> &mdash; to find DPS
                offices near you.
              </li>
              <li>
                <strong>Service type preference</strong> &mdash; to match you
                with the right appointment slots.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send SMS and/or email alerts when DPS appointments open near you.</li>
              <li>Process your subscription and manage your alert preferences.</li>
              <li>Respond to your cancellation or support requests.</li>
            </ul>
            <p className="mt-3 font-semibold text-foreground">
              We do <strong>not</strong> sell, rent, or share your phone number
              or personal information with third parties for marketing purposes.
              Your data is used solely to deliver DPS appointment alerts to you.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              SMS/Text Messaging
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                By providing your phone number, you consent to receive automated
                SMS appointment alerts from Emergency License.
              </li>
              <li>
                Message frequency varies based on appointment availability.
              </li>
              <li>
                Message and data rates may apply depending on your mobile carrier
                plan.
              </li>
              <li>
                To stop receiving messages, reply <strong>STOP</strong> or{" "}
                <strong>CANCEL</strong> to any message. You will receive a
                one-time confirmation and no further messages will be sent.
              </li>
              <li>
                For help, reply <strong>HELP</strong> to any message or email{" "}
                <a
                  href="mailto:support@emergencylicense.com"
                  className="text-primary hover:text-primary-dark underline"
                >
                  support@emergencylicense.com
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Third-Party Services
            </h2>
            <p>We use the following services to operate:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Twilio</strong> &mdash; to deliver SMS messages. Subject
                to{" "}
                <a
                  href="https://www.twilio.com/legal/privacy"
                  className="text-primary hover:text-primary-dark underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twilio&apos;s Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Vercel</strong> &mdash; to host our website and process
                requests.
              </li>
              <li>
                <strong>Upstash (Redis)</strong> &mdash; to store subscription
                data securely.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Data Retention
            </h2>
            <p>
              We retain your information only as long as your alert subscription
              is active. When you cancel, your phone number, email, and
              preferences are deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Your Rights
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Opt out of SMS alerts at any time by replying CANCEL.</li>
              <li>Request deletion of your data by emailing us.</li>
              <li>Access the information we have about you upon request.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Security
            </h2>
            <p>
              We use industry-standard encryption (TLS) and secure
              infrastructure to protect your data. Payment information is
              processed by our payment provider and never stored on our servers.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Contact Us
            </h2>
            <p>
              Questions about this policy? Email us at{" "}
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
