import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password are required" }, { status: 400 });

    const input = username.toLowerCase().trim();
    const user = input.includes("@")
      ? await prisma.user.findUnique({ where: { email: input } })
      : await prisma.user.findUnique({ where: { username: input } });

    if (!user || !user.active) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    if ((user.role as string) !== "BRARUDI_DELEGUE") return NextResponse.json({ error: "Access restricted to BRARUDI delegates" }, { status: 403 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await signToken({ userId: user.id, role: user.role, fullName: user.fullName, email: user.email });

    const response = NextResponse.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
    response.cookies.set("brarudi_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("LOGIN ERROR", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
