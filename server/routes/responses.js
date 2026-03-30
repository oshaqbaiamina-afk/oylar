import express from 'express';
import pool from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── POST /api/responses ─── Жауап жіберу (авторизациясыз да болады)
router.post('/', async (req, res) => {
  try {
    const { survey_id, answers } = req.body;

    if (!survey_id || !answers) {
      return res.status(400).json({ error: 'survey_id пен answers міндетті' });
    }

    // Сауалнама бар ма?
    const survey = await pool.query(
      'SELECT id FROM "Surveys" WHERE id = $1 AND is_active = true', [survey_id]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады немесе жабық' });
    }

    // Жауапты сақтау
    const result = await pool.query(
      `INSERT INTO "Responses" (survey_id, answers)
       VALUES ($1, $2)
       RETURNING *`,
      [survey_id, JSON.stringify(answers)]
    );

    res.status(201).json({ message: 'Жауабыңыз сақталды!', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Жауапты сақтау қатесі' });
  }
});

// ─── GET /api/responses/:survey_id ─── Сауалнама жауаптары (тек автор)
router.get('/:survey_id', authMiddleware, async (req, res) => {
  try {
    // Сауалнама авторын тексеру
    const survey = await pool.query(
      'SELECT user_id FROM "Surveys" WHERE id = $1', [req.params.survey_id]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }
    if (survey.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const result = await pool.query(
      'SELECT * FROM "Responses" WHERE survey_id = $1 ORDER BY created_at DESC',
      [req.params.survey_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Жауаптарды алу қатесі' });
  }
});

// ─── GET /api/responses/:survey_id/stats ─── Нәтиже статистикасы
router.get('/:survey_id/stats', authMiddleware, async (req, res) => {
  try {
    const survey = await pool.query(
      'SELECT user_id, questions FROM "Surveys" WHERE id = $1',
      [req.params.survey_id]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }
    if (survey.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const responses = await pool.query(
      'SELECT answers, created_at FROM "Responses" WHERE survey_id = $1',
      [req.params.survey_id]
    );

    res.json({
      total:     responses.rows.length,
      responses: responses.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Статистика алу қатесі' });
  }
});

// ─── DELETE /api/responses/:id ─── Жауапты жою
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Тек admin жоя алады' });
    }
    await pool.query('DELETE FROM "Responses" WHERE id = $1', [req.params.id]);
    res.json({ message: 'Жауап жойылды' });
  } catch (err) {
    res.status(500).json({ error: 'Жою қатесі' });
  }
});

export default router;