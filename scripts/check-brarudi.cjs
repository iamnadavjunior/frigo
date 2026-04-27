require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT email, username, \"fullName\", role, active, \"passwordHash\" FROM users WHERE role IN ('BRARUDI_DELEGUE','BRARUDI_ADMIN')");
  for (const row of res.rows) {
    const match = await bcrypt.compare('brarudi123', row.passwordHash);
    console.log(`${row.email}: brarudi123 matches = ${match}`);
  }
  await client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
