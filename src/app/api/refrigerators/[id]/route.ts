import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fridge = await prisma.refrigerator.findUnique({
    where: { id },
    include: {
      pos: { include: { city: true } },
      interventions: {
        include: {
          technician: { select: { fullName: true } },
          costItems: true,
        },
        orderBy: { interventionDate: "desc" },
      },
    },
  });

  if (!fridge) {
    return NextResponse.json({ error: "Refrigerator not found" }, { status: 404 });
  }

  const maintenanceCount = fridge.interventions.filter((i) => i.type === "MAINTENANCE").length;
  const repairCount = fridge.interventions.filter((i) => i.type === "REPAIR").length;
  const totalCost = fridge.interventions.reduce(
    (sum, i) => sum + i.costItems.reduce((s, c) => s + c.totalCost, 0),
    0
  );

  return NextResponse.json({ fridge, maintenanceCount, repairCount, totalCost });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fridge = await prisma.refrigerator.findUnique({
    where: { id },
    include: { _count: { select: { interventions: true } } },
  });

  if (!fridge) {
    return NextResponse.json({ error: "Refrigerator not found" }, { status: 404 });
  }

  if (fridge._count.interventions > 0) {
    return NextResponse.json(
      { error: "Cannot delete a fridge that has intervention records. Archive it instead." },
      { status: 409 }
    );
  }

  await prisma.refrigerator.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
