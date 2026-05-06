import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const leafBuffer = await readFile(
    path.join(process.cwd(), "public/images/brand/maple-leaf.png"),
  );
  const leafDataUrl = `data:image/png;base64,${leafBuffer.toString("base64")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 -1 100 100"><path d="M 32 6 C 38 28, 56 56, 78 88 L 32 88 Z" fill="#0E1116"/><line x1="32" y1="34" x2="42" y2="34" stroke="#FFFFFF" stroke-width="1.6"/><line x1="32" y1="54" x2="54" y2="54" stroke="#FFFFFF" stroke-width="1.6"/><line x1="32" y1="74" x2="68" y2="74" stroke="#FFFFFF" stroke-width="1.6"/><rect x="29" y="6" width="3" height="86" fill="#0E1116"/><rect x="29" y="89" width="50" height="3" fill="#0E1116"/><image href="${leafDataUrl}" x="40" y="12" width="22" height="24" preserveAspectRatio="xMidYMid meet"/></svg>`;
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F1EA",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgDataUrl}
          width={size.width - 32}
          height={size.height - 32}
          alt=""
          style={{ display: "flex" }}
        />
      </div>
    ),
    { ...size },
  );
}
