"use client";

import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
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
            <span className="font-heading font-bold text-lg text-foreground">
              Emergency<span className="text-accent">License</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              How It Works
            </a>
            <a
              href="#search"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Find Appointments
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              FAQ
            </a>
          </nav>

          {/* CTA */}
          <div className="hidden md:block">
            <a
              href="#search"
              className="inline-flex items-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Check Availability
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-3">
            <a
              href="#how-it-works"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#search"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              Find Appointments
            </a>
            <a
              href="#pricing"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              FAQ
            </a>
            <a
              href="#search"
              className="block mx-3 text-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              Check Availability
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
