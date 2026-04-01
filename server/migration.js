import { pool } from './db/index.js';

async function migrate() {
  try {
    console.log('Миграция иұқталуда...');
    // Surveys кестене imageUrl қосу
    await pool.query('ALTER TABLE "Surveys" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;');
    console.log('✅ Surveys кестене imageUrl қосылды');
    
    // Users кестенен avatarUrl жою
    await pool.query('ALTER TABLE "Users" DROP COLUMN IF EXISTS "avatarUrl";');
    console.log('✅ Users кестенен avatarUrl жойылды');

    console.log('Миграция аяқталды.');
    process.exit(0);
  } catch (e) {
    console.error('Миграция қатесі:', e);
    process.exit(1);
  }
}

migrate();
