import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

const publicPaths = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Add user info to headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);

  // Technicians can only access their own area + settings + maintenance logs
  if (payload.role === "TECHNICIAN") {
    const allowed = [
      "/technician",
      "/dashboard",
      "/interventions",
      "/settings",
      "/api/technician",
      "/api/interventions",
      "/api/service-requests",
      "/api/auth",
      "/api/lookups",
      "/api/refrigerators",
    ];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/technician/jobs", request.url));
    }
  }

  // BRARUDI delegates can only send alerts + view history + settings
  if (payload.role === "BRARUDI") {
    const allowed = [
      "/brarudi",
      "/dashboard",
      "/settings",
      "/api/brarudi",
      "/api/service-requests",
      "/api/cities",
      "/api/pos",
      "/api/refrigerators",
      "/api/auth",
    ];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/brarudi/alerts", request.url));
    }
  }

  // BRARUDI Management can only view city distribution + reports
  if (payload.role === "BRARUDI_MGMT") {
    const allowed = [
      "/brarudi-mgmt",
      "/dashboard",
      "/settings",
      "/api/cities",
      "/api/reports",
      "/api/lookups",
      "/api/auth",
    ];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/brarudi-mgmt/cities", request.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
