import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "500");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { pos: { posName: { contains: search, mode: "insensitive" } } },
      { pos: { city: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const fridges = await prisma.refrigerator.findMany({
    where,
    include: { pos: { include: { city: true } } },
    take: limit,
    orderBy: [{ pos: { city: { name: "asc" } } }, { serialNumber: "asc" }],
  });

  return NextResponse.json(fridges);
}
