require('dotenv').config();
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT email, role, active, \"passwordHash\" IS NOT NULL as has_hash FROM users WHERE email IN ('emmanuel@cabu.bi','pascal@cabu.bi')");
  console.table(res.rows);
  await client.end();
}).catch(e => { console.error(e); process.exit(1); });
