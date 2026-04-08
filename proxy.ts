import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PAGES = new Set(["/", "/login", "/signup", "/forgot-password"]);
const PROTECTED_PREFIXES = ["/dashboard", "/tasks", "/admin", "/groups", "/group"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const sessionToken = getSessionCookie(request);
  const redirectTo = request.nextUrl.searchParams.get("redirectTo");

  if (sessionToken && AUTH_PAGES.has(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(redirectTo || "/dashboard", request.url));
  }

  if (!sessionToken && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/dashboard/:path*",
    "/tasks/:path*",
    "/admin/:path*",
    "/groups/:path*",
    "/group/:path*",
  ],
};
