import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'oylar',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Change avatarUrl to TEXT to store large Base64 strings
    await client.query(`
      ALTER TABLE "Users" 
      ALTER COLUMN "avatarUrl" TYPE TEXT
    `);
    console.log('✅ avatarUrl column changed to TEXT');
    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
