/**
 * Usage: npx tsx scripts/inspect-excel.ts <path-to-excel-file>
 * 
 * Inspects an Excel file and shows:
 * - Sheet names
 * - Headers found
 * - Column mapping results
 * - First 5 rows of data
 * - Any parse errors
 */
import * as XLSX from "xlsx";
import { parseExcelBuffer } from "../src/lib/excel";
import { readFileSync } from "fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/inspect-excel.ts <path-to-excel-file>");
  process.exit(1);
}

console.log(`\n📄 Inspecting: ${filePath}\n`);

const buffer = readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: "buffer" });

console.log(`📋 Sheets: ${workbook.SheetNames.join(", ")}`);

// Show raw headers from first sheet
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
console.log(`📊 Total rows (incl. header): ${rawData.length}`);

if (rawData.length > 0) {
  const headers = rawData[0].map(String).filter((h) => h.trim() !== "");
  console.log(`\n🏷️  Raw headers (${headers.length} columns):`);
  headers.forEach((h, i) => console.log(`   ${i + 1}. "${h}"`));
}

// Run through our parser
console.log("\n─────────────────────────────────────");
const result = parseExcelBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

console.log(`\n✅ Parsed rows: ${result.rows.length}`);
console.log(`⚠️  Errors: ${result.errors.length}`);
console.log(`📑 Sheet: "${result.sheetName}" | Raw data rows: ${result.totalRawRows}`);

if (result.columnMapping.length > 0) {
  console.log(`\n🔗 Column mapping:`);
  result.columnMapping
    .filter((c) => c.fileColumn.trim() !== "")
    .forEach((c) => {
      const status = c.mappedTo ? `→ ${c.mappedTo} ✅` : `→ (ignored) ❌`;
      console.log(`   "${c.fileColumn}" ${status}`);
    });
}

if (result.errors.length > 0) {
  console.log(`\n⚠️  Errors:`);
  result.errors.forEach((e) => {
    console.log(`   Row ${e.row}: ${e.message}`);
  });
}

if (result.rows.length > 0) {
  console.log(`\n📝 First 5 rows:`);
  result.rows.slice(0, 5).forEach((r) => {
    console.log(`   Row ${r.rowIndex}: SN="${r.serialNumber}" POS="${r.posName}" City="${r.city || ""}" Owner="${r.owner || ""}" Brand="${r.brand || ""}" Type="${r.refrigeratorType || ""}"`);
  });
}
