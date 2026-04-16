import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const simple = searchParams.get("simple");

  /* Lightweight list for dropdowns / selectors */
  if (simple) {
    const fridges = await prisma.refrigerator.findMany({
      select: { id: true, serialNumber: true, posId: true, pos: { select: { posName: true } } },
      orderBy: { serialNumber: "asc" },
    });
    return NextResponse.json(fridges.map(f => ({ id: f.id, serialNumber: f.serialNumber, posId: f.posId, posName: f.pos.posName })));
  }

  const search = searchParams.get("search") || "";
  const posId = searchParams.get("posId") || "";
  const cityId = searchParams.get("cityId") || "";
  const status = searchParams.get("status") || "";
  const limit = parseInt(searchParams.get("limit") || "500");

  const where: Record<string, unknown> = {};
  if (posId) where.posId = posId;
  if (cityId) where.pos = { cityId };
  if (status) where.status = status;
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const serialNumber = typeof body.serialNumber === "string" ? body.serialNumber.trim() : "";
  const posId = typeof body.posId === "string" ? body.posId.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : null;
  const refrigeratorType = typeof body.refrigeratorType === "string" ? body.refrigeratorType.trim() : null;

  if (!serialNumber || !posId) {
    return NextResponse.json({ error: "Serial number and POS are required" }, { status: 400 });
  }

  const existing = await prisma.refrigerator.findUnique({ where: { serialNumber } });
  if (existing) {
    return NextResponse.json({ error: "A fridge with this serial number already exists" }, { status: 409 });
  }

  const pos = await prisma.pos.findUnique({ where: { id: posId } });
  if (!pos) {
    return NextResponse.json({ error: "POS not found" }, { status: 404 });
  }

  const fridge = await prisma.refrigerator.create({
    data: { serialNumber, posId, brand, refrigeratorType },
    include: { pos: { include: { city: true } } },
  });

  return NextResponse.json(fridge, { status: 201 });
}
