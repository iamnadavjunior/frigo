import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel";

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rows, errors, headers, columnMapping, sheetName, totalRawRows } = parseExcelBuffer(buffer);

    return NextResponse.json({ rows, errors, headers, columnMapping, sheetName, totalRawRows, totalRows: rows.length });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
