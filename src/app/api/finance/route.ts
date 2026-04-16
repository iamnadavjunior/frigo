import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "all"; // "month" | "quarter" | "year" | "all"

  let dateFilter: { gte?: Date } | undefined;
  const now = new Date();
  if (period === "month") {
    dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  } else if (period === "quarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    dateFilter = { gte: new Date(now.getFullYear(), qMonth, 1) };
  } else if (period === "year") {
    dateFilter = { gte: new Date(now.getFullYear(), 0, 1) };
  }

  const interventionDateWhere = dateFilter
    ? { intervention: { interventionDate: dateFilter } }
    : {};

  const interventionWhere = dateFilter
    ? { interventionDate: dateFilter }
    : {};

  // Aggregate totals
  const [totalCosts, maintenanceCosts, repairCosts, totalInterventionsWithCost] =
    await Promise.all([
      prisma.interventionCostItem.aggregate({
        _sum: { totalCost: true },
        _count: true,
        where: interventionDateWhere,
      }),
      prisma.interventionCostItem.aggregate({
        _sum: { totalCost: true },
        _count: true,
        where: {
          ...interventionDateWhere,
          intervention: {
            ...interventionDateWhere.intervention,
            type: "MAINTENANCE",
          },
        },
      }),
      prisma.interventionCostItem.aggregate({
        _sum: { totalCost: true },
        _count: true,
        where: {
          ...interventionDateWhere,
          intervention: {
            ...interventionDateWhere.intervention,
            type: "REPAIR",
          },
        },
      }),
      prisma.intervention.count({
        where: {
          ...interventionWhere,
          costItems: { some: {} },
        },
      }),
    ]);

  // Cost by city (top 10)
  const costByCity = dateFilter
    ? await prisma.$queryRaw<{ cityName: string; totalCost: number; count: number }[]>`
        SELECT c.name AS "cityName",
               COALESCE(SUM(ci."totalCost"), 0)::float AS "totalCost",
               COUNT(DISTINCT i.id)::int AS "count"
        FROM intervention_cost_items ci
        JOIN interventions i ON i.id = ci."interventionId"
        JOIN refrigerators r ON r.id = i."refrigeratorId"
        JOIN pos p ON p.id = r."posId"
        JOIN cities c ON c.id = p."cityId"
        WHERE i."interventionDate" >= ${dateFilter.gte}
        GROUP BY c.name ORDER BY "totalCost" DESC LIMIT 10
      `
    : await prisma.$queryRaw<{ cityName: string; totalCost: number; count: number }[]>`
        SELECT c.name AS "cityName",
               COALESCE(SUM(ci."totalCost"), 0)::float AS "totalCost",
               COUNT(DISTINCT i.id)::int AS "count"
        FROM intervention_cost_items ci
        JOIN interventions i ON i.id = ci."interventionId"
        JOIN refrigerators r ON r.id = i."refrigeratorId"
        JOIN pos p ON p.id = r."posId"
        JOIN cities c ON c.id = p."cityId"
        GROUP BY c.name ORDER BY "totalCost" DESC LIMIT 10
      `;

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyTrend = await prisma.$queryRaw<
    { month: string; maintenance: number; repair: number; total: number }[]
  >`
    SELECT TO_CHAR(i."interventionDate", 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN i.type = 'MAINTENANCE' THEN ci."totalCost" ELSE 0 END), 0)::float AS maintenance,
           COALESCE(SUM(CASE WHEN i.type = 'REPAIR' THEN ci."totalCost" ELSE 0 END), 0)::float AS repair,
           COALESCE(SUM(ci."totalCost"), 0)::float AS total
    FROM intervention_cost_items ci
    JOIN interventions i ON i.id = ci."interventionId"
    WHERE i."interventionDate" >= ${sixMonthsAgo}
    GROUP BY TO_CHAR(i."interventionDate", 'YYYY-MM')
    ORDER BY month ASC
  `;

  // Recent cost items (last 20)
  const recentItems = await prisma.interventionCostItem.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    where: interventionDateWhere,
    select: {
      id: true,
      itemName: true,
      quantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
      intervention: {
        select: {
          id: true,
          type: true,
          status: true,
          interventionDate: true,
          refrigerator: {
            select: {
              serialNumber: true,
              pos: {
                select: {
                  posName: true,
                  city: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const total = totalCosts._sum.totalCost || 0;
  const avgPerIntervention =
    totalInterventionsWithCost > 0 ? total / totalInterventionsWithCost : 0;

  return NextResponse.json({
    summary: {
      totalCost: total,
      maintenanceCost: maintenanceCosts._sum.totalCost || 0,
      repairCost: repairCosts._sum.totalCost || 0,
      totalItems: totalCosts._count,
      maintenanceItems: maintenanceCosts._count,
      repairItems: repairCosts._count,
      interventionsWithCost: totalInterventionsWithCost,
      avgCostPerIntervention: Math.round(avgPerIntervention),
    },
    costByCity,
    monthlyTrend,
    recentItems,
  });
}
