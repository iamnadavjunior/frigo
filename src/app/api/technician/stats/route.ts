import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/technician/stats ── personal stats for the logged-in technician ── */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (role !== "TECHNICIAN" && role !== "CABU_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeJobs, totalCompleted, completedThisWeek, completedThisMonth, recentWork] =
    await Promise.all([
      // Active / assigned jobs
      prisma.serviceRequest.count({
        where: { assignedToId: userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      }),
      // All completed interventions
      prisma.intervention.count({
        where: { technicianId: userId, status: "COMPLETED" },
      }),
      // Completed this week
      prisma.intervention.count({
        where: {
          technicianId: userId,
          status: "COMPLETED",
          interventionDate: { gte: startOfWeek },
        },
      }),
      // Completed this month
      prisma.intervention.count({
        where: {
          technicianId: userId,
          status: "COMPLETED",
          interventionDate: { gte: startOfMonth },
        },
      }),
      // Last 5 completed jobs for "Recent Work" preview
      prisma.intervention.findMany({
        where: { technicianId: userId, status: "COMPLETED" },
        include: {
          refrigerator: {
            select: { serialNumber: true },
            include: { pos: { select: { posName: true, city: { select: { name: true } } } } },
          },
          serviceRequest: {
            select: { type: true, urgency: true },
          },
          costItems: { select: { totalCost: true } },
        },
        orderBy: { interventionDate: "desc" },
        take: 5,
      }),
    ]);

  return NextResponse.json({
    activeJobs,
    totalCompleted,
    completedThisWeek,
    completedThisMonth,
    recentWork,
  });
}
