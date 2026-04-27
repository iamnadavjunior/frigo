import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posId = request.nextUrl.searchParams.get("posId");
  if (!posId) return NextResponse.json({ error: "posId is required" }, { status: 400 });

  const refrigerators = await prisma.refrigerator.findMany({
    where: { posId },
    select: { id: true, serialNumber: true, brand: true },
    orderBy: { serialNumber: "asc" },
  });
  return NextResponse.json({ refrigerators });
}
