import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Approximate coordinates for Bujumbura neighbourhoods (demo data)
const NEIGHBOURHOOD_COORDS: Record<string, [number, number]> = {
  "Buyenzi": [-3.3780, 29.3520],
  "Bwiza": [-3.3830, 29.3580],
  "Cibitoke": [-3.3650, 29.3490],
  "Kanyosha": [-3.3990, 29.3590],
  "Kinindo": [-3.3960, 29.3520],
  "Musaga": [-3.3900, 29.3620],
  "Ngagara": [-3.3600, 29.3600],
  "Nyakabiga": [-3.3750, 29.3700],
  "Rohero": [-3.3810, 29.3640],
  "Kamenge": [-3.3520, 29.3560],
};

const BUJUMBURA_CENTER: [number, number] = [-3.3731, 29.3644];

function hashCoord(id: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return ((hash + index * 7919) % 1000) / 100000;
}

export async function GET() {
  const posList = await prisma.pos.findMany({
    include: {
      city: true,
      refrigerators: {
        select: { status: true },
      },
    },
    orderBy: { posName: "asc" },
  });

  const result = posList.map((pos, idx) => {
    const neighbourhoodKey = Object.keys(NEIGHBOURHOOD_COORDS).find(
      (k) => pos.neighbourhood?.toLowerCase().includes(k.toLowerCase())
    );
    const baseCoords = neighbourhoodKey
      ? NEIGHBOURHOOD_COORDS[neighbourhoodKey]
      : BUJUMBURA_CENTER;

    // Add small offset per POS so they don't stack
    const lat = baseCoords[0] + hashCoord(pos.id, idx);
    const lng = baseCoords[1] + hashCoord(pos.id, idx + 1000);

    return {
      id: pos.id,
      posName: pos.posName,
      owner: pos.owner,
      channel: pos.channel,
      neighbourhood: pos.neighbourhood,
      city: pos.city.name,
      lat,
      lng,
      fridgeCount: pos.refrigerators.length,
      activeFridges: pos.refrigerators.filter((r) => r.status === "ACTIVE").length,
      underRepairFridges: pos.refrigerators.filter((r) => r.status === "UNDER_REPAIR").length,
    };
  });

  return NextResponse.json(result);
}
