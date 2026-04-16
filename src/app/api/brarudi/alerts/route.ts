import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/brarudi/alerts ── */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!userId || role !== "BRARUDI") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { createdById: userId };
  if (status && status !== "ALL") where.status = status;
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      createdAt.lte = d;
    }
    where.createdAt = createdAt;
  }
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { refrigerator: { serialNumber: { contains: search, mode: "insensitive" } } },
      { pos: { posName: { contains: search, mode: "insensitive" } } },
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
