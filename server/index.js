import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes     from './routes/auth.js';
import surveyRoutes   from './routes/surveys.js';
import responseRoutes from './routes/responses.js';
import commentRoutes  from './routes/comments.js';
import errorHandler   from './middleware/errorHandler.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ──────────────────────────────────────────────
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

// ─── ERROR HANDLER ────────────────────────────────────────
app.use(errorHandler);

// ─── START ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Oylar сервері іске қосылды: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health\n`);
});