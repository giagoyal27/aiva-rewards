import { z } from "zod";

// Indian mobile numbers: allow optional +91, then 10 digits starting 6-9.
// Kept slightly permissive (6-14 digits) so the abstraction still works
// for other regions/test numbers without rewriting business logic later.
export const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{6,14}$/, "Enter a valid mobile number");

export const cardNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^AIVA-\d{5}$/, "Card number must look like AIVA-00427");

export const nameSchema = z.string().trim().min(2, "Name is too short").max(80, "Name is too long");

export const registerSchema = z.object({
  name: nameSchema,
  mobileNumber: mobileNumberSchema,
  cardNumber: cardNumberSchema,
});

export const loginSchema = z.object({
  mobileNumber: mobileNumberSchema,
  cardNumber: cardNumberSchema,
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const manualPurchaseSchema = z.object({
  customerId: z.string().min(1),
  orderReference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const settingsSchema = z.object({
  brandName: z.string().trim().min(1).max(80),
  instagramUrl: z.string().trim().url().or(z.literal("")),
  facebookUrl: z.string().trim().url().or(z.literal("")),
  googleReviewUrl: z.string().trim().url().or(z.literal("")),
});

export const createCardSchema = z.object({
  cardNumber: cardNumberSchema,
});

export const replaceCardSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
