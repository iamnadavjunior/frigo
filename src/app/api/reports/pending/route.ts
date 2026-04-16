import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const interventions = await prisma.intervention.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      interventionDate: true,
      issueDescription: true,
      workDone: true,
      notes: true,
      createdAt: true,
      refrigerator: {
        select: {
          id: true,
          serialNumber: true,
          brand: true,
          refrigeratorType: true,
          pos: {
            select: {
              posName: true,
              owner: true,
              phoneNumber: true,
              streetNo: true,
              channel: true,
              neighbourhood: true,
              idNumber: true,
              city: { select: { id: true, name: true } },
            },
          },
        },
      },
      technician: { select: { fullName: true } },
    },
  });

  return NextResponse.json({ data: interventions, total: interventions.length });
}
