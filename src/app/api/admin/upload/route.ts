import { NextResponse, type NextRequest } from "next/server";
import { saveUpload, ACCEPTED_MIME } from "@/lib/admin/uploads";

export const runtime = "nodejs";

// Clients send the raw file bytes with the file's MIME as Content-Type.
// We avoid req.formData() because undici's multipart parser intermittently
// fails on Safari/iPhone HEIC payloads with "Failed to parse body as FormData".
export async function POST(req: NextRequest) {
  const rawType = req.headers.get("content-type") ?? "";
  // Strip any "; charset=..." or boundary parameters.
  const mime = rawType.split(";")[0].trim() || "application/octet-stream";

  if (!ACCEPTED_MIME.has(mime)) {
    return NextResponse.json(
      { ok: false, error: "unsupported_type", got: mime },
      { status: 415 },
    );
  }

  let buf: Buffer;
  try {
    const ab = await req.arrayBuffer();
    buf = Buffer.from(ab);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[upload] read body failed:", { message, mime });
    return NextResponse.json(
      { ok: false, error: "invalid_body", detail: message },
      { status: 400 },
    );
  }

  if (buf.length === 0) {
    return NextResponse.json(
      { ok: false, error: "missing_file" },
      { status: 400 },
    );
  }

  try {
    const { url, filename, size } = await saveUpload(buf, mime);
    return NextResponse.json({ ok: true, url, filename, size });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    );
  }
}
