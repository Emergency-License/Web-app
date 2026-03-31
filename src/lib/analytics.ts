/**
 * GA4 event helpers for EmergencyLicense.com
 *
 * Funnel:
 *   search_triggered → results_found / no_results → book_clicked
 *   alert_subscribed → emergency_cancelled (proxy for booked)
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }
}

export const analytics = {
  searchTriggered: (zipCode: string, maxDistance: number, service: string) =>
    track("search_triggered", { zip_code: zipCode, max_distance: maxDistance, service }),

  resultsFound: (count: number, zipCode: string, service: string) =>
    track("results_found", { result_count: count, zip_code: zipCode, service }),

  noResults: (zipCode: string, maxDistance: number, service: string) =>
    track("no_results", { zip_code: zipCode, max_distance: maxDistance, service }),

  bookClicked: (locationName: string, distance: number, date: string) =>
    track("book_clicked", { location: locationName, distance_miles: distance, date }),

  alertSubscribed: (method: "email" | "phone", zipCode: string, maxDistance: number) =>
    track("alert_subscribed", { method, zip_code: zipCode, max_distance: maxDistance }),

  emergencyCancelled: () =>
    track("emergency_cancelled"),
};
