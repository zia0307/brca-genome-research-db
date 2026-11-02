// Creates the two app users with bcrypt-hashed passwords taken from env vars (never hard-coded).
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  const { SEED_ADMIN_PASSWORD: a, SEED_RESEARCHER_PASSWORD: r } = process.env;
  if (!a || !r) throw new Error('Set SEED_ADMIN_PASSWORD and SEED_RESEARCHER_PASSWORD in .env');
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: process.env.MYSQL_PORT, user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
  const users = [['admin', a, 'admin'], ['researcher', r, 'researcher']];
  for (const [u, p, role] of users) {
    const hash = await bcrypt.hash(p, 10);
    await db.query(
      'INSERT INTO AppUser (username, password_hash, role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)',
      [u, hash, role]);
  }
  console.log('Users seeded: admin, researcher');
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });
