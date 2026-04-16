import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const city = await prisma.city.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  // All fridges in this commune
  const allFridges = await prisma.refrigerator.findMany({
    where: { pos: { cityId: id } },
    include: {
      pos: { select: { id: true, posName: true, channel: true, owner: true, phoneNumber: true, neighbourhood: true, idNumber: true, streetNo: true } },
      interventions: {
        select: { id: true, type: true, status: true, interventionDate: true },
      },
    },
    orderBy: { serialNumber: "asc" },
  });

  // Categorize each fridge
  const fridgesWithStats = allFridges.map((f: typeof allFridges[number]) => {
    const maintenances = f.interventions.filter((i: typeof f.interventions[number]) => i.type === "MAINTENANCE");
    const repairs = f.interventions.filter((i: typeof f.interventions[number]) => i.type === "REPAIR");
    const hasCompletedMaintenance = maintenances.some((i: typeof f.interventions[number]) => i.status === "COMPLETED");
    const hasCompletedRepair = repairs.some((i: typeof f.interventions[number]) => i.status === "COMPLETED");

    return {
      id: f.id,
      serialNumber: f.serialNumber,
      brand: f.brand,
      refrigeratorType: f.refrigeratorType,
      status: f.status,
      posName: f.pos.posName,
      posId: f.pos.id,
      channel: f.pos.channel,
      owner: f.pos.owner,
      phoneNumber: f.pos.phoneNumber,
      neighbourhood: f.pos.neighbourhood,
      idNumber: f.pos.idNumber,
      streetNo: f.pos.streetNo,
      maintenanceCount: maintenances.length,
      repairCount: repairs.length,
      isServiced: hasCompletedMaintenance,
      isRepaired: hasCompletedRepair,
      interventions: f.interventions.map((i: typeof f.interventions[number]) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        interventionDate: i.interventionDate,
      })),
    };
  });

  const totalFridges = fridgesWithStats.length;
  const servicedFridges = fridgesWithStats.filter((f: { isServiced: boolean }) => f.isServiced).length;
  const nonServicedFridges = totalFridges - servicedFridges;
  const repairedFridges = fridgesWithStats.filter((f: { isRepaired: boolean }) => f.isRepaired).length;
  const nonRepairedFridges = totalFridges - repairedFridges;

  return NextResponse.json({
    city,
    stats: {
      totalFridges,
      servicedFridges,
      nonServicedFridges,
      repairedFridges,
      nonRepairedFridges,
    },
    fridges: fridgesWithStats,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "City name is required" }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const existing = await prisma.city.findUnique({ where: { name } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "A city with this name already exists" }, { status: 409 });
  }

  const updated = await prisma.city.update({ where: { id }, data: { name } });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const city = await prisma.city.findUnique({
    where: { id },
    include: {
      posList: { include: { _count: { select: { refrigerators: true } } } },
    },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const totalFridges = city.posList.reduce((sum, pos) => sum + pos._count.refrigerators, 0);
  if (totalFridges > 0 || city.posList.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a city that still has POS locations or fridges. Remove them first." },
      { status: 409 }
    );
  }

  await prisma.city.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
