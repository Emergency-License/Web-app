"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { analytics } from "@/lib/analytics";

function CancelContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) {
      setStatus("error");
      setMessage("Invalid cancel link. Please use the link from your alert email or text.");
    }
  }, [id]);

  async function handleCancel() {
    if (!id) return;
    setStatus("loading");
    try {
      const resp = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await resp.json();
      if (data.success) {
        setStatus("done");
        setMessage(data.message);
        analytics.emergencyCancelled();
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-sky-100 p-8 text-center">
          {status === "done" ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Emergency Cancelled</h1>
              <p className="text-slate-600 mb-6">{message}</p>
              <a
                href="/"
                className="inline-block text-sky-600 hover:text-sky-700 font-medium"
              >
                Back to EmergencyLicense.com
              </a>
            </>
          ) : status === "error" ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops</h1>
              <p className="text-slate-600 mb-6">{message}</p>
              <a
                href="/"
                className="inline-block text-sky-600 hover:text-sky-700 font-medium"
              >
                Back to EmergencyLicense.com
              </a>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Cancel Emergency</h1>
              <p className="text-slate-600 mb-6">
                Got your appointment? Click below to stop all alerts.
                You can always sign up again if you need us.
              </p>
              <button
                onClick={handleCancel}
                disabled={status === "loading"}
                className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl transition-colors text-lg"
              >
                {status === "loading" ? "Cancelling..." : "Cancel My Emergency"}
              </button>
              <p className="text-xs text-slate-400 mt-4">
                This will stop all SMS and email alerts for this subscription.
              </p>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-sm text-slate-400">
          EmergencyLicense.com &mdash; Not affiliated with Texas DPS
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
