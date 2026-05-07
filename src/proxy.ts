import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin/session";

export const config = {
  matcher: [
    "/admin/:path*",
    "/studio/:path*",
    "/api/admin/:path*",
  ],
};

// Paths reachable without an admin session.
const PUBLIC_PATHS = new Set<string>([
  "/admin/sign-in",
  "/api/admin/sign-in",
  "/api/admin/sign-out",
]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const result = await verifySessionToken(token);
  if (result.ok) return NextResponse.next();

  // For API requests, return 401 so the client can handle it instead of
  // following an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: "unauthorized" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const signIn = req.nextUrl.clone();
  signIn.pathname = "/admin/sign-in";
  signIn.searchParams.set("next", pathname + (req.nextUrl.search ?? ""));
  return NextResponse.redirect(signIn);
}
