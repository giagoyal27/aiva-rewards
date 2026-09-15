import { ok } from "@/lib/api-response";
import { clearCustomerSession } from "@/lib/auth";

export async function POST() {
  clearCustomerSession();
  return ok({ loggedOut: true });
}
