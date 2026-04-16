import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/service-requests/[id] ── */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

/* ── PUT /api/service-requests/[id] ── assign technician / update status ── */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, assignedToId, adminNotes, urgency } = body;

  const existing = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Service request not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (status) {
    if (!["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
    if (status === "RESOLVED") data.resolvedAt = new Date();
  }

  if (assignedToId) {
    // Verify technician exists
    const tech = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!tech) return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    data.assignedToId = assignedToId;
    data.assignedAt = new Date();
    // Auto-set status to ASSIGNED if still PENDING
    if (existing.status === "PENDING" && !status) {
      data.status = "ASSIGNED";
    }
  }

  if (adminNotes !== undefined) data.adminNotes = adminNotes;
  if (urgency) data.urgency = urgency;

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data,
    include: {
      refrigerator: { select: { id: true, serialNumber: true, brand: true, status: true } },
      pos: { select: { id: true, posName: true, owner: true, neighbourhood: true, city: { select: { id: true, name: true } } } },
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(updated);
}

/* ── DELETE /api/service-requests/[id] ── */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Service request not found" }, { status: 404 });

  await prisma.serviceRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
