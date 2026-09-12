const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
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
