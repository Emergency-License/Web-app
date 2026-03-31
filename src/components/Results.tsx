"use client";

import { useState, useEffect } from "react";
import type { AppointmentSlot } from "@/app/page";
import { analytics } from "@/lib/analytics";

type Props = {
  loading: boolean;
  results: AppointmentSlot[];
  zipCode: string;
  maxDistance: number;
};

function AlertSignup({ zipCode, maxDistance }: { zipCode: string; maxDistance: number }) {
  const [contact, setContact] = useState("");
  const [contactType, setContactType] = useState<"email" | "phone">("email");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [contactType]: contact,
          zipCode,
          maxDistance,
          service: "renewal",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        analytics.alertSubscribed(contactType as "email" | "phone", zipCode, maxDistance);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto bg-success-light rounded-xl border border-success/20 p-6 text-center">
        <svg className="w-10 h-10 text-success mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="font-heading text-lg font-semibold text-card-foreground mb-1">
          You&apos;re on the list!
        </h4>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background rounded-xl border border-border p-5">
      <p className="text-sm font-semibold text-card-foreground mb-1">
        Get alerted instantly when a slot opens
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        We&apos;ll text or email you the moment an appointment becomes available within {maxDistance} miles of {zipCode}.
      </p>

      {/* Contact type toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
        <button
          type="button"
          onClick={() => setContactType("phone")}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            contactType === "phone"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Text Me
          <span className="block text-[10px] text-muted-foreground font-normal">Coming Soon</span>
        </button>
        <button
          type="button"
          onClick={() => setContactType("email")}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            contactType === "email"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Email Me
        </button>
      </div>

      {contactType === "phone" ? (
        <div className="text-center py-3 text-sm text-muted-foreground bg-muted rounded-lg">
          SMS alerts coming soon! Use email for now.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            inputMode="email"
            placeholder="your@email.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="flex-1 px-3 py-2.5 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-ring cursor-text"
            required
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {status === "submitting" ? "..." : "Notify Me"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">{message}</p>
      )}
    </div>
  );
}

export default function Results({ loading, results, zipCode, maxDistance }: Props) {
  useEffect(() => {
    if (loading) return;
    if (results.length > 0) {
      analytics.resultsFound(results.length, zipCode, results[0]?.serviceType || "renewal");
    } else {
      analytics.noResults(zipCode, maxDistance, "renewal");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, results.length]);

  if (loading) {
    return (
      <div className="mt-8 text-center py-16">
        <div className="inline-flex items-center gap-3 text-primary">
          <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-lg font-medium">
            Scanning DPS offices within {maxDistance} miles of {zipCode}...
          </span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mt-8 bg-card rounded-2xl border border-border p-8 md:p-12 text-center">
        <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="font-heading text-xl font-semibold text-card-foreground mb-2">
          No Appointments Available Right Now
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          All DPS offices within {maxDistance} miles of {zipCode} are fully booked.
          This is common — slots open up as people cancel.
        </p>
        <AlertSignup zipCode={zipCode} maxDistance={maxDistance} />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {results.length} Location{results.length !== 1 ? "s" : ""} with Availability
        </h3>
        <span className="text-sm text-muted-foreground">
          Within {maxDistance}mi of {zipCode}
        </span>
      </div>

      {/* Slot cards */}
      {results.map((slot) => (
        <div
          key={slot.id}
          className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 bg-success-light text-success text-xs font-bold rounded-full">
                    Available
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {slot.distance} miles away
                  </span>
                </div>
                <h4 className="font-heading text-lg font-semibold text-card-foreground">
                  {slot.locationName}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {slot.address}
                </p>
              </div>
              <div className="sm:text-right">
                <div className="text-sm text-muted-foreground">Next available</div>
                <div className="font-heading text-xl font-bold text-primary">
                  {slot.date}
                </div>
              </div>
            </div>

            {slot.times.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Available times:
                </div>
                <div className="flex flex-wrap gap-2">
                  {slot.times.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center px-3 py-1.5 bg-primary/5 text-primary text-sm font-medium rounded-lg border border-primary/10"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <a
                href="https://public.txdpsscheduler.com/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.bookClicked(slot.locationName, slot.distance, slot.date)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                Book This Slot
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Alert signup at bottom of results */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-center text-sm text-muted-foreground mb-4">
          Want us to keep watching for even better slots?
        </p>
        <AlertSignup zipCode={zipCode} maxDistance={maxDistance} />
      </div>
    </div>
  );
}
