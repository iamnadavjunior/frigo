import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/service-requests/alerts ── lightweight counts for the bell icon ── */
export async function GET() {
  const [pending, assigned, critical, recentRequests] = await Promise.all([
    prisma.serviceRequest.count({ where: { status: "PENDING" } }),
    prisma.serviceRequest.count({ where: { status: "ASSIGNED" } }),
    prisma.serviceRequest.count({ where: { status: "PENDING", urgency: "CRITICAL" } }),
    prisma.serviceRequest.findMany({
      where: { status: { in: ["PENDING", "ASSIGNED"] } },
      include: {
        refrigerator: { select: { serialNumber: true } },
        pos: { select: { posName: true, neighbourhood: true, city: { select: { name: true } } } },
        assignedTo: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    pending,
    assigned,
    critical,
    total: pending + assigned,
    recentRequests,
  });
}
