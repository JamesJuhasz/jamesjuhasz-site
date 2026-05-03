import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingDonateCTA } from "@/components/cta/DonateCTA";
import { AnalyticsBridge } from "@/components/AnalyticsBridge";
import { JsonLd } from "@/components/JsonLd";
import { personJsonLd } from "@/lib/json-ld";
import { SITE } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
  themeColor: "#0E2240",
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
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-foam text-ink">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingDonateCTA />
        <AnalyticsBridge />
        <JsonLd data={personJsonLd} />
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
