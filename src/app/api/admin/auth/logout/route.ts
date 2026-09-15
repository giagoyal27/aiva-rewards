import { ok } from "@/lib/api-response";
import { clearAdminSession } from "@/lib/auth";

export async function POST() {
  clearAdminSession();
  return ok({ loggedOut: true });
}
