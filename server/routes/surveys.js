import express from 'express';
import pool from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── GET /api/surveys ─── Барлық сауалнамалар (жалпы)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as author_name,
        (SELECT COUNT(*) FROM "Responses" r WHERE r.survey_id = s.id) as response_count
       FROM "Surveys" s
       LEFT JOIN "Users" u ON s.user_id = u.id
       WHERE s.is_active = true
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Сауалнамаларды алу қатесі' });
  }
});

// ─── GET /api/surveys/stats ─── Негізгі бет статистикасы
router.get('/stats', async (req, res) => {
  try {
    const [usersRes, surveysRes, responsesRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM "Users"'),
      pool.query('SELECT COUNT(*) FROM "Surveys"'),
      pool.query('SELECT COUNT(*) FROM "Responses"'),
    ]);
    res.json({
      users:     parseInt(usersRes.rows[0].count),
      surveys:   parseInt(surveysRes.rows[0].count),
      responses: parseInt(responsesRes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Статистика қатесі' });
  }
});

// ─── GET /api/surveys/my ─── Менің сауалнамаларым (авторизация керек)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM "Responses" r WHERE r.survey_id = s.id) as response_count
       FROM "Surveys" s
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Сауалнамаларды алу қатесі' });
  }
});

// ─── GET /api/surveys/:id ─── Бір сауалнама
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as author_name
       FROM "Surveys" s
       LEFT JOIN "Users" u ON s.user_id = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Сауалнаманы алу қатесі' });
  }
});

// ─── POST /api/surveys ─── Жаңа сауалнама жасау
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Тақырып пен сұрақтар міндетті' });
    }

    const result = await pool.query(
      `INSERT INTO "Surveys" (title, description, questions, user_id, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [title, description || '', JSON.stringify(questions), req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Сауалнама жасау қатесі' });
  }
});

// ─── PUT /api/surveys/:id ─── Сауалнаманы өзгерту
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, questions, is_active } = req.body;

    // Тек өзінің сауалнамасын өзгерте алады
    const check = await pool.query(
      'SELECT user_id FROM "Surveys" WHERE id = $1', [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const result = await pool.query(
      `UPDATE "Surveys"
       SET title = $1, description = $2, questions = $3, is_active = $4
       WHERE id = $5
       RETURNING *`,
      [title, description, JSON.stringify(questions), is_active, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Өзгерту қатесі' });
  }
});

// ─── DELETE /api/surveys/:id ─── Сауалнаманы жою
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT user_id FROM "Surveys" WHERE id = $1', [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Сауалнама табылмады' });
    }
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await pool.query('DELETE FROM "Responses" WHERE survey_id = $1', [req.params.id]);
    await pool.query('DELETE FROM "Comments"  WHERE survey_id = $1', [req.params.id]);
    await pool.query('DELETE FROM "Surveys"   WHERE id = $1',        [req.params.id]);

    res.json({ message: 'Сауалнама жойылды' });
  } catch (err) {
    res.status(500).json({ error: 'Жою қатесі' });
  }
});

export default router;