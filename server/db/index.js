import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'oylar',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,  // только из .env, нет дефолта!
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL қосылым қатесі:', err.message);
  } else {
    console.log('✅ PostgreSQL — oylar деректер қорына сәтті қосылды!');
    release();
  }
});

export const query = (text, params) => pool.query(text, params);
export { pool };
export default { query, pool };