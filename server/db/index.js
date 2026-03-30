import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'oylar',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Қосылымды тексеру
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL қосылым қатесі:', err.message);
  } else {
    console.log('✅ PostgreSQL — oylar базасына қосылды!');
    release();
  }
});

export default pool;