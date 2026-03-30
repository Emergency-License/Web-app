export default function Footer() {
  return (
    <footer className="bg-foreground text-white/60 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="font-heading font-bold text-white/90">
              Emergency<span className="text-accent">License</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <a href="#how-it-works" className="hover:text-white transition-colors cursor-pointer">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-white transition-colors cursor-pointer">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition-colors cursor-pointer">
              FAQ
            </a>
            <a href="/privacy" className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white transition-colors cursor-pointer">
              Terms
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Emergency License. Not affiliated
            with the Texas Department of Public Safety.
          </p>
          <p className="text-white/40">
            A Running Bull Technologies product.
          </p>
        </div>
      </div>
    </footer>
  );
}
