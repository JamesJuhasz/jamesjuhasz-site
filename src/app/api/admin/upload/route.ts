import { NextResponse, type NextRequest } from "next/server";
import { saveUpload, ACCEPTED_MIME } from "@/lib/admin/uploads";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "missing_file" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ACCEPTED_MIME.has(mime)) {
    return NextResponse.json(
      { ok: false, error: "unsupported_type", got: mime },
      { status: 415 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  try {
    const { url, filename, size } = await saveUpload(
      Buffer.from(arrayBuffer),
      mime,
    );
    return NextResponse.json({ ok: true, url, filename, size });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    );
  }
}
