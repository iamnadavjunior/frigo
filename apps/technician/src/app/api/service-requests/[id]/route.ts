import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sr = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      refrigerator: { select: { id: true, serialNumber: true, brand: true, refrigeratorType: true } },
      pos: { select: { id: true, posName: true, owner: true, neighbourhood: true, city: { select: { name: true } } } },
      assignedTo: { select: { id: true, fullName: true } },
    },
  });
  if (!sr) return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  return NextResponse.json(sr);
}
