import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "day"; // day | week | month | custom
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const cityId = searchParams.get("cityId");
  const tab = searchParams.get("tab") || "repairs"; // repairs | maintenance
  const monthIndex = searchParams.get("monthIndex"); // 0-11

  // Compute date range
  const now = new Date();
  let start: Date;
  let end: Date;

  if (monthIndex !== null && monthIndex !== "") {
    // Specific month selected
    const mi = parseInt(monthIndex, 10);
    const year = now.getFullYear();
    start = new Date(year, mi, 1);
    end = new Date(year, mi + 1, 0, 23, 59, 59, 999); // last day of month
  } else if (period === "custom" && dateFrom && dateTo) {
    start = new Date(dateFrom);
    end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    const dayOfWeek = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else {
    // day
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  const interventionType = tab === "repairs" ? "REPAIR" : "MAINTENANCE";

  // Build where clause
  const where: Record<string, unknown> = {
    type: interventionType,
    status: "COMPLETED",
    interventionDate: { gte: start, lte: end },
  };
  if (cityId) {
    where.refrigerator = { pos: { cityId } };
  }

  // Fetch completed interventions in range
  const interventions = await prisma.intervention.findMany({
    where,
    orderBy: [{ interventionDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      status: true,
      interventionDate: true,
      issueDescription: true,
      workDone: true,
      notes: true,
      refrigerator: {
        select: {
          id: true,
          serialNumber: true,
          brand: true,
          refrigeratorType: true,
          pos: {
            select: {
              posName: true,
              channel: true,
              owner: true,
              phoneNumber: true,
              neighbourhood: true,
              idNumber: true,
              streetNo: true,
              city: { select: { id: true, name: true } },
            },
          },
        },
      },
      technician: { select: { fullName: true } },
      costItems: { select: { itemName: true, quantity: true, unitCost: true, totalCost: true } },
    },
  });

  // Group by date
  const byDate: Record<string, typeof interventions> = {};
  for (const inv of interventions) {
    const dateKey = new Date(inv.interventionDate).toISOString().slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(inv);
  }

  // Summary
  const totalCost = interventions.reduce(
    (sum, i) => sum + i.costItems.reduce((s, c) => s + c.totalCost, 0), 0
  );
  const uniqueFridges = new Set(interventions.map((i) => i.refrigerator.serialNumber)).size;
  const uniquePOS = new Set(interventions.map((i) => i.refrigerator.pos.posName)).size;

  // Non-serviced/non-repaired count in this period
  const fridgeWhere: Record<string, unknown> = {};
  if (cityId) fridgeWhere.pos = { cityId };

  const totalFridgesInScope = await prisma.refrigerator.count({ where: fridgeWhere });

  // Fridges that had a completed intervention of this type in the period
  const servicedFridgeIds = await prisma.intervention.findMany({
    where,
    select: { refrigeratorId: true },
    distinct: ["refrigeratorId"],
  });
  const servicedCount = servicedFridgeIds.length;
  const nonServicedCount = totalFridgesInScope - servicedCount;

  return NextResponse.json({
    tab,
    period,
    dateRange: { from: start.toISOString(), to: end.toISOString() },
    summary: {
      total: interventions.length,
      uniqueFridges,
      uniquePOS,
      totalCost,
      totalFridgesInScope,
      servicedCount,
      nonServicedCount,
    },
    byDate,
    data: interventions,
  });
}
