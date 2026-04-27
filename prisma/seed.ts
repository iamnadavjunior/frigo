import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const cabuAdminPassword = await bcrypt.hash("BujaFrigori@2026", 10);
  const techPassword = await bcrypt.hash("tech123", 10);
  const brarudiPassword = await bcrypt.hash("brarudi123", 10);

  await prisma.user.upsert({
    where: { email: "cabufrigo@cabu.bi" },
    update: { username: "cabufrigo" },
    create: {
      fullName: "CabuFrigo",
      username: "cabufrigo",
      email: "cabufrigo@cabu.bi",
      passwordHash: cabuAdminPassword,
      role: "CABU_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@cabu.bi" },
    update: { username: "admin" },
    create: {
      fullName: "Jean-Pierre Ndayishimiye",
      username: "admin",
      email: "admin@cabu.bi",
      passwordHash: adminPassword,
      role: "CABU_ADMIN",
    },
  });

  const tech1 = await prisma.user.upsert({
    where: { email: "emmanuel@cabu.bi" },
    update: { username: "emmanuel" },
    create: {
      fullName: "Emmanuel Niyonzima",
      username: "emmanuel",
      email: "emmanuel@cabu.bi",
      passwordHash: techPassword,
      role: "TECHNICIAN",
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { email: "pascal@cabu.bi" },
    update: { username: "pascal" },
    create: {
      fullName: "Pascal Hakizimana",
      username: "pascal",
      email: "pascal@cabu.bi",
      passwordHash: techPassword,
      role: "TECHNICIAN",
    },
  });

  await prisma.user.upsert({
    where: { email: "monitor@brarudi.bi" },
    update: { username: "marie" },
    create: {
      fullName: "Marie Irakoze",
      username: "marie",
      email: "monitor@brarudi.bi",
      passwordHash: brarudiPassword,
      role: "BRARUDI_DELEGUE",
    },
  });

  console.log("Users created");

  // Create cities (16 communes)
  const cityNames = [
    "Ngagara", "Kamenge", "Kinama", "Cibitoke",
    "Buterere", "Mutimbuzi", "Gihosha", "Rohero",
    "Villa Kiriri", "Buyenzi", "Nyakabiga", "Asiatique",
    "Kinindo", "Bwiza", "Musaga", "Kanyosha",
  ];

  const cityRecords: Record<string, { id: string }> = {};
  for (const name of cityNames) {
    cityRecords[name] = await prisma.city.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Cities created");

  // Create POS
  const pos1 = await prisma.pos.create({
    data: {
      cityId: cityRecords["Rohero"].id,
      posName: "Bar Restaurant Le Palmier",
      channel: "ON TRADE",
      owner: "Niyongabo Pierre",
      phoneNumber: "+257 79 123 456",
      state: "Bujumbura",
      neighbourhood: "Rohero",
      idNumber: "POS-001",
      streetNo: "Avenue de la Liberté 45",
    },
  });

  const pos2 = await prisma.pos.create({
    data: {
      cityId: cityRecords["Bwiza"].id,
      posName: "Chez Mama Deo",
      channel: "OFF TRADE",
      owner: "Ndayisaba Deo",
      phoneNumber: "+257 79 234 567",
      state: "Bujumbura",
      neighbourhood: "Bwiza",
      idNumber: "POS-002",
      streetNo: "Rue du Marché 12",
    },
  });

  const pos3 = await prisma.pos.create({
    data: {
      cityId: cityRecords["Nyakabiga"].id,
      posName: "Club VIP Lounge",
      channel: "ON TRADE",
      owner: "Uwimana Claudine",
      phoneNumber: "+257 79 345 678",
      state: "Bujumbura",
      neighbourhood: "Nyakabiga",
      idNumber: "POS-003",
      streetNo: "Boulevard du 28 Novembre 8",
    },
  });

  const pos4 = await prisma.pos.create({
    data: {
      cityId: cityRecords["Ngagara"].id,
      posName: "Boutique Central Ngagara",
      channel: "OFF TRADE",
      owner: "Bizimana Jean",
      phoneNumber: "+257 79 456 789",
      state: "Bujumbura",
      neighbourhood: "Ngagara",
      idNumber: "POS-004",
      streetNo: "Rue Principale 3",
    },
  });

  console.log("POS created");

  // Create refrigerators
  const fridge1 = await prisma.refrigerator.create({
    data: {
      posId: pos1.id,
      refrigeratorType: "Vertical Cooler",
      brand: "Vestfrost",
      serialNumber: "VF-2024-001",
    },
  });

  const fridge2 = await prisma.refrigerator.create({
    data: {
      posId: pos1.id,
      refrigeratorType: "Chest Cooler",
      brand: "Haier",
      serialNumber: "HA-2024-002",
    },
  });

  const fridge3 = await prisma.refrigerator.create({
    data: {
      posId: pos2.id,
      refrigeratorType: "Vertical Cooler",
      brand: "Vestfrost",
      serialNumber: "VF-2024-003",
    },
  });

  const fridge4 = await prisma.refrigerator.create({
    data: {
      posId: pos3.id,
      refrigeratorType: "Double Door Cooler",
      brand: "Metalfrio",
      serialNumber: "MF-2024-004",
    },
  });

  const fridge5 = await prisma.refrigerator.create({
    data: {
      posId: pos4.id,
      refrigeratorType: "Vertical Cooler",
      brand: "Vestfrost",
      serialNumber: "VF-2024-005",
    },
  });

  console.log("Refrigerators created");

  // Create interventions with cost items
  await prisma.intervention.create({
    data: {
      refrigeratorId: fridge1.id,
      technicianId: tech1.id,
      type: "MAINTENANCE",
      interventionDate: new Date("2026-02-15"),
      issueDescription: "Routine quarterly maintenance check",
      workDone: "Cleaned condenser coils, checked thermostat, verified door seal integrity",
      status: "COMPLETED",
      notes: "Fridge in good condition overall",
      costItems: {
        create: [
          { itemName: "Door gasket seal", quantity: 1, unitCost: 15000, totalCost: 15000 },
          { itemName: "Cleaning supplies", quantity: 1, unitCost: 5000, totalCost: 5000 },
        ],
      },
    },
  });

  await prisma.intervention.create({
    data: {
      refrigeratorId: fridge3.id,
      technicianId: tech1.id,
      type: "REPAIR",
      interventionDate: new Date("2026-03-01"),
      issueDescription: "Fridge not cooling properly. Temperature above 10°C",
      workDone: "Replaced faulty compressor relay and recharged refrigerant",
      status: "COMPLETED",
      costItems: {
        create: [
          { itemName: "Compressor relay", quantity: 1, unitCost: 35000, totalCost: 35000 },
          { itemName: "Refrigerant (R134a)", quantity: 2, unitCost: 12000, totalCost: 24000 },
          { itemName: "Labor", quantity: 1, unitCost: 20000, totalCost: 20000 },
        ],
      },
    },
  });

  await prisma.intervention.create({
    data: {
      refrigeratorId: fridge4.id,
      technicianId: tech2.id,
      type: "MAINTENANCE",
      interventionDate: new Date("2026-03-10"),
      issueDescription: "Scheduled maintenance visit",
      workDone: "General inspection, cleaned filters, checked electrical connections",
      status: "COMPLETED",
      costItems: {
        create: [
          { itemName: "Air filter", quantity: 2, unitCost: 8000, totalCost: 16000 },
        ],
      },
    },
  });

  await prisma.intervention.create({
    data: {
      refrigeratorId: fridge2.id,
      technicianId: tech2.id,
      type: "REPAIR",
      interventionDate: new Date("2026-03-20"),
      issueDescription: "Water leaking from bottom of unit",
      workDone: "Unclogged drain tube, replaced drain pan",
      status: "IN_PROGRESS",
      notes: "Waiting for new drain pan to arrive",
      costItems: {
        create: [
          { itemName: "Drain pan", quantity: 1, unitCost: 18000, totalCost: 18000 },
        ],
      },
    },
  });

  await prisma.intervention.create({
    data: {
      refrigeratorId: fridge5.id,
      technicianId: tech1.id,
      type: "MAINTENANCE",
      interventionDate: new Date("2026-04-01"),
      issueDescription: "First quarterly check for new installation",
      workDone: "Full inspection completed. All systems normal.",
      status: "COMPLETED",
    },
  });

  console.log("Interventions created");
  console.log("\nSeed completed successfully!");
  console.log("\n--- Demo Login Credentials ---");
  console.log("Admin:      admin@cabu.bi / admin123");
  console.log("Technician: emmanuel@cabu.bi / tech123");
  console.log("Technician: pascal@cabu.bi / tech123");
  console.log("BRARUDI:    monitor@brarudi.bi / brarudi123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
