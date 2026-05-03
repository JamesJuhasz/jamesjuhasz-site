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
          background:
            "radial-gradient(120% 80% at 30% 30%, #1F365A 0%, #0E2240 50%, #061122 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            display: "flex",
            alignItems: "center",
            color: "#D8C4A6",
            letterSpacing: 3,
            textTransform: "uppercase",
            fontSize: 22,
            fontFamily: "system-ui",
          }}
        >
          {variant === "post"
            ? "Newsletter"
            : variant === "event"
              ? "Event"
              : "Olympic ILCA 7 — LA 2028"}
        </div>
        <div
          style={{
            color: "#F6F2EA",
            fontSize: 80,
            lineHeight: 1.1,
            maxWidth: 980,
            display: "flex",
            fontWeight: 500,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 24,
            color: "rgba(246, 242, 234, 0.8)",
            fontSize: 28,
            fontFamily: "system-ui",
            display: "flex",
            maxWidth: 900,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            color: "#F6F2EA",
            fontSize: 22,
            fontFamily: "system-ui",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#E04E2A",
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
