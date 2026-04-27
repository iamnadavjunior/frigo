import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { createdById: userId };
  if (status && status !== "ALL") where.status = status;
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.gte = new Date(dateFrom);
    if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); range.lte = d; }
    where.createdAt = range;
  }
  if (search) {
    where.OR = [
      { pos: { posName: { contains: search, mode: "insensitive" } } },
      { refrigerator: { serialNumber: { contains: search, mode: "insensitive" } } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [alerts, counts] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: {
        refrigerator: { select: { serialNumber: true, brand: true } },
        pos: { select: { posName: true, owner: true, city: { select: { name: true } } } },
        assignedTo: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.serviceRequest.groupBy({
      by: ["status"],
      where: { createdById: userId },
      _count: true,
    }),
  ]);

  const stats = { total: 0, PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CANCELLED: 0 };
  counts.forEach((c) => {
    stats[c.status as keyof typeof stats] = c._count;
    stats.total += c._count;
  });

  return NextResponse.json({ alerts, stats });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { refrigeratorId, posId, type, urgency, description } = body;

    if (!refrigeratorId || !posId || !type || !urgency) {
      return NextResponse.json({ error: "refrigeratorId, posId, type, and urgency are required" }, { status: 400 });
    }

    const alert = await prisma.serviceRequest.create({
      data: {
        refrigeratorId,
        posId,
        type,
        urgency,
        description: description || null,
        status: "PENDING",
        createdById: userId,
      },
      include: {
        refrigerator: { select: { serialNumber: true } },
        pos: { select: { posName: true, city: { select: { name: true } } } },
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    console.error("CREATE ALERT ERROR", err);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
