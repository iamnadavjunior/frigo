import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ── GET /api/technician/activity ── unified activity feed ── */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (role !== "TECHNICIAN" && role !== "CABU_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const tab = searchParams.get("tab") || "all"; // fiches | jobs | all
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const search = searchParams.get("search") || "";

  const dateFilter: Record<string, unknown> = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo + "T23:59:59");

  const results: Record<string, unknown>[] = [];

  /* ── Fiches sent (MAINTENANCE interventions by this tech) ── */
  if (tab === "fiches" || tab === "all") {
    const fichesWhere: Record<string, unknown> = {
      technicianId: userId,
      type: "MAINTENANCE",
    };
    if (dateFrom || dateTo) fichesWhere.interventionDate = dateFilter;
    if (search) {
      fichesWhere.OR = [
        { workDone: { contains: search, mode: "insensitive" } },
        { refrigerator: { serialNumber: { contains: search, mode: "insensitive" } } },
        { refrigerator: { pos: { posName: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const fiches = await prisma.intervention.findMany({
      where: fichesWhere,
      select: {
        id: true,
        type: true,
        status: true,
        interventionDate: true,
        workDone: true,
        createdAt: true,
        refrigerator: {
          select: {
            serialNumber: true,
            brand: true,
            pos: {
              select: {
                posName: true,
                owner: true,
                city: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    fiches.forEach((f) =>
      results.push({ ...f, _kind: "fiche" as const })
    );
  }

  /* ── Jobs received (ServiceRequests assigned to this tech) ── */
  if (tab === "jobs" || tab === "all") {
    const jobsWhere: Record<string, unknown> = {
      assignedToId: userId,
    };
    if (dateFrom || dateTo) jobsWhere.assignedAt = dateFilter;
    if (search) {
      jobsWhere.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { refrigerator: { serialNumber: { contains: search, mode: "insensitive" } } },
        { pos: { posName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const jobs = await prisma.serviceRequest.findMany({
      where: jobsWhere,
      select: {
        id: true,
        type: true,
        urgency: true,
        status: true,
        description: true,
        assignedAt: true,
        createdAt: true,
        refrigerator: { select: { serialNumber: true, brand: true } },
        pos: {
          select: {
            posName: true,
            owner: true,
            city: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    jobs.forEach((j) =>
      results.push({ ...j, _kind: "job" as const })
    );
  }

  /* ── Sort by date descending ── */
  results.sort((a, b) => {
    const da = new Date((a.createdAt as string) || 0).getTime();
    const db = new Date((b.createdAt as string) || 0).getTime();
    return db - da;
  });

  return NextResponse.json({ data: results, total: results.length });
}
