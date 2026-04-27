import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExcelRow } from "@/lib/excel";

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "CABU_ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { rows, cityId: overrideCityId } = (await request.json()) as { rows: ExcelRow[]; cityId?: string };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    // Validate override city exists if provided
    let overrideCityDbId: string | null = null;
    if (overrideCityId) {
      const overrideCity = await prisma.city.findUnique({ where: { id: overrideCityId } });
      if (!overrideCity) {
        return NextResponse.json({ error: "Selected city not found" }, { status: 400 });
      }
      overrideCityDbId = overrideCity.id;
    }

    let imported = 0;
    let skipped = 0;
    const importErrors: { row: number; message: string }[] = [];

    // Cache for cities to avoid repeated DB queries
    const cityCache = new Map<string, string>();

    for (const row of rows) {
      try {
        if (!row.serialNumber || !row.posName) {
          importErrors.push({ row: row.rowIndex, message: "Missing serial number or POS name" });
          skipped++;
          continue;
        }

        // Check for duplicate serial number
        const existing = await prisma.refrigerator.findUnique({
          where: { serialNumber: row.serialNumber },
        });
        if (existing) {
          importErrors.push({ row: row.rowIndex, message: `Duplicate serial number: ${row.serialNumber}` });
          skipped++;
          continue;
        }

        // Get or create city — use override if provided
        let cityId: string;
        if (overrideCityDbId) {
          cityId = overrideCityDbId;
        } else {
          const cityName = row.city || row.state || "Unknown";
          let cachedCityId = cityCache.get(cityName);
          if (!cachedCityId) {
            let city = await prisma.city.findFirst({
              where: { name: { equals: cityName, mode: "insensitive" } },
            });
            if (!city) {
              city = await prisma.city.create({
                data: { name: cityName, externalId: row.cityId || null },
              });
            }
            cachedCityId = city.id;
            cityCache.set(cityName, cachedCityId!);
          }
          cityId = cachedCityId!;
        }

        // Get or create POS
        let pos = await prisma.pos.findFirst({
          where: {
            posName: { equals: row.posName, mode: "insensitive" },
            cityId,
          },
        });
        if (!pos) {
          pos = await prisma.pos.create({
            data: {
              cityId,
              posName: row.posName,
              channel: row.channel || null,
              owner: row.owner || null,
              phoneNumber: row.phoneNumber || null,
              state: row.state || null,
              neighbourhood: row.neighbourhood || null,
              idNumber: row.idNumber || null,
              streetNo: row.streetNo || null,
            },
          });
        }

        // Create refrigerator
        await prisma.refrigerator.create({
          data: {
            posId: pos.id,
            refrigeratorType: row.refrigeratorType || null,
            brand: row.brand || null,
            serialNumber: row.serialNumber,
          },
        });

        imported++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        importErrors.push({ row: row.rowIndex, message });
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: importErrors,
      total: rows.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
