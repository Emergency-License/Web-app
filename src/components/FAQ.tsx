"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Is this an official Texas DPS service?",
    a: "No. Emergency License is an independent service that monitors the official Texas DPS appointment scheduler (public.txdpsscheduler.com) for available slots. We do not book appointments on your behalf — we find openings and give you a direct link to the official DPS site to book.",
  },
  {
    q: "How does it work?",
    a: "We continuously check the Texas DPS scheduling system for cancellations and newly opened appointment slots across all 230+ DPS offices. When we find an opening within your specified distance, we alert you immediately so you can claim it.",
  },
  {
    q: "Is this legal?",
    a: "Yes. We access the same publicly available scheduling information that any person can see on the DPS website. We don't bypass any security, create fake accounts, or interfere with the scheduling system in any way.",
  },
  {
    q: "Why are DPS appointments so hard to get?",
    a: "Texas DPS offices serve millions of residents with limited appointment capacity. High demand means the earliest available slot is often weeks or months away. However, cancellations happen daily — you just have to catch them fast.",
  },
  {
    q: "How fast will I get an appointment?",
    a: "Most users who set a reasonable driving distance (50+ miles) find an appointment within 24-48 hours. Users willing to drive further see results even faster. The wider your search radius, the more offices we monitor.",
  },
  {
    q: "What services can I book?",
    a: "We support all DPS appointment types: driver's license renewals, new licenses, state ID cards, commercial driver's licenses (CDL), learner's permits, name/address changes, and election ID certificates.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account needed for free searches. Just enter your zip code and distance, and we'll show you what's available right now. For the upcoming Priority Alerts feature, you'll provide your email or phone number so we can notify you.",
  },
  {
    q: "Will this cost me anything?",
    a: "During our early access period, the search tool is completely free. Our upcoming Priority Alerts service will cost $25 per appointment found — you only pay if we successfully find you a slot.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-muted/50 transition-colors"
                aria-expanded={openIndex === i}
              >
                <span className="font-heading font-semibold text-card-foreground pr-4">
                  {faq.q}
                </span>
                <svg
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4 text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
