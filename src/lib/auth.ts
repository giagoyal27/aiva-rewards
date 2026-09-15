import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const CUSTOMER_COOKIE = "aiva_customer_session";
const ADMIN_COOKIE = "aiva_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random value in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

type CustomerSessionPayload = { customerId: string; role: "customer" };
type AdminSessionPayload = { adminId: string; role: "admin" };

async function signSession(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifySession<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as T;
  } catch {
    return null;
  }
}

// ---------------- Customer session ----------------

export async function createCustomerSession(customerId: string) {
  const token = await signSession({ customerId, role: "customer" } satisfies CustomerSessionPayload);
  cookies().set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const token = cookies().get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession<CustomerSessionPayload>(token);
  if (!payload || payload.role !== "customer") return null;
  return payload;
}

export function clearCustomerSession() {
  cookies().delete(CUSTOMER_COOKIE);
}

// ---------------- Admin session ----------------

export async function createAdminSession(adminId: string) {
  const token = await signSession({ adminId, role: "admin" } satisfies AdminSessionPayload);
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession<AdminSessionPayload>(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}

// ---------------- Passwords (admin only — customers authenticate via mobile + card number) ----------------

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
