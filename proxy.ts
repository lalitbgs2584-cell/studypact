import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import auth from "@/lib/auth/auth";

const AUTH_PAGES = new Set(["/", "/login", "/signup", "/forgot-password"]);
const PROTECTED_PREFIXES = ["/dashboard", "/leaderboards", "/tasks", "/admin", "/groups", "/group"];
const MEMBER_HOME = "/dashboard";
const ADMIN_HOME = "/admin";

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAdminPath(pathname: string) {
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
}

function normalizeRole(role?: string | null) {
  return role === "admin" ? "admin" : "member";
}

function getHomePath(role: string) {
  return role === "admin" ? ADMIN_HOME : MEMBER_HOME;
}

function resolveAuthenticatedTarget(role: string, redirectTo?: string | null) {
  if (!redirectTo) {
    return getHomePath(role);
  }

  if (role !== "admin" && isAdminPath(redirectTo)) {
    return MEMBER_HOME;
  }

  if (role === "admin" && redirectTo === MEMBER_HOME) {
    return ADMIN_HOME;
  }

  return redirectTo;
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const sessionToken = getSessionCookie(request);

  if (!sessionToken) {
    if (!isProtectedPath(pathname)) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirectTo",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    if (isProtectedPath(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  const role = normalizeRole(session.user.role);
  const redirectTo = searchParams.get("redirectTo");

  if (AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(
      new URL(resolveAuthenticatedTarget(role, redirectTo), request.url),
    );
  }

  if (role !== "admin" && isAdminPath(pathname)) {
    return NextResponse.redirect(new URL(MEMBER_HOME, request.url));
  }

  if (role === "admin" && pathname === MEMBER_HOME) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
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
    "/leaderboards/:path*",
    "/tasks/:path*",
    "/admin/:path*",
    "/groups/:path*",
    "/group/:path*",
  ],
};
