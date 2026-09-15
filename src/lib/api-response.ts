import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LoyaltyError } from "./loyalty-engine";

/** Friendly, AIVA-branded error messages — never leak raw technical errors. */
const FRIENDLY_MESSAGES: Record<string, string> = {
  CARD_NOT_FOUND: "We couldn't find that card number. Please double-check and try again ♡",
  CARD_ALREADY_LINKED: "This card is already linked to another AIVA account.",
  CARD_INACTIVE: "This card is no longer active. Please contact us for help.",
  CARD_EXISTS: "That card number already exists.",
  CARD_UNASSIGNED: "This card isn't linked to a customer yet.",
  MOBILE_ALREADY_REGISTERED: "This mobile number is already registered. Please log in instead.",
  ACCOUNT_NOT_FOUND: "We couldn't find an AIVA account for that number.",
  LOGIN_MISMATCH: "We couldn't verify those details. Please check your mobile number and card number ♡",
  REQUEST_ALREADY_PENDING: "Your purchase is already being verified ♡",
  CYCLE_FULL: "This loyalty journey is already complete!",
  PURCHASE_ALREADY_RECORDED: "This purchase has already been recorded.",
  ALREADY_DECIDED: "This request has already been reviewed.",
  ALREADY_REDEEMED: "This reward has already been redeemed.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  UNAUTHORIZED: "Please log in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
};

export function ok(data: unknown, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(code: string, status = 400, message?: string) {
  return NextResponse.json(
    { ok: false, error: { code, message: message ?? FRIENDLY_MESSAGES[code] ?? "Something went wrong. Please try again ♡" } },
    { status }
  );
}

/** Wraps a route handler with consistent error translation. */
export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return fail("VALIDATION_ERROR", 400, err.issues[0]?.message ?? "Invalid input.");
  }
  if (err instanceof LoyaltyError) {
    const status =
      err.code === "NOT_FOUND" || err.code === "CARD_NOT_FOUND" || err.code === "ACCOUNT_NOT_FOUND"
        ? 404
        : err.code === "UNAUTHORIZED"
        ? 401
        : err.code === "FORBIDDEN"
        ? 403
        : 409;
    return fail(err.code, status, err.message);
  }
  // eslint-disable-next-line no-console
  console.error("Unhandled API error:", err);
  return fail("SERVER_ERROR", 500, "Something went wrong on our end. Please try again ♡");
}
