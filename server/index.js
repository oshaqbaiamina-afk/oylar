import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Жүктеулер қалтасы жоқ болса жасайды
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

import authRoutes     from './routes/auth.js';
import surveyRoutes   from './routes/surveys.js';
import responseRoutes from './routes/responses.js';
import commentRoutes  from './routes/comments.js';
import errorHandler   from './middleware/errorHandler.js';

const app  = express();
const PORT = 9999;

// ─── CORS — барлық localhost порттарға рұқсат ─────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5500',  // VS Code Live Server
  ],
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── СТАТИКАЛЫҚ ФАЙЛДАР (Суреттер) ───────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── ROUTES ───────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/surveys',   surveyRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/comments',  commentRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Бет табылмады' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n Oylar сервері іске қосылды: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
