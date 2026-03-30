import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── POST /api/auth/register ─────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Валидация
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Барлық өрістерді толтырыңыз' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль кемінде 6 символ болуы керек' });
    }

    // Email бар ма тексеру
    const existing = await pool.query(
      'SELECT id FROM "Users" WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Бұл email тіркелген' });
    }

    // Парольді шифрлау
    const passwordHash = await bcrypt.hash(password, 10);

    // Пайдаланушы жасау
    const result = await pool.query(
      'INSERT INTO "Users" (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, 'user']
    );
    const user = result.rows[0];

    // JWT жасау
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Тіркеу кезінде қате шықты' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email мен паролді енгізіңіз' });
    }

    // Пайдаланушыны іздеу
    const result = await pool.query(
      'SELECT * FROM "Users" WHERE email = $1', [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email немесе пароль қате' });
    }

    const user = result.rows[0];

    // Парольді тексеру
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email немесе пароль қате' });
    }

    // JWT жасау
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Кіру кезінде қате шықты' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM "Users" WHERE id = $1', [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Деректерді алу қатесі' });
  }
});

export default router;