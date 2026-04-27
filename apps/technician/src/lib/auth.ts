import { cookies } from "next/headers";
import { verifyToken, signToken } from "./jwt";
export type { JWTPayload } from "./jwt";
export { signToken, verifyToken } from "./jwt";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("tech_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
