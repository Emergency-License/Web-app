export default function Pricing() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Simple Pricing
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            No subscriptions. No hidden fees. Pay only when we find you an appointment.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free tier */}
          <div className="relative bg-card rounded-2xl border-2 border-accent shadow-lg p-8">
            <div className="absolute -top-3 left-6">
              <span className="inline-flex items-center px-3 py-1 bg-accent text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Early Access
              </span>
            </div>
            <div className="mt-2">
              <h3 className="font-heading text-2xl font-bold text-card-foreground">
                Free
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-5xl font-extrabold text-foreground">$0</span>
                <span className="text-muted-foreground">/ search</span>
              </div>
              <p className="mt-3 text-muted-foreground">
                We&apos;re proving the system works. Search for free during our early access period.
              </p>
            </div>
            <ul className="mt-6 space-y-3">
              {[
                "Unlimited appointment searches",
                "All DPS offices statewide",
                "Real-time availability data",
                "Direct link to book on DPS site",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-card-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <a
              href="#search"
              className="mt-8 block text-center px-6 py-3 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Search Now — It&apos;s Free
            </a>
          </div>

          {/* Paid tier (coming soon) */}
          <div className="bg-card rounded-2xl border border-border p-8 opacity-80">
            <h3 className="font-heading text-2xl font-bold text-card-foreground">
              Priority Alerts
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-extrabold text-foreground">$25</span>
              <span className="text-muted-foreground">/ appointment</span>
            </div>
            <p className="mt-3 text-muted-foreground">
              Get alerted by text or email the instant a slot opens — before it shows up for anyone else.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Everything in Free",
                "24/7 automatic monitoring",
                "Instant SMS + email alerts",
                "Priority: notified first",
                "Pay only if we find a slot",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-card-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-8 block w-full text-center px-6 py-3 bg-muted text-muted-foreground font-bold rounded-xl cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
