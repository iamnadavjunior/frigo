import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const cities = await prisma.city.findMany({
    include: {
      _count: { select: { posList: true } },
      posList: {
        include: {
          _count: { select: { refrigerators: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = cities.map((city) => ({
    id: city.id,
    name: city.name,
    posCount: city._count.posList,
    fridgeCount: city.posList.reduce((sum, pos) => sum + pos._count.refrigerators, 0),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "City name is required" }, { status: 400 });
  }

  const existing = await prisma.city.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "A city with this name already exists" }, { status: 409 });
  }

  const city = await prisma.city.create({ data: { name } });
  return NextResponse.json(city, { status: 201 });
}
