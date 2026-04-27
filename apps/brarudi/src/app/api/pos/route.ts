import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cityId = request.nextUrl.searchParams.get("cityId");
  if (!cityId) return NextResponse.json({ error: "cityId is required" }, { status: 400 });

  const pos = await prisma.pos.findMany({
    where: { cityId },
    select: { id: true, posName: true, owner: true },
    orderBy: { posName: "asc" },
  });
  return NextResponse.json({ pos });
}
