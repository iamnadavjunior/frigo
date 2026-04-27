import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Shared queries
  const [
    totalFridges,
    totalPos,
    totalCities,
    totalInterventions,
    maintenanceCount,
    repairCount,
    completedMaintenanceCount,
    completedRepairCount,
    activeFridges,
    underRepairFridges,
    inactiveFridges,
    totalRepairCost,
    interventionsThisMonth,
  ] = await Promise.all([
    prisma.refrigerator.count(),
    prisma.pos.count(),
    prisma.city.count(),
    prisma.intervention.count(),
    prisma.intervention.count({ where: { type: "MAINTENANCE" } }),
    prisma.intervention.count({ where: { type: "REPAIR" } }),
    prisma.intervention.count({ where: { type: "MAINTENANCE", status: "COMPLETED" } }),
    prisma.intervention.count({ where: { type: "REPAIR", status: "COMPLETED" } }),
    prisma.refrigerator.count({ where: { status: "ACTIVE" } }),
    prisma.refrigerator.count({ where: { status: "UNDER_REPAIR" } }),
    prisma.refrigerator.count({ where: { status: "INACTIVE" } }),
    prisma.interventionCostItem.aggregate({ _sum: { totalCost: true } }),
    prisma.intervention.count({ where: { interventionDate: { gte: startOfMonth } } }),
  ]);

  // Fridges that have at least one completed maintenance
  const servicedFridgeIds = await prisma.intervention.findMany({
    where: { type: "MAINTENANCE", status: "COMPLETED" },
    select: { refrigeratorId: true },
    distinct: ["refrigeratorId"],
  });
  const servicedFridges = servicedFridgeIds.length;

  // Fridges that have at least one completed repair
  const repairedFridgeIds = await prisma.intervention.findMany({
    where: { type: "REPAIR", status: "COMPLETED" },
    select: { refrigeratorId: true },
    distinct: ["refrigeratorId"],
  });
  const repairedFridges = repairedFridgeIds.length;

  const base = {
    totalFridges,
    totalPos,
    totalCities,
    totalInterventions,
    maintenanceCount,
    repairCount,
    completedMaintenanceCount,
    completedRepairCount,
    servicedFridges,
    repairedFridges,
    activeFridges,
    underRepairFridges,
    inactiveFridges,
    totalRepairCost: totalRepairCost._sum.totalCost || 0,
    interventionsThisMonth,
  };

  if (role === "CABU_ADMIN") {
    return NextResponse.json({ role: "CABU_ADMIN", ...base });
  }

  if (role === "BRARUDI_DELEGUE") {
    return NextResponse.json({ role: "BRARUDI_DELEGUE", ...base });
  }

  if (role === "TECHNICIAN") {
    const pendingCount = await prisma.intervention.count({
      where: { technicianId: userId!, status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    return NextResponse.json({ role: "TECHNICIAN", ...base, pendingCount });
  }

  return NextResponse.json({ error: "Unknown role" }, { status: 403 });
}
