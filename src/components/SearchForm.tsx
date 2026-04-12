"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics";

const DISTANCE_MARKS = [10, 25, 50, 100, 150, 200, 250];

const SERVICE_OPTIONS = [
  { value: "renewal", label: "Driver's License Renewal" },
  { value: "new", label: "New Driver's License" },
  { value: "id", label: "State ID Card" },
  { value: "cdl", label: "Commercial Driver's License" },
  { value: "permit", label: "Learner's Permit" },
  { value: "change", label: "Name / Address Change" },
];

type Props = {
  onSearch: (zipCode: string, maxDistance: number, service: string) => void;
  loading: boolean;
  selectedService?: string;
  onServiceChange?: (value: string) => void;
};

export default function SearchForm({ onSearch, loading, selectedService, onServiceChange }: Props) {
  const [zipCode, setZipCode] = useState("");
  const [maxDistance, setMaxDistance] = useState(50);
  const [service, setService] = useState(selectedService || "renewal");
  const [zipError, setZipError] = useState("");

  // Sync when parent changes selectedService (e.g. from Services tiles)
  if (selectedService && selectedService !== service) {
    setService(selectedService);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setZipError("");

    if (!/^\d{5}$/.test(zipCode)) {
      setZipError("Please enter a valid 5-digit Texas zip code");
      return;
    }

    analytics.searchTriggered(zipCode, maxDistance, service);
    onSearch(zipCode, maxDistance, service);
  };

  const nearestMark = DISTANCE_MARKS.reduce((prev, curr) =>
    Math.abs(curr - maxDistance) < Math.abs(prev - maxDistance) ? curr : prev
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl border-2 border-primary/20 shadow-xl p-6 md:p-8"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Zip Code */}
        <div>
          <label
            htmlFor="zipCode"
            className="block text-sm font-semibold text-card-foreground mb-2"
          >
            Your Zip Code
          </label>
          <input
            id="zipCode"
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 75001"
            value={zipCode}
            onChange={(e) => {
              setZipCode(e.target.value.replace(/\D/g, ""));
              setZipError("");
            }}
            className={`w-full px-4 py-3 text-lg bg-background border rounded-xl transition-colors focus:ring-2 focus:ring-ring focus:border-primary cursor-text ${
              zipError ? "border-destructive" : "border-border"
            }`}
            required
          />
          {zipError && (
            <p className="mt-1.5 text-sm text-destructive">{zipError}</p>
          )}
        </div>

        {/* Service Type */}
        <div>
          <label
            htmlFor="service"
            className="block text-sm font-semibold text-card-foreground mb-2"
          >
            Service Needed
          </label>
          <select
            id="service"
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              onServiceChange?.(e.target.value);
            }}
            className="w-full px-4 py-3 text-lg bg-background border border-border rounded-xl transition-colors focus:ring-2 focus:ring-ring focus:border-primary cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Distance Slider */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="distance"
            className="text-sm font-semibold text-card-foreground"
          >
            Max Driving Distance
          </label>
          <span className="text-sm font-bold text-primary">
            {maxDistance} miles
          </span>
        </div>

        <input
          id="distance"
          type="range"
          min={10}
          max={250}
          step={5}
          value={maxDistance}
          onChange={(e) => setMaxDistance(Number(e.target.value))}
          className="w-full h-2 bg-border rounded-lg cursor-pointer accent-primary"
        />

        {/* Distance labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {DISTANCE_MARKS.map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={() => setMaxDistance(mark)}
              className={`text-xs transition-colors cursor-pointer ${
                nearestMark === mark
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mark}mi
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-8 w-full flex items-center justify-center gap-3 px-8 py-4 bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl shadow-md shadow-accent/20 transition-all hover:shadow-lg cursor-pointer"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
            >
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
            Scanning DPS Offices...
          </>
        ) : (
          <>
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
            Search for Appointments
          </>
        )}
      </button>
    </form>
  );
}
