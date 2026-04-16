import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = request.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "TECHNICIAN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { issueDescription, workDone, status, notes, costItems } = body;

    // Fetch current intervention to check type for auto-status tracking
    const current = await prisma.intervention.findUnique({
      where: { id },
      select: { type: true, status: true, refrigeratorId: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
    }

    // Update intervention
    await prisma.intervention.update({
      where: { id },
      data: {
        ...(issueDescription !== undefined && { issueDescription }),
        ...(workDone !== undefined && { workDone }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Auto-update fridge status based on intervention status change
    if (status !== undefined && status !== current.status) {
      if (current.type === "REPAIR") {
        if (status === "IN_PROGRESS") {
          await prisma.refrigerator.update({
            where: { id: current.refrigeratorId },
            data: { status: "UNDER_REPAIR" },
          });
        } else if (status === "COMPLETED") {
          await prisma.refrigerator.update({
            where: { id: current.refrigeratorId },
            data: { status: "ACTIVE" },
          });
        }
      } else if (current.type === "MAINTENANCE" && status === "IN_PROGRESS") {
        await prisma.refrigerator.update({
          where: { id: current.refrigeratorId },
          data: { status: "UNDER_REPAIR" },
        });
      } else if (current.type === "MAINTENANCE" && status === "COMPLETED") {
        await prisma.refrigerator.update({
          where: { id: current.refrigeratorId },
          data: { status: "ACTIVE" },
        });
      }
    }

    // Replace cost items if provided
    if (costItems !== undefined) {
      await prisma.interventionCostItem.deleteMany({ where: { interventionId: id } });
      if (costItems.length > 0) {
        await prisma.interventionCostItem.createMany({
          data: costItems.map((item: { itemName: string; quantity: number; unitCost: number }) => ({
            interventionId: id,
            itemName: item.itemName,
            quantity: item.quantity || 1,
            unitCost: item.unitCost || 0,
            totalCost: (item.quantity || 1) * (item.unitCost || 0),
          })),
        });
      }
    }

    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        refrigerator: { include: { pos: { include: { city: true } } } },
        technician: { select: { fullName: true } },
        costItems: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update intervention error:", error);
    return NextResponse.json({ error: "Failed to update intervention" }, { status: 500 });
  }
}
