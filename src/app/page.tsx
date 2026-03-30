"use client";

import { useState, useRef } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import SearchForm from "@/components/SearchForm";
import Results from "@/components/Results";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export type AppointmentSlot = {
  id: string;
  locationName: string;
  address: string;
  distance: number;
  date: string;
  times: string[];
  serviceType: string;
};

export type SearchState = {
  loading: boolean;
  searched: boolean;
  results: AppointmentSlot[];
  zipCode: string;
  maxDistance: number;
};

export default function Home() {
  const [search, setSearch] = useState<SearchState>({
    loading: false,
    searched: false,
    results: [],
    zipCode: "",
    maxDistance: 50,
  });
  const [selectedService, setSelectedService] = useState("renewal");
  const searchRef = useRef<HTMLElement>(null);

  const handleServiceSelect = (value: string) => {
    setSelectedService(value);
    // Scroll to search form
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSearch = async (zipCode: string, maxDistance: number, service: string) => {
    setSearch((s) => ({ ...s, loading: true, searched: true, zipCode, maxDistance }));

    try {
      const res = await fetch("/api/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipCode, maxDistance, service }),
      });
      const data = await res.json();
      setSearch((s) => ({
        ...s,
        loading: false,
        results: data.slots || [],
      }));
    } catch {
      setSearch((s) => ({ ...s, loading: false, results: [] }));
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Services onSelect={handleServiceSelect} />
        <section id="search" ref={searchRef} className="py-16 md:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                Find Available Appointments
              </h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                Enter your zip code, set your max driving distance, and we&apos;ll
                scan every DPS office in range.
              </p>
            </div>
            <SearchForm
              onSearch={handleSearch}
              loading={search.loading}
              selectedService={selectedService}
              onServiceChange={setSelectedService}
            />
            {search.searched && (
              <Results
                loading={search.loading}
                results={search.results}
                zipCode={search.zipCode}
                maxDistance={search.maxDistance}
              />
            )}
          </div>
        </section>
        <HowItWorks />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
