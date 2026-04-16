// Script to generate a sample Excel import template
import * as XLSX from "xlsx";

const sampleData = [
  {
    "ID of the City": "ROH",
    "Name of the POS": "Bar Restaurant Le Palmier",
    "Channel": "ON TRADE",
    "Owner": "Niyongabo Pierre",
    "Phone Number": "+257 79 123 456",
    "State": "Bujumbura",
    "City": "Rohero",
    "Neighbourhood": "Rohero",
    "ID Number": "POS-001",
    "Street & No.": "Avenue de la Liberté 45",
    "Refrigerator Type": "Vertical Cooler",
    "Brand": "Vestfrost",
    "Fridge Serial Number": "VF-2024-SAMPLE-001",
  },
  {
    "ID of the City": "ROH",
    "Name of the POS": "Bar Restaurant Le Palmier",
    "Channel": "ON TRADE",
    "Owner": "Niyongabo Pierre",
    "Phone Number": "+257 79 123 456",
    "State": "Bujumbura",
    "City": "Rohero",
    "Neighbourhood": "Rohero",
    "ID Number": "POS-001",
    "Street & No.": "Avenue de la Liberté 45",
    "Refrigerator Type": "Chest Cooler",
    "Brand": "Haier",
    "Fridge Serial Number": "HA-2024-SAMPLE-002",
  },
  {
    "ID of the City": "BWZ",
    "Name of the POS": "Chez Mama Deo",
    "Channel": "OFF TRADE",
    "Owner": "Ndayisaba Deo",
    "Phone Number": "+257 79 234 567",
    "State": "Bujumbura",
    "City": "Bwiza",
    "Neighbourhood": "Bwiza",
    "ID Number": "POS-002",
    "Street & No.": "Rue du Marché 12",
    "Refrigerator Type": "Vertical Cooler",
    "Brand": "Vestfrost",
    "Fridge Serial Number": "VF-2024-SAMPLE-003",
  },
];

const ws = XLSX.utils.json_to_sheet(sampleData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Refrigerators");

// Set column widths
ws["!cols"] = [
  { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 20 },
  { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
  { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 12 },
  { wch: 22 },
];

XLSX.writeFile(wb, "sample-import-template.xlsx");
console.log("Sample import template created: sample-import-template.xlsx");
