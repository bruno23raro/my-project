const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const migrationDir = path.join(__dirname, '..', 'migrations');
const migrationFiles = fs.readdirSync(migrationDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  family: 4,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  try {
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query(sql);
      console.log(`Migracao aplicada: ${file}`);
    }
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error('Falha na migracao:', error.message);
  process.exit(1);
});
