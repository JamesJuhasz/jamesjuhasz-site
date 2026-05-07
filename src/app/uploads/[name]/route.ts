import { NextResponse } from "next/server";
import { readUpload } from "@/lib/admin/uploads";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  const file = await readUpload(name);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    status: 200,
    headers: {
      "content-type": file.mime,
      "content-length": String(file.data.byteLength),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
