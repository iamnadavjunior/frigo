# KAGABO — Operations Platform

KAGABO is a web-based operational platform for **CABU** and **BRARUDI** in Bujumbura. It digitizes the management of BRARUDI refrigerators across points of sale, including maintenance tracking, repair reporting, cost management, and operational monitoring.

## Architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # REST API endpoints
│   │   ├── auth/           # Login, logout, session
│   │   ├── dashboard/      # Role-based dashboard data
│   │   ├── import/         # Excel parse & import
│   │   ├── interventions/  # CRUD + attachments
│   │   ├── lookups/        # Cities, technicians dropdowns
│   │   ├── pos/            # POS list & detail
│   │   └── refrigerators/  # Fridge list & detail
│   ├── dashboard/          # Dashboard page
│   ├── imports/            # Excel import page (admin)
│   ├── interventions/      # Intervention list, detail, new
│   ├── login/              # Login page
│   ├── pos/                # POS list & detail pages
│   └── refrigerators/      # Fridge detail page
├── components/             # Shared React components
│   ├── auth-provider.tsx   # Auth context & hook
│   └── layout/             # App shell layout
├── lib/                    # Server-side utilities
│   ├── auth.ts             # JWT sign/verify, session
│   ├── db.ts               # Prisma client singleton
│   ├── excel.ts            # Excel file parser
│   └── permissions.ts      # Role-based permission checks
├── middleware.ts            # Auth middleware (route protection)
prisma/
├── schema.prisma           # Database schema
├── seed.ts                 # Sample data seed script
scripts/
└── generate-template.ts    # Generate sample import Excel
```

## Tech Stack

- **Next.js 16** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma ORM**
- **jose** for JWT authentication
- **xlsx** for Excel parsing
- **bcryptjs** for password hashing

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- npm

## Setup Instructions

### 1. Clone and install dependencies

```bash
cd kabos-fridge
npm install
```

### 2. Configure environment

Copy the example env file and update the database URL if needed:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kagabo?schema=public"
JWT_SECRET="change-this-to-a-secure-random-string-in-production"
```

### 3. Create the database

Create a PostgreSQL database called `kagabo`:

```sql
CREATE DATABASE kagabo;
```

### 4. Run migrations

```bash
npm run db:push
```

Or to create a migration:
```bash
npm run db:migrate
```

### 5. Seed sample data

```bash
npm run db:seed
```

### 6. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. (Optional) Generate sample import template

```bash
npx tsx scripts/generate-template.ts
```

This creates `sample-import-template.xlsx` in the project root.

## Demo Login Credentials

| Role        | Email               | Password     |
|-------------|---------------------|------------- |
| CABU Admin  | admin@cabu.bi       | admin123     |
| Technician  | emmanuel@cabu.bi     | tech123      |
| Technician  | pascal@cabu.bi       | tech123      |
| BRARUDI     | monitor@brarudi.bi   | brarudi123   |

## User Roles

### CABU Admin
- Full access to all features
- Manage fridge database, import Excel files
- Create and monitor interventions
- View costs and technician performance
- Review all reports

### Technician
- Submit maintenance and repair reports
- View assigned/recent interventions
- Record issues, work done, parts/costs
- Attach supporting documents

### BRARUDI
- Read-only monitoring access
- View all interventions and history
- Review costs and expense records
- Access digital reports (replaces scanned email workflow)

## Import File Structure

The Excel import expects these columns (flexible header mapping):

| Column               | Required | Description                    |
|----------------------|----------|-------------------------------|
| ID of the City       | No       | External city identifier       |
| Name of the POS      | **Yes**  | Point of sale name             |
| Channel              | No       | ON TRADE / OFF TRADE           |
| Owner                | No       | POS owner name                 |
| Phone Number         | No       | Contact phone                  |
| State                | No       | Province/State                 |
| City                 | No       | City name                      |
| Neighbourhood        | No       | Area/zone                      |
| ID Number            | No       | POS identifier                 |
| Street & No.         | No       | Street address                 |
| Refrigerator Type    | No       | Type of fridge                 |
| Brand                | No       | Manufacturer                   |
| Fridge Serial Number | **Yes**  | Unique serial number           |

The import system:
- Supports .xlsx, .xls, and .csv files
- Normalizes header names (handles French/English variations)
- Trims whitespace and normalizes casing
- Auto-creates missing cities
- Prevents duplicate serial numbers
- Shows row-level validation errors before import
- Provides import results summary

## Key Flows

### Intervention Submission (Technician)
1. Log in → Dashboard
2. Click "Submit New Report" or go to Interventions → New
3. Search and select refrigerator by serial number or POS
4. Fill in type (Maintenance/Repair), date, issue, work done
5. Add cost items (parts, labor, materials)
6. Optionally attach a file
7. Submit

### Data Import (Admin)
1. Log in as admin → Import Data
2. Upload Excel file
3. Preview parsed rows and validation errors
4. Confirm import
5. View results (imported / skipped / errors)

### Monitoring (BRARUDI)
1. Log in → Dashboard with summary stats
2. Browse POS list with filters
3. Click into POS → see fridges and interventions
4. Click into fridge → see full history and costs
5. Click into intervention → see full details and cost breakdown

## Environment Variables

| Variable             | Description                          | Default                                |
|----------------------|--------------------------------------|----------------------------------------|
| DATABASE_URL         | PostgreSQL connection string          | postgresql://postgres:postgres@localhost:5432/kagabo |
| JWT_SECRET           | Secret for JWT token signing          | (must be set)                          |
| NEXT_PUBLIC_APP_NAME | App name shown in UI                  | KAGABO                                 |
| UPLOAD_DIR           | Directory for file uploads            | ./uploads                              |

## Available Scripts

| Command             | Description                     |
|---------------------|---------------------------------|
| `npm run dev`       | Start development server        |
| `npm run build`     | Build for production            |
| `npm run start`     | Start production server         |
| `npm run db:push`   | Push schema to database         |
| `npm run db:migrate`| Create and run migration        |
| `npm run db:seed`   | Seed sample data                |
| `npm run db:studio` | Open Prisma Studio              |
| `npm run db:reset`  | Reset database and reseed       |
