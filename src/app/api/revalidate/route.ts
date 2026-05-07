import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/*
  Generic revalidate endpoint. Authenticated with REVALIDATE_SECRET.

  POST /api/revalidate
    header: authorization: Bearer ${REVALIDATE_SECRET}
    body:   { paths: string[] }
*/

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Revalidate secret not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const provided = auth.replace(/^Bearer\s+/i, "") || querySecret;
  if (!provided || provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { paths?: string[] };
  const paths = Array.isArray(body.paths) ? body.paths : [];
  for (const p of paths) {
    if (typeof p === "string" && p.startsWith("/")) revalidatePath(p);
  }
  return NextResponse.json({ ok: true, revalidated: paths });
}
