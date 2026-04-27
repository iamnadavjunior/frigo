import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const intervention = await prisma.intervention.findUnique({
    where: { id },
    include: {
      refrigerator: { include: { pos: { include: { city: true } } } },
      technician: { select: { id: true, fullName: true } },
      costItems: true,
      serviceRequest: { select: { type: true, urgency: true, description: true } },
    },
  });

  if (!intervention) {
    return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
  }

  return NextResponse.json(intervention);
}
