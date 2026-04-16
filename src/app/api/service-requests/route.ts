import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/service-requests ── */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status"); // PENDING | ASSIGNED | IN_PROGRESS | RESOLVED | CANCELLED
  const type = searchParams.get("type"); // REPAIR | MAINTENANCE
  const urgency = searchParams.get("urgency");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (urgency) where.urgency = urgency;

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      refrigerator: { select: { id: true, serialNumber: true, brand: true, status: true } },
      pos: { select: { id: true, posName: true, owner: true, neighbourhood: true, city: { select: { id: true, name: true } } } },
      assignedTo: { select: { id: true, fullName: true } },
    },
    orderBy: [{ status: "asc" }, { urgency: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}

/* ── POST /api/service-requests ── */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { refrigeratorId, posId, type, urgency, description, contactName, contactPhone } = body;

  if (!refrigeratorId || !posId || !type || !description) {
    return NextResponse.json({ error: "refrigeratorId, posId, type, and description are required" }, { status: 400 });
  }

  if (!["REPAIR", "MAINTENANCE"].includes(type)) {
    return NextResponse.json({ error: "type must be REPAIR or MAINTENANCE" }, { status: 400 });
  }

  // Verify fridge & POS exist
  const fridge = await prisma.refrigerator.findUnique({ where: { id: refrigeratorId } });
  if (!fridge) return NextResponse.json({ error: "Refrigerator not found" }, { status: 404 });

  const pos = await prisma.pos.findUnique({ where: { id: posId } });
  if (!pos) return NextResponse.json({ error: "POS not found" }, { status: 404 });

  // Track who created this request
  const createdById = request.headers.get("x-user-id") || null;

  const sr = await prisma.serviceRequest.create({
    data: {
      refrigeratorId,
      posId,
      type,
      urgency: urgency || "MEDIUM",
      description,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      createdById,
    },
    include: {
      refrigerator: { select: { id: true, serialNumber: true, brand: true, status: true } },
      pos: { select: { id: true, posName: true, owner: true, neighbourhood: true, city: { select: { id: true, name: true } } } },
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(sr, { status: 201 });
}
