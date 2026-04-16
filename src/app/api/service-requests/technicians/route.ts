import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/service-requests/technicians ── list technicians for assignment ── */
export async function GET() {
  const technicians = await prisma.user.findMany({
    where: { role: { in: ["TECHNICIAN", "ADMIN"] }, active: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(technicians);
}
