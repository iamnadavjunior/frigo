import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN", active: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ cities, technicians });
}
