import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── POST /api/auth/register ───────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Барлық өрістерді толтырыңыз: аты, email, құпия сөз'
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Құпия сөз кемінде 8 символ болуы керек'
      });
    }

    const exists = await query('SELECT id FROM "Users" WHERE email = $1', [email.toLowerCase().trim()]);
    if (exists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Бұл email тіркеліп қойған'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO "Users" (name, email, password, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, email, "createdAt", "updatedAt"`,
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Фронтенд user + token күтеді
    return res.status(201).json({
      success: true,
      data: { user, token },
      message: 'Тіркелу сәтті аяқталды'
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Сервер қатесі' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email мен құпия сөзді енгізіңіз'
      });
    }

    const result = await query('SELECT * FROM "Users" WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Мұндай пайдаланушы табылмады'
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Құпия сөз дұрыс емес'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Құпия сөзді алып тастап пайдаланушыны қайтару
    const { password: _pw, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: { user: userWithoutPassword, token },
      message: 'Қош келдіңіз!'
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Сервер қатесі' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, bio, "createdAt"
       FROM "Users" WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ success: false, message: 'Сервер қатесі' });
  }
});

// ─── PUT /api/auth/profile ─── Профиль жаңарту (PUT + PATCH екеуі де жұмыс істейді)
const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Аты міндетті' });
    }

    const result = await query(
      `UPDATE "Users"
       SET name = $1, bio = $2
       WHERE id = $3
       RETURNING id, name, email, bio, "createdAt"`,
      [name.trim(), bio?.trim() || null, req.user.id]
    );

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Профиль сәтті жаңартылды'
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Сервер қатесі' });
  }
};
router.put('/profile',   authMiddleware, updateProfile);
router.patch('/profile', authMiddleware, updateProfile);




// ─── POST /api/auth/change-password ────────────────────────
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Екі құпия сөзді де енгізіңіз' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Жаңа құпия сөз кемінде 8 символ болуы керек' });
    }

    const result = await query('SELECT password FROM "Users" WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(oldPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Ағымдағы құпия сөз дұрыс емес' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE "Users" SET password = $1 WHERE id = $2', [newHash, req.user.id]);

    return res.json({ success: true, message: 'Құпия сөз сәтті өзгертілді' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Сервер қатесі' });
  }
});

// ─── DELETE /api/auth/account ───────────────────────────────
// dashboard.html: api('/auth/delete', { method: 'DELETE' })
router.delete('/account', authMiddleware, deleteAccount);
router.delete('/delete',  authMiddleware, deleteAccount);

async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    await query('BEGIN');
    await query(`DELETE FROM "Responses" WHERE survey_id IN (SELECT id FROM "Surveys" WHERE user_id = $1)`, [userId]);
    await query(`DELETE FROM "Comments"  WHERE user_id = $1 OR survey_id IN (SELECT id FROM "Surveys" WHERE user_id = $1)`, [userId]);
    await query('DELETE FROM "Surveys" WHERE user_id = $1', [userId]);
    await query('DELETE FROM "Users"   WHERE id = $1',      [userId]);
    await query('COMMIT');
    return res.json({ success: true, message: 'Аккаунт жойылды' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Delete account error:', err);
    return res.status(500).json({ success: false, message: 'Жою қатесі' });
  }
}

export default router;