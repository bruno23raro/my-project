const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  family: 4,
  lookup: (hostname, options, callback) => dns.lookup(hostname, { ...options, family: 4 }, callback),
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query('SELECT NOW() AS now'))
  .then((result) => {
    console.log('Conexao OK:', result.rows[0]);
  })
  .catch((error) => {
    console.error('Falha na conexao:', error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
