// Standalone DB init script — creates all tables and enums using raw SQL.
// No Prisma CLI needed. Runs with just `node` and `pg`.
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database.');

  // Create enums
  const enums = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN CREATE TYPE "Role" AS ENUM ('CABU_ADMIN','TECHNICIAN','BRARUDI_DELEGUE','BRARUDI_ADMIN'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterventionType') THEN CREATE TYPE "InterventionType" AS ENUM ('MAINTENANCE','REPAIR'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterventionStatus') THEN CREATE TYPE "InterventionStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FridgeStatus') THEN CREATE TYPE "FridgeStatus" AS ENUM ('ACTIVE','INACTIVE','UNDER_REPAIR'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceRequestType') THEN CREATE TYPE "ServiceRequestType" AS ENUM ('REPAIR','MAINTENANCE'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceRequestUrgency') THEN CREATE TYPE "ServiceRequestUrgency" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceRequestStatus') THEN CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING','ASSIGNED','IN_PROGRESS','RESOLVED','CANCELLED'); END IF; END $$`,
  ];

  for (const sql of enums) {
    await client.query(sql);
  }
  console.log('Enums created.');

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "fullName" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" "Role" NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "users_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "cities" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "externalId" TEXT,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "cities_externalId_key" ON "cities"("externalId");
    CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_key" ON "cities"("name");
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "pos" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "cityId" TEXT NOT NULL,
      "posName" TEXT NOT NULL,
      "channel" TEXT,
      "owner" TEXT,
      "phoneNumber" TEXT,
      "state" TEXT,
      "neighbourhood" TEXT,
      "idNumber" TEXT,
      "streetNo" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pos_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "pos_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "refrigerators" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "posId" TEXT NOT NULL,
      "refrigeratorType" TEXT,
      "brand" TEXT,
      "serialNumber" TEXT NOT NULL,
      "status" "FridgeStatus" NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "refrigerators_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "refrigerators_posId_fkey" FOREIGN KEY ("posId") REFERENCES "pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "refrigerators_serialNumber_key" ON "refrigerators"("serialNumber");
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "interventions" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "refrigeratorId" TEXT NOT NULL,
      "technicianId" TEXT NOT NULL,
      "serviceRequestId" TEXT,
      "type" "InterventionType" NOT NULL,
      "interventionDate" TIMESTAMP(3) NOT NULL,
      "issueDescription" TEXT,
      "workDone" TEXT,
      "status" "InterventionStatus" NOT NULL DEFAULT 'PENDING',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "interventions_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "interventions_refrigeratorId_fkey" FOREIGN KEY ("refrigeratorId") REFERENCES "refrigerators"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "interventions_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "intervention_cost_items" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "interventionId" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "intervention_cost_items_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "intervention_cost_items_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "service_requests" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "refrigeratorId" TEXT NOT NULL,
      "posId" TEXT NOT NULL,
      "createdById" TEXT,
      "type" "ServiceRequestType" NOT NULL,
      "urgency" "ServiceRequestUrgency" NOT NULL DEFAULT 'MEDIUM',
      "description" TEXT NOT NULL,
      "contactName" TEXT,
      "contactPhone" TEXT,
      "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
      "assignedToId" TEXT,
      "assignedAt" TIMESTAMP(3),
      "resolvedAt" TIMESTAMP(3),
      "adminNotes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "service_requests_refrigeratorId_fkey" FOREIGN KEY ("refrigeratorId") REFERENCES "refrigerators"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "service_requests_posId_fkey" FOREIGN KEY ("posId") REFERENCES "pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "service_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "service_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  // Add FK for interventions -> service_requests (created after service_requests table)
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interventions_serviceRequestId_fkey') THEN
        ALTER TABLE "interventions" ADD CONSTRAINT "interventions_serviceRequestId_fkey"
          FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log('Tables created.');

  // Seed admin user
  const hash = await bcrypt.hash('BujaFrigori@2026', 10);
  await client.query(`
    INSERT INTO "users" ("id", "fullName", "email", "passwordHash", "role", "active", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'CabuFrigo', 'cabufrigo@cabu.bi', $1, 'ADMIN', true, NOW(), NOW())
    ON CONFLICT ("email") DO NOTHING
  `, [hash]);

  const adminHash = await bcrypt.hash('admin123', 10);
  await client.query(`
    INSERT INTO "users" ("id", "fullName", "email", "passwordHash", "role", "active", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Jean-Pierre Ndayishimiye', 'admin@cabu.bi', $1, 'ADMIN', true, NOW(), NOW())
    ON CONFLICT ("email") DO NOTHING
  `, [adminHash]);

  const techHash = await bcrypt.hash('tech123', 10);
  await client.query(`
    INSERT INTO "users" ("id", "fullName", "email", "passwordHash", "role", "active", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Emmanuel Niyonzima', 'emmanuel@cabu.bi', $1, 'TECHNICIAN', true, NOW(), NOW())
    ON CONFLICT ("email") DO NOTHING
  `, [techHash]);
  await client.query(`
    INSERT INTO "users" ("id", "fullName", "email", "passwordHash", "role", "active", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Pascal Hakizimana', 'pascal@cabu.bi', $1, 'TECHNICIAN', true, NOW(), NOW())
    ON CONFLICT ("email") DO NOTHING
  `, [techHash]);

  const brarudiHash = await bcrypt.hash('brarudi123', 10);
  await client.query(`
    INSERT INTO "users" ("id", "fullName", "email", "passwordHash", "role", "active", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'Marie Irakoze', 'monitor@brarudi.bi', $1, 'BRARUDI', true, NOW(), NOW())
    ON CONFLICT ("email") DO NOTHING
  `, [brarudiHash]);

  console.log('Users seeded.');

  await client.end();
  console.log('Database initialization complete.');
}

main().catch((err) => {
  console.error('DB INIT ERROR:', err);
  process.exit(1);
});
