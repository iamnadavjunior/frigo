import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "CABU_ADMIN" && role !== "TECHNICIAN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { refrigeratorId, technicianId, serviceRequestId, type, interventionDate, issueDescription, workDone, status, notes, costItems } = body;

    if (!refrigeratorId || !technicianId || !type || !interventionDate) {
      return NextResponse.json({ error: "Missing required fields: refrigeratorId, technicianId, type, interventionDate" }, { status: 400 });
    }
    if (!["MAINTENANCE", "REPAIR"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const effectiveStatus = status || "PENDING";

    const intervention = await prisma.intervention.create({
      data: {
        refrigeratorId,
        technicianId,
        serviceRequestId: serviceRequestId || null,
        type,
        interventionDate: new Date(interventionDate),
        issueDescription: issueDescription || null,
        workDone: workDone || null,
        status: effectiveStatus,
        notes: notes || null,
        costItems: costItems?.length
          ? {
              create: costItems.map((item: { itemName: string; quantity: number; unitCost: number }) => ({
                itemName: item.itemName,
                quantity: item.quantity || 1,
                unitCost: item.unitCost || 0,
                totalCost: (item.quantity || 1) * (item.unitCost || 0),
              })),
            }
          : undefined,
      },
      include: {
        refrigerator: { include: { pos: { include: { city: true } } } },
        technician: { select: { fullName: true } },
        costItems: true,
      },
    });

    if (effectiveStatus === "IN_PROGRESS") {
      await prisma.refrigerator.update({ where: { id: refrigeratorId }, data: { status: "UNDER_REPAIR" } });
    } else if (effectiveStatus === "COMPLETED") {
      await prisma.refrigerator.update({ where: { id: refrigeratorId }, data: { status: "ACTIVE" } });
    }

    if (effectiveStatus === "COMPLETED" && serviceRequestId) {
      await prisma.serviceRequest.update({ where: { id: serviceRequestId }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    }

    return NextResponse.json(intervention, { status: 201 });
  } catch (error) {
    console.error("Create intervention error:", error);
    const message = error instanceof Error ? error.message : "Failed to create intervention";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
