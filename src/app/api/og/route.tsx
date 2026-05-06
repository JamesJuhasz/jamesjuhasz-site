/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { SITE } from "@/lib/site";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const variant = searchParams.get("variant") ?? "default";
  const title = searchParams.get("title") ?? SITE.name;
  const subtitle = searchParams.get("subtitle") ?? SITE.tagline;

  const eyebrow =
    variant === "post"
      ? "Journal · Newsletter"
      : variant === "event"
        ? "Race · Event"
        : "ILCA 7 · CAN 217718 · LA28";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
          color: "#0E1116",
          position: "relative",
        }}
      >
        {/* Top eyebrow — mono-style red */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            display: "flex",
            alignItems: "center",
            color: "#D52B1E",
            letterSpacing: 6,
            textTransform: "uppercase",
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </div>

        {/* Sail number watermark — top right */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              color: "#D52B1E",
              fontSize: 14,
              letterSpacing: 8,
              textTransform: "uppercase",
              fontWeight: 600,
              display: "flex",
            }}
          >
            CAN
          </div>
          <div
            style={{
              color: "#0E1116",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: 2,
              lineHeight: 1,
              display: "flex",
              marginTop: 4,
            }}
          >
            217718
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            color: "#0E1116",
            fontSize: 92,
            lineHeight: 0.95,
            maxWidth: 1000,
            display: "flex",
            fontWeight: 700,
            letterSpacing: -3,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 24,
            color: "#5A6068",
            fontSize: 24,
            display: "flex",
            maxWidth: 900,
          }}
        >
          {subtitle}
        </div>

        {/* Footer dot + url */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            color: "#0E1116",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            gap: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#D52B1E",
              display: "flex",
            }}
          />
          jamesjuhasz.com
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
