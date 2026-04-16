import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const cityId = searchParams.get("cityId") || "";
  const channel = searchParams.get("channel") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { posName: { contains: search, mode: "insensitive" } },
      { owner: { contains: search, mode: "insensitive" } },
      { neighbourhood: { contains: search, mode: "insensitive" } },
    ];
  }
  if (cityId) where.cityId = cityId;
  if (channel) where.channel = { equals: channel, mode: "insensitive" };

  const [posList, total] = await Promise.all([
    prisma.pos.findMany({
      where,
      include: {
        city: true,
        _count: { select: { refrigerators: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { posName: "asc" },
    }),
    prisma.pos.count({ where }),
  ]);

  return NextResponse.json({ data: posList, total, page, limit });
}
