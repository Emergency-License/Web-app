export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-dark via-primary to-secondary py-20 md:py-32">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Urgency badge */}
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
          </span>
          <span className="text-sm font-medium text-white/90">
            Scanning DPS offices across Texas right now
          </span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight">
          Stop Waiting Weeks
          <br />
          <span className="text-primary-light">
            for a DPS Appointment
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
          We monitor every Texas DPS office 24/7 and alert you the instant an
          appointment opens near you. Most users book within 48 hours.
        </p>

        {/* Stats bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">230+</div>
            <div className="text-sm text-white/60 mt-1">DPS Offices Monitored</div>
          </div>
          <div className="hidden sm:block w-px h-12 bg-white/20" />
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">&lt;48hr</div>
            <div className="text-sm text-white/60 mt-1">Avg Time to Book</div>
          </div>
          <div className="hidden sm:block w-px h-12 bg-white/20" />
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">Free</div>
            <div className="text-sm text-white/60 mt-1">During Early Access</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#search"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white text-lg font-bold rounded-xl shadow-lg shadow-accent/30 transition-all hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5 cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            Find Appointments Now
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-4 text-white/90 hover:text-white text-lg font-medium transition-colors cursor-pointer"
          >
            How it works
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
