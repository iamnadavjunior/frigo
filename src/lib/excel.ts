import * as XLSX from "xlsx";

export interface ExcelRow {
  rowIndex: number;
  cityId?: string;
  posName?: string;
  channel?: string;
  owner?: string;
  phoneNumber?: string;
  state?: string;
  city?: string;
  neighbourhood?: string;
  idNumber?: string;
  streetNo?: string;
  refrigeratorType?: string;
  brand?: string;
  serialNumber?: string;
}

export interface ColumnMapping {
  fileColumn: string;
  mappedTo: keyof ExcelRow | null;
}

export interface ParseResult {
  rows: ExcelRow[];
  errors: { row: number; message: string }[];
  headers: string[];
  columnMapping: ColumnMapping[];
  sheetName: string;
  totalRawRows: number;
}

const HEADER_MAP: Record<string, keyof ExcelRow> = {
  // ── City ID ──
  "id of the city": "cityId",
  "id city": "cityId",
  "city id": "cityId",
  "id de la ville": "cityId",
  "id ville": "cityId",
  "code ville": "cityId",
  "code commune": "cityId",
  // ── POS Name ──
  "name of the pos": "posName",
  "pos name": "posName",
  "name pos": "posName",
  "nom du pos": "posName",
  "nom du pdv": "posName",
  "nom pdv": "posName",
  "pdv": "posName",
  "point de vente": "posName",
  "nom du point de vente": "posName",
  "nom point de vente": "posName",
  "nom du client": "posName",
  "client": "posName",
  "name of the client": "posName",
  // ── Channel ──
  "channel": "channel",
  "canal": "channel",
  "canal de vente": "channel",
  "type de canal": "channel",
  "categorie": "channel",
  "category": "channel",
  // ── Owner ──
  "owner": "owner",
  "proprietaire": "owner",
  "proprietaire du pdv": "owner",
  "nom du proprietaire": "owner",
  "gerant": "owner",
  "responsable": "owner",
  "nom proprietaire": "owner",
  "nom gerant": "owner",
  // ── Phone ──
  "phone number": "phoneNumber",
  "phone": "phoneNumber",
  "telephone": "phoneNumber",
  "tel": "phoneNumber",
  "n tel": "phoneNumber",
  "numero de telephone": "phoneNumber",
  "numero telephone": "phoneNumber",
  "num tel": "phoneNumber",
  "contact": "phoneNumber",
  // ── State / Province ──
  "state": "state",
  "etat": "state",
  "province": "state",
  "region": "state",
  // ── City ──
  "city": "city",
  "ville": "city",
  "commune": "city",
  "nom de la ville": "city",
  "nom commune": "city",
  "nom de la commune": "city",
  "localite": "city",
  // ── Neighbourhood ──
  "neighbourhood": "neighbourhood",
  "neighborhood": "neighbourhood",
  "quartier": "neighbourhood",
  "zone": "neighbourhood",
  "colline": "neighbourhood",
  "colline quartier": "neighbourhood",
  "secteur": "neighbourhood",
  "sous colline": "neighbourhood",
  "sous zone": "neighbourhood",
  // ── ID Number ──
  "id number": "idNumber",
  "id no": "idNumber",
  "id": "idNumber",
  "numero id": "idNumber",
  "n d identification": "idNumber",
  "numero d identification": "idNumber",
  "n identification": "idNumber",
  "no": "idNumber",
  "ref": "idNumber",
  "reference": "idNumber",
  // ── Street ──
  "street & no": "streetNo",
  "street & no.": "streetNo",
  "street": "streetNo",
  "adresse": "streetNo",
  "rue": "streetNo",
  "street no": "streetNo",
  "rue et numero": "streetNo",
  "avenue": "streetNo",
  "rue & n": "streetNo",
  "rue n": "streetNo",
  "avenue & n": "streetNo",
  "avenue n": "streetNo",
  "avenue et n": "streetNo",
  "localisation": "streetNo",
  // ── Refrigerator Type ──
  "refrigerator type": "refrigeratorType",
  "fridge type": "refrigeratorType",
  "type frigo": "refrigeratorType",
  "type de frigo": "refrigeratorType",
  "type": "refrigeratorType",
  "type de refrigerateur": "refrigeratorType",
  "type refrigerateur": "refrigeratorType",
  "type d equipement": "refrigeratorType",
  "modele": "refrigeratorType",
  "model": "refrigeratorType",
  // ── Brand ──
  "brand": "brand",
  "marque": "brand",
  "marque frigo": "brand",
  "marque du frigo": "brand",
  "marque refrigerateur": "brand",
  "fabricant": "brand",
  // ── Serial Number ──
  "fridge serial number": "serialNumber",
  "serial number": "serialNumber",
  "serial no": "serialNumber",
  "serial": "serialNumber",
  "numero de serie": "serialNumber",
  "n serie": "serialNumber",
  "n de serie": "serialNumber",
  "sn": "serialNumber",
  "serie": "serialNumber",
  "numero serie": "serialNumber",
  "num serie": "serialNumber",
  "code barre": "serialNumber",
  "code barres": "serialNumber",
  "barcode": "serialNumber",
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    // Strip accents: é→e, è→e, ê→e, ë→e, à→a, ù→u, ô→o, î→i, ç→c, etc.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Strip special chars: °, ', ', /, &
    .replace(/[°''/&]+/g, " ")
    .replace(/[_\-\.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapHeaders(rawHeaders: string[]): Record<number, keyof ExcelRow> {
  const mapping: Record<number, keyof ExcelRow> = {};
  for (let i = 0; i < rawHeaders.length; i++) {
    const normalized = normalizeHeader(rawHeaders[i]);
    if (HEADER_MAP[normalized]) {
      mapping[i] = HEADER_MAP[normalized];
    }
  }
  return mapping;
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });

  if (workbook.SheetNames.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "Le fichier ne contient aucune feuille. / The file contains no sheets." }], headers: [], columnMapping: [], sheetName: "", totalRawRows: 0 };
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

  if (jsonData.length === 0) {
    return { rows: [], errors: [{ row: 0, message: `La feuille "${sheetName}" est vide. Vérifiez que les données sont dans la première feuille. / Sheet "${sheetName}" is empty.${workbook.SheetNames.length > 1 ? ` Autres feuilles: ${workbook.SheetNames.slice(1).join(", ")}` : ""}` }], headers: [], columnMapping: [], sheetName, totalRawRows: 0 };
  }

  if (jsonData.length < 2) {
    const firstRowCells = jsonData[0].filter((c: unknown) => c && String(c).trim() !== "").length;
    return { rows: [], errors: [{ row: 0, message: `La feuille "${sheetName}" ne contient qu'une seule ligne (${firstRowCells} cellule${firstRowCells !== 1 ? "s" : ""}) traitée comme en-tête. Aucune ligne de données trouvée. / Only 1 row found (headers), no data rows below.` }], headers: jsonData[0].map(String), columnMapping: [], sheetName, totalRawRows: 1 };
  }

  // Auto-detect title row: if row 1 maps very few columns but row 2 maps more, skip the title
  let headerRowIdx = 0;
  const row1Mapping = mapHeaders(jsonData[0].map(String));
  const row1MappedCount = Object.keys(row1Mapping).length;

  if (jsonData.length >= 3 && row1MappedCount <= 1) {
    const row2Mapping = mapHeaders(jsonData[1].map(String));
    const row2MappedCount = Object.keys(row2Mapping).length;
    if (row2MappedCount > row1MappedCount && row2MappedCount >= 3) {
      headerRowIdx = 1; // Row 2 is the real header
    }
  }

  const rawHeaders = jsonData[headerRowIdx].map(String);
  const headerMapping = mapHeaders(rawHeaders);
  const errors: { row: number; message: string }[] = [];
  const rows: ExcelRow[] = [];

  if (headerRowIdx > 0) {
    errors.push({ row: 0, message: `Ligne de titre détectée en ligne 1 — les en-têtes ont été lus à partir de la ligne ${headerRowIdx + 1}. / Title row detected, headers read from row ${headerRowIdx + 1}.` });
  }

  // Build column mapping feedback
  const columnMapping: ColumnMapping[] = rawHeaders.map((h, i) => ({
    fileColumn: h,
    mappedTo: headerMapping[i] || null,
  }));

  const mappedFields = new Set(Object.values(headerMapping));
  const hasSerialCol = mappedFields.has("serialNumber");
  const hasPosCol = mappedFields.has("posName");

  // Warn if critical columns not mapped
  if (!hasSerialCol) {
    errors.push({ row: 0, message: `Colonne "Numéro de série" non détectée. En-têtes attendus : "Numéro de série", "N° série", "Serial Number", "SN". / No serial number column found. Columns: ${rawHeaders.join(", ")}` });
  }
  if (!hasPosCol) {
    errors.push({ row: 0, message: `Colonne "Nom du PDV" non détectée. En-têtes attendus : "Nom du PDV", "Nom du POS", "Point de vente", "Client". / No POS name column found. Columns: ${rawHeaders.join(", ")}` });
  }

  const unmappedCols = columnMapping.filter((c) => !c.mappedTo && c.fileColumn.trim() !== "");
  if (unmappedCols.length > 0) {
    errors.push({ row: 0, message: `${unmappedCols.length} colonne(s) non reconnue(s) et ignorée(s) : ${unmappedCols.map((c) => `"${c.fileColumn}"`).join(", ")}` });
  }

  const totalRawRows = jsonData.length - headerRowIdx - 1; // exclude header and title rows

  for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
    const rawRow = jsonData[i];
    // Skip completely empty rows
    if (rawRow.every((cell: unknown) => !cell || String(cell).trim() === "")) continue;

    const row: ExcelRow = { rowIndex: i + 1 };
    for (const [colIndex, fieldName] of Object.entries(headerMapping)) {
      const value = rawRow[Number(colIndex)];
      if (value !== undefined && value !== null) {
        (row as unknown as Record<string, unknown>)[fieldName] = String(value).trim();
      }
    }

    // Validation with detailed messages
    // Use idNumber as serial number fallback if no serial column exists
    if (!row.serialNumber && row.idNumber && !hasSerialCol) {
      row.serialNumber = row.idNumber;
    }

    if (!row.serialNumber || row.serialNumber.trim() === "") {
      const preview = rawRow.filter((c: unknown) => c && String(c).trim() !== "").slice(0, 3).map(String).join(", ");
      errors.push({ row: i + 1, message: `Numéro de série manquant.${hasSerialCol ? "" : " (Aucune colonne détectée)"} Données : ${preview || "(vide)"}` });
      continue;
    }
    if (!row.posName || row.posName.trim() === "") {
      errors.push({ row: i + 1, message: `Nom du PDV manquant pour le frigo "${row.serialNumber}".${hasPosCol ? "" : " (Aucune colonne PDV détectée)"}` });
      continue;
    }

    rows.push(row);
  }

  return { rows, errors, headers: rawHeaders, columnMapping, sheetName, totalRawRows };
}
