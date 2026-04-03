import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "true") {
    const { pathname } = req.nextUrl;
    // Allow the maintenance page itself, static assets, and the health endpoint
    if (
      pathname === "/maintenance" ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/icons/") ||
      pathname === "/manifest.json" ||
      pathname === "/api/health"
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
