require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT email, \"passwordHash\" FROM users WHERE email IN ('emmanuel@cabu.bi','pascal@cabu.bi')");
  for (const row of res.rows) {
    const match = await bcrypt.compare('tech123', row.passwordHash);
    console.log(`${row.email}: tech123 matches = ${match}`);
  }
  await client.end();
}).catch(e => { console.error(e); process.exit(1); });
