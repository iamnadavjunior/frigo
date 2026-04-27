import { cookies } from "next/headers";
export { signToken, verifyToken } from "./jwt";
export type { JWTPayload } from "./jwt";
import { verifyToken } from "./jwt";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("brarudi_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
