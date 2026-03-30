import express from 'express';
import pool from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── GET /api/comments/:survey_id ─── Пікірлерді алу
router.get('/:survey_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as author_name
       FROM "Comments" c
       LEFT JOIN "Users" u ON c.user_id = u.id
       WHERE c.survey_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.survey_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Пікірлерді алу қатесі' });
  }
});

// ─── POST /api/comments ─── Пікір қалдыру
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { survey_id, text } = req.body;

    if (!survey_id || !text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Пікір мәтінін жазыңыз' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Пікір 1000 символдан аспауы керек' });
    }

    // Сауалнама бар ма тексеру
    const survey = await pool.query(
      'SELECT id FROM "Surveys" WHERE id = $1', [survey_id]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }

    const result = await pool.query(
      `INSERT INTO "Comments" (survey_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [survey_id, req.user.id, text.trim()]
    );

    // Автор атын қайтару
    const comment = await pool.query(
      `SELECT c.*, u.name as author_name
       FROM "Comments" c
       LEFT JOIN "Users" u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(comment.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Пікір жіберу қатесі' });
  }
});

// ─── PUT /api/comments/:id ─── Пікірді өзгерту
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Пікір мәтіні бос болмауы керек' });
    }

    const check = await pool.query(
      'SELECT user_id FROM "Comments" WHERE id = $1', [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пікір табылмады' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const result = await pool.query(
      'UPDATE "Comments" SET text = $1 WHERE id = $2 RETURNING *',
      [text.trim(), req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Өзгерту қатесі' });
  }
});

// ─── DELETE /api/comments/:id ─── Пікірді жою
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT user_id FROM "Comments" WHERE id = $1', [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пікір табылмады' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await pool.query('DELETE FROM "Comments" WHERE id = $1', [req.params.id]);
    res.json({ message: 'Пікір жойылды' });
  } catch (err) {
    res.status(500).json({ error: 'Жою қатесі' });
  }
});

export default router;