import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      prisma.serviceRequest.count({
        where: { assignedToId: userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      }),
      prisma.intervention.count({ where: { technicianId: userId, status: "COMPLETED" } }),
      prisma.intervention.count({
        where: { technicianId: userId, status: "COMPLETED", interventionDate: { gte: startOfWeek } },
      }),
      prisma.intervention.count({
        where: { technicianId: userId, status: "COMPLETED", interventionDate: { gte: startOfMonth } },
      }),
      prisma.intervention.findMany({
        where: { technicianId: userId, status: "COMPLETED" },
        select: {
          id: true,
          interventionDate: true,
          type: true,
          status: true,
          refrigerator: {
            select: {
              serialNumber: true,
              pos: { select: { posName: true, city: { select: { name: true } } } },
            },
          },
          serviceRequest: { select: { type: true, urgency: true } },
          costItems: { select: { totalCost: true } },
        },
        orderBy: { interventionDate: "desc" },
        take: 10,
      }),
    ]);

  return NextResponse.json({ activeJobs, totalCompleted, completedThisWeek, completedThisMonth, recentWork });
}
