const steps = [
  {
    number: "1",
    color: "bg-accent",
    title: "Enter Your Location",
    description:
      "Tell us your zip code and how far you're willing to drive. We'll search every DPS office within your range.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    number: "2",
    color: "bg-primary",
    title: "We Scan 24/7",
    description:
      "Our system checks every DPS office continuously. The moment a cancellation or new slot opens, we catch it.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: "3",
    color: "bg-success",
    title: "Book Instantly",
    description:
      "Get an instant alert with a direct link to claim the open slot on the official DPS scheduler before anyone else.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Three simple steps to skip the weeks-long wait
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Step number badge */}
              <div
                className={`${step.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6`}
              >
                {step.icon}
              </div>

              <h3 className="font-heading text-xl font-semibold text-card-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Connector arrow (desktop) */}
              {step.number !== "3" && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <svg className="w-6 h-6 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
