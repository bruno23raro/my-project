const path = require('path');
const dns = require('dns');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const email = (process.env.ADMIN_EMAIL || 'brunoalmeida23111996@gmail.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'b23b23v1814';
const planSlug = process.env.ADMIN_PLAN || 'unlimited';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL não configurada.');
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	family: 4,
	lookup: (hostname, options, callback) => dns.lookup(hostname, { ...options, family: 4 }, callback),
	ssl: { rejectUnauthorized: false }
});

(async () => {
	const passwordHash = await bcrypt.hash(password, 12);
	const result = await pool.query(`
		insert into public.users (name, email, password_hash, role, plan_id, plan_name, status)
		select 'Administrador', lower($1), $2, 'admin', id, slug, 'active'
		from public.plans where slug = $3
		on conflict (email) do update set
			password_hash = excluded.password_hash,
			role = 'admin',
			plan_id = excluded.plan_id,
			plan_name = excluded.plan_name,
			status = 'active',
			updated_at = now()
		returning email, role, plan_name, status
	`, [email, passwordHash, planSlug]);

	if (!result.rows[0]) throw new Error(`Plano '${planSlug}' não encontrado.`);
	console.log('Admin criado/atualizado:', result.rows[0]);
})()
	.catch((error) => {
		console.error('Falha no seed do admin:', error.message);
		process.exitCode = 1;
	})
	.finally(() => pool.end());
