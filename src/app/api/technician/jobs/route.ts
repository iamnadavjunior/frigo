import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/technician/jobs ── returns jobs assigned to the logged-in technician ── */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (role !== "TECHNICIAN" && role !== "CABU_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.serviceRequest.findMany({
    where: {
      assignedToId: userId,
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
    },
    include: {
      refrigerator: {
        select: { id: true, serialNumber: true, brand: true, refrigeratorType: true },
      },
      pos: {
        select: {
          id: true,
          posName: true,
          owner: true,
          neighbourhood: true,
          phoneNumber: true,
          streetNo: true,
          city: { select: { name: true } },
        },
      },
      interventions: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(jobs);
}
