import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emergency License | Get a Texas DMV / DPS Appointment Fast",
  description:
    "Can't get a Texas DMV or DPS appointment for weeks? We monitor all Texas DPS driver license offices 24/7 and alert you the moment a cancellation opens near you.",
  keywords: [
    "Texas DMV appointment",
    "Texas DMV appointment cancellation",
    "Texas DPS appointment",
    "Texas DPS appointment cancellation",
    "get Texas DMV appointment fast",
    "get DPS appointment fast",
    "Texas driver license appointment",
    "DMV appointment available today",
    "DPS appointment available today",
    "Texas DMV cancellation alert",
    "Texas DPS cancellation alert",
    "driver license renewal Texas",
    "emergency DMV appointment Texas",
    "emergency DPS appointment Texas",
  ],
  metadataBase: new URL("https://emergencylicense.com"),
  alternates: {
    canonical: "https://emergencylicense.com",
  },
  openGraph: {
    title: "Get a Texas DMV / DPS Appointment Fast | Emergency License",
    description:
      "Can't get a Texas DMV or DPS appointment for weeks? We monitor all Texas DPS driver license offices 24/7 and alert you the moment a cancellation opens near you.",
    type: "website",
    url: "https://emergencylicense.com",
    siteName: "Emergency License",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get a Texas DPS Appointment Fast",
    description:
      "We monitor Texas DPS cancellations 24/7 and alert you the moment a slot opens near you.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-6V361LLB8K" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-6V361LLB8K');`,
          }}
        />
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Emergency License",
              description:
                "Real-time Texas DPS appointment cancellation alerts. Get notified the moment a driver license appointment opens near you.",
              url: "https://emergencylicense.com",
              provider: {
                "@type": "Organization",
                name: "Running Bull Technologies LLC",
                url: "https://emergencylicense.com",
              },
              areaServed: {
                "@type": "State",
                name: "Texas",
              },
              serviceType: "Appointment Alert Notification",
            }),
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
