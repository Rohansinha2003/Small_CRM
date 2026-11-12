import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cheap gate: bounce cookie-less visitors away from app pages. Real authorization happens in the API routes.
export function proxy(req: NextRequest) {
  if (!req.cookies.has("chatdesk_session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/inbox/:path*", "/contacts/:path*", "/pipeline/:path*", "/tasks/:path*", "/broadcasts/:path*", "/templates/:path*", "/reports/:path*", "/settings/:path*", "/billing/:path*", "/team/:path*", "/admin/:path*"] };
