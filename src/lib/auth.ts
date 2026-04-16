import { cookies } from "next/headers";
import { prisma } from "./db";

export { signToken, verifyToken } from "./jwt";
export type { JWTPayload } from "./jwt";
import type { JWTPayload } from "./jwt";
import { verifyToken } from "./jwt";

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  return user;
}
