import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { revalidateSecret } from "@/sanity/env";

/*
  Sanity webhook → POST /api/revalidate
  Header `authorization: Bearer ${SANITY_REVALIDATE_SECRET}` (or query ?secret=)
  Body (Sanity GROQ-projection webhook payload):
    { _type, slug }
  Refreshes the affected route + the global "sanity" tag.
*/

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const provided = auth.replace(/^Bearer\s+/i, "") || querySecret;

  if (!revalidateSecret) {
    return NextResponse.json(
      { ok: false, error: "Revalidate secret not configured" },
      { status: 503 },
    );
  }
  if (!provided || provided !== revalidateSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    _type?: string;
    slug?: string | { current?: string };
  };
  const type = body._type;
  const slug =
    typeof body.slug === "string"
      ? body.slug
      : (body.slug?.current as string | undefined);

  if (type === "post" && slug) revalidatePath(`/newsletters/${slug}`);
  if (type === "event" && slug) revalidatePath(`/events/${slug}`);
  if (type === "post") revalidatePath("/newsletters");
  if (type === "event") revalidatePath("/events");
  if (type === "pressMention") revalidatePath("/press");
  if (type === "supporter") {
    revalidatePath("/");
    revalidatePath("/about");
  }
  if (type === "givingLevel") revalidatePath("/donate");

  return NextResponse.json({ ok: true, revalidated: { type, slug } });
}
