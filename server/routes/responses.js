import express from 'express';
import { query } from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── POST /api/responses ─── Жауап жіберу (авторизациясыз да болады)
router.post('/', async (req, res) => {
  try {
    const { surveyId, answers } = req.body;

    if (!surveyId || !answers) {
      return res.status(400).json({ success: false, message: 'surveyId мен answers міндетті' });
    }

    const survey = await query(
      'SELECT id FROM "Surveys" WHERE id = $1 AND "isPublished" = true',
      [surveyId]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Сауалнама табылмады немесе жабық' });
    }

    const result = await query(
      `INSERT INTO "Responses" ("surveyId", answers, "createdAt", "updatedAt")
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id`,
      [surveyId, JSON.stringify(answers)]
    );

    res.status(201).json({
      success: true,
      data: { id: result.rows[0].id },
      message: 'Жауабыңыз сақталды!'
    });
  } catch (err) {
    console.error('Submit response error:', err);
    res.status(500).json({ success: false, message: 'Жауапты сақтау қатесі' });
  }
});

// ─── GET /api/responses/:surveyId ─── Барлық жауаптар (тек автор)
router.get('/:surveyId', authMiddleware, async (req, res) => {
  try {
    const survey = await query(
      'SELECT "userId" FROM "Surveys" WHERE id = $1',
      [req.params.surveyId]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Сауалнама табылмады' });
    }
    if (survey.rows[0].userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
    }

    const result = await query(
      'SELECT * FROM "Responses" WHERE "surveyId" = $1 ORDER BY "createdAt" DESC',
      [req.params.surveyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get responses error:', err);
    res.status(500).json({ success: false, message: 'Жауаптарды алу қатесі' });
  }
});

// ─── GET /api/responses/:surveyId/stats ───
router.get('/:surveyId/stats', authMiddleware, async (req, res) => {
  try {
    const survey = await query(
      'SELECT "userId" FROM "Surveys" WHERE id = $1',
      [req.params.surveyId]
    );
    if (survey.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Сауалнама табылмады' });
    }
    if (survey.rows[0].userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
    }

    const responses = await query(
      'SELECT answers, "createdAt" FROM "Responses" WHERE "surveyId" = $1',
      [req.params.surveyId]
    );

    res.json({
      success: true,
      data: {
        total: responses.rows.length,
        responses: responses.rows,
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Статистика алу қатесі' });
  }
});

// ─── DELETE /api/responses/:id ─── (тек admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const response = await query('SELECT id FROM "Responses" WHERE id = $1', [req.params.id]);
    if (response.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Жауап табылмады' });
    }
    await query('DELETE FROM "Responses" WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Жауап жойылды' });
  } catch (err) {
    console.error('Delete response error:', err);
    res.status(500).json({ success: false, message: 'Жою қатесі' });
  }
});

export default router;