const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const expectedTables = [
  'admin_logs',
  'campaigns',
  'contacts',
  'integrations',
  'landing_sections',
  'messages',
  'plans',
  'site_settings',
  'users'
];

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  family: 4,
  lookup: (hostname, options, callback) => dns.lookup(hostname, { ...options, family: 4 }, callback),
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any($1::text[])
    order by table_name
  `, [expectedTables]))
  .then((result) => {
    const actualTables = result.rows.map((row) => row.table_name);
    const missingTables = expectedTables.filter((table) => !actualTables.includes(table));
    console.log(JSON.stringify({ actualTables, missingTables }));
    if (missingTables.length > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error('Falha ao verificar schema:', error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
