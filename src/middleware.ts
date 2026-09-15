import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const CUSTOMER_COOKIE = "aiva_customer_session";
const ADMIN_COOKIE = "aiva_admin_session";

const CUSTOMER_PROTECTED = ["/dashboard", "/history", "/rewards", "/profile"];
const ADMIN_PROTECTED = ["/admin/dashboard", "/admin/customers", "/admin/purchases", "/admin/rewards", "/admin/cards", "/admin/settings", "/admin/audit-logs"];

async function isValidSession(token: string | undefined, expectedRole: "customer" | "admin") {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === expectedRole;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (CUSTOMER_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get(CUSTOMER_COOKIE)?.value;
    const valid = await isValidSession(token, "customer");
    if (!valid) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const valid = await isValidSession(token, "admin");
    if (!valid) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/history/:path*",
    "/rewards/:path*",
    "/profile/:path*",
    "/admin/dashboard/:path*",
    "/admin/customers/:path*",
    "/admin/purchases/:path*",
    "/admin/rewards/:path*",
    "/admin/cards/:path*",
    "/admin/settings/:path*",
    "/admin/audit-logs/:path*",
  ],
};
