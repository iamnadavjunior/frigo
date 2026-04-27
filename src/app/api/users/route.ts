import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/* ── GET /api/users ── admin-only: list all users ── */
export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "CABU_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, username: true, email: true, role: true, active: true, createdAt: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return NextResponse.json(users);
}

/* ── POST /api/users ── admin-only: create a new account ── */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "CABU_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, username, email, userRole, password } = body;

  if (!fullName || !username || !email || !userRole || !password) {
    return NextResponse.json({ error: "fullName, username, email, role, and password are required" }, { status: 400 });
  }

  if (!["CABU_ADMIN", "TECHNICIAN", "BRARUDI_DELEGUE"].includes(userRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Password must be at least 8 chars
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();

  const existingUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (existingUsername) {
    return NextResponse.json({ error: "An account with this username already exists" }, { status: 409 });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: userRole,
      active: true,
    },
    select: { id: true, fullName: true, username: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
