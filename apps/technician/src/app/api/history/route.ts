import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const [interventions, total] = await Promise.all([
    prisma.intervention.findMany({
      where: { technicianId: userId, status: "COMPLETED" },
      select: {
        id: true,
        interventionDate: true,
        workDone: true,
        notes: true,
        status: true,
        type: true,
        refrigerator: {
          select: {
            serialNumber: true,
            brand: true,
            refrigeratorType: true,
            pos: {
              select: {
                posName: true,
                owner: true,
                phoneNumber: true,
                streetNo: true,
                city: { select: { name: true } },
              },
            },
          },
        },
        serviceRequest: { select: { type: true, urgency: true, description: true } },
        costItems: { select: { id: true, totalCost: true } },
      },
      orderBy: { interventionDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.intervention.count({ where: { technicianId: userId, status: "COMPLETED" } }),
  ]);

  return NextResponse.json({ interventions, total, page, limit });
}
