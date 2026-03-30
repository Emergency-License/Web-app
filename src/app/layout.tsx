import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emergency License | Find Fast Texas DPS Appointments",
  description:
    "Skip the weeks-long wait. We monitor Texas DPS appointment availability 24/7 and alert you the moment a slot opens near you.",
  keywords: [
    "Texas DPS appointment",
    "DMV appointment",
    "driver license renewal Texas",
    "emergency license appointment",
    "fast DPS appointment",
  ],
  openGraph: {
    title: "Emergency License | Fast Texas DPS Appointments",
    description:
      "Skip the weeks-long wait. Get alerted when DPS appointments open near you.",
    type: "website",
    url: "https://emergencylicense.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
