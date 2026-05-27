import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingDonateCTA } from "@/components/cta/DonateCTA";
import { DonatePopup } from "@/components/cta/DonatePopup";
import { AnalyticsBridge } from "@/components/AnalyticsBridge";
import { JsonLd } from "@/components/JsonLd";
import { personJsonLd } from "@/lib/json-ld";
import { SITE } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const defaultOg = `/api/og?title=${encodeURIComponent(SITE.name)}&subtitle=${encodeURIComponent(SITE.tagline)}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.shortDescription,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
    url: SITE.url,
    images: [{ url: defaultOg, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
    images: [defaultOg],
  },
};

export const viewport: Viewport = {
  themeColor: "#0E1116",
  // Site is a light-mode design (paper/ink). Declare it so Chrome Mobile's
  // "Auto Dark Theme for web contents" doesn't algorithmically re-tint pages
  // and so iOS Safari renders form controls/scrollbars in the matching scheme.
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        {/*
          overflow-x: clip lives on this wrapper, not on <body>, so that
          third-party popups appended directly to <body> (reCAPTCHA challenge,
          Stripe 3DS, etc.) can render past the viewport boundary without
          being clipped. Decorative absolute children of our in-flow content
          (hero parallax oversize, donate-button fireworks canvas) sit inside
          this wrapper and stay clipped — preserving the no-horizontal-scroll
          guarantee on narrow phones.
        */}
        <div className="relative min-h-full flex flex-col overflow-x-clip">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingDonateCTA />
        </div>
        <DonatePopup />
        <AnalyticsBridge />
        <JsonLd data={personJsonLd} />
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
