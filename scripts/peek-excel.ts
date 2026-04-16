import * as XLSX from "xlsx";
import { readFileSync } from "fs";

const buffer = readFileSync("doc/Ngagara.xlsx");
const workbook = XLSX.read(buffer, { type: "buffer" });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

// Show first 5 rows with all columns
for (let i = 0; i < Math.min(5, rawData.length); i++) {
  const cells = rawData[i].map((c, j) => `  col${j}: "${c}"`).filter((c) => !c.endsWith('""'));
  console.log(`\nRow ${i + 1} (${cells.length} non-empty cells):`);
  cells.forEach((c) => console.log(c));
}
