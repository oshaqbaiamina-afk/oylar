import express from 'express';
import { query } from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── GET /api/comments/:surveyId ─── Пікірлерді алу
router.get('/:surveyId', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.name as author_name
       FROM "Comments" c
       LEFT JOIN "Users" u ON c."userId" = u.id
       WHERE c."surveyId" = $1
       ORDER BY c."createdAt" DESC`,
      [req.params.surveyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Пікірлерді алу қатесі' });
  }
});

// ─── POST /api/comments ─── Пікір қалдыру
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { surveyId, text } = req.body;

    if (!surveyId || !text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Пікір мәтінін жазыңыз' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Пікір 1000 символдан аспауы керек' });
    }

    // Сауалнама бар ма тексеру
    const survey = await query(
      'SELECT id FROM "Surveys" WHERE id = $1', [surveyId]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }

    const result = await query(
      `INSERT INTO "Comments" ("surveyId", "userId", text, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [surveyId, req.user.id, text.trim()]
    );

    // Автор атын қайтару
    const comment = await query(
      `SELECT c.*, u.name as author_name
       FROM "Comments" c
       LEFT JOIN "Users" u ON c."userId" = u.id
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

    const check = await query(
      'SELECT user_id FROM "Comments" WHERE id = $1', [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пікір табылмады' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const result = await query(
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
    const check = await query(
      'SELECT user_id FROM "Comments" WHERE id = $1', [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Пікір табылмады' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await query('DELETE FROM "Comments" WHERE id = $1', [req.params.id]);
    res.json({ message: 'Пікір жойылды' });
  } catch (err) {
    res.status(500).json({ error: 'Жою қатесі' });
  }
});

export default router;