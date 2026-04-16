import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pos = await prisma.pos.findUnique({
    where: { id },
    include: {
      city: true,
      refrigerators: {
        include: {
          _count: { select: { interventions: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!pos) {
    return NextResponse.json({ error: "POS not found" }, { status: 404 });
  }

  // Get recent interventions for fridges at this POS
  const fridgeIds = pos.refrigerators.map((r) => r.id);
  const recentInterventions = await prisma.intervention.findMany({
    where: { refrigeratorId: { in: fridgeIds } },
    include: {
      refrigerator: true,
      technician: { select: { fullName: true } },
      costItems: true,
    },
    orderBy: { interventionDate: "desc" },
    take: 10,
  });

  return NextResponse.json({ pos, recentInterventions });
}
