import express from 'express';
import { query } from '../db/index.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── GET /api/surveys/stats ─── (ВАЖНО: до /:id!)
router.get('/stats', async (req, res) => {
  try {
    const [usersRes, surveysRes, responsesRes] = await Promise.all([
      query('SELECT COUNT(*) FROM "Users"'),
      query('SELECT COUNT(*) FROM "Surveys"'),
      query('SELECT COUNT(*) FROM "Responses"'),
    ]);
    // Фронтенд екі форматты да оқи алсын деп екеуін де қайтарамыз
    const data = {
      users:     parseInt(usersRes.rows[0].count),
      surveys:   parseInt(surveysRes.rows[0].count),
      responses: parseInt(responsesRes.rows[0].count),
    };
    res.json({ success: true, data, ...data }); // index.html s.users үшін spread
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Статистика алу қатесі' });
  }
});

// ─── GET /api/surveys/my ─── (ВАЖНО: до /:id!)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM "Responses" r WHERE r."surveyId" = s.id)::int as response_count
       FROM "Surveys" s
       WHERE s."userId" = $1
       ORDER BY s."createdAt" DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('My surveys error:', err);
    res.status(500).json({ success: false, message: 'Сауалнамаларды алу қатесі' });
  }
});

// ─── GET /api/surveys ───────────────────────────────────────
// dashboard.html /surveys?user=me деп шақырады → /surveys/my-ге redirect немесе тікелей өңдеу
router.get('/', async (req, res) => {
  try {
    // БАГ 4 ТҮЗЕТУ: ?user=me болса → авторизациямен менің сауалнамаларым
    if (req.query.user === 'me') {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'Токен жоқ' });

      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

      const result = await query(
        `SELECT s.*,
          (SELECT COUNT(*) FROM "Responses" r WHERE r."surveyId" = s.id)::int as response_count
         FROM "Surveys" s
         WHERE s."userId" = $1
         ORDER BY s."createdAt" DESC`,
        [decoded.id]
      );
      return res.json({ success: true, data: result.rows });
    }

    // Барлық белсенді сауалнамалар
    const result = await query(
      `SELECT s.id, s.title, s.description, s."isPublished", s."createdAt",
              u.name as author_name, u."avatarUrl" as author_avatar,
              (SELECT COUNT(*) FROM "Responses" r WHERE r."surveyId" = s.id)::int as response_count
       FROM "Surveys" s
       LEFT JOIN "Users" u ON s."userId" = u.id
       WHERE s."isPublished" = true
       ORDER BY s."createdAt" DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get all surveys error:', err);
    res.status(500).json({ success: false, message: 'Сауалнамаларды алу қатесі' });
  }
});

// ─── GET /api/surveys/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.name as author_name, u."avatarUrl" as author_avatar,
              (SELECT COUNT(*) FROM "Responses" r WHERE r."surveyId" = s.id)::int as response_count
       FROM "Surveys" s
       LEFT JOIN "Users" u ON s."userId" = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Сауалнама табылмады' });
    }
    const survey = result.rows[0];
    if (typeof survey.questions === 'string') {
      try { survey.questions = JSON.parse(survey.questions); } catch {}
    }
    res.json({ success: true, data: survey });
  } catch (err) {
    console.error('Get survey error:', err);
    res.status(500).json({ success: false, message: 'Сауалнаманы алу қатесі' });
  }
});

// ─── GET /api/surveys/:id/results ──────────────────────────
router.get('/:id/results', authMiddleware, async (req, res) => {
  try {
    const surveyRes = await query('SELECT * FROM "Surveys" WHERE id = $1', [req.params.id]);
    if (surveyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Сауалнама табылмады' });
    }
    const survey = surveyRes.rows[0];
    if (survey.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
    }

    const responsesRes = await query(
      `SELECT r.answers, r."createdAt", u.name as user_name, u.id as user_id
       FROM "Responses" r
       LEFT JOIN "Users" u ON r."userId" = u.id
       WHERE r."surveyId" = $1
       ORDER BY r."createdAt" DESC`, [req.params.id]
    );
    const responses = responsesRes.rows;
    const total = responses.length;

    let questions = survey.questions;
    if (typeof questions === 'string') { try { questions = JSON.parse(questions); } catch { questions = []; } }
    if (!Array.isArray(questions)) questions = [];

    const analyzedQuestions = questions.map((q, qIdx) => {
      const allAnswers = responses.map((r, rIdx) => {
        let ans = r.answers;
        // Postgres jsonb might already parse it, but if it was double-stringified on insert, we parse it.
        while (typeof ans === 'string') { 
          try { ans = JSON.parse(ans); } catch { break; } 
        }
        if (Array.isArray(ans)) {
          // Safely check a && a.questionIndex since old/invalid answers might have nulls or be primitives
          const found = ans.find(a => a && typeof a === 'object' && a.questionIndex === qIdx);
          return found ? found.answer : undefined;
        }
        return undefined;
      }).filter(a => a !== undefined && a !== '' && a !== null && (!Array.isArray(a) || a.length > 0));

      console.log(`Q${qIdx}: type=${q.type}, answers=${allAnswers.length}, sample=${JSON.stringify(allAnswers.slice(0,2))}`);

      if (q.type === 'text') return { ...q, answers: allAnswers };

      if (q.type === 'rating' || q.type === 'scale') {
        const nums = allAnswers.map(Number).filter(n => !isNaN(n));
        const distribution = [1,2,3,4,5].map(n => nums.filter(v => v === n).length);
        const avg = nums.length ? (nums.reduce((s,n) => s+n, 0) / nums.length).toFixed(1) : null;
        return { ...q, distribution, average: avg, total: nums.length };
      }

      if (q.options && Array.isArray(q.options)) {
        const optionCounts = q.options.map(opt => {
          const count = allAnswers.filter(a => a === opt || (Array.isArray(a) && a.includes(opt))).length;
          console.log(`  opt "${opt}" count: ${count}`);
          return { label: opt, count };
        });
        return { ...q, options: optionCounts, total: allAnswers.length };
      }

      return { ...q, answers: allAnswers };
    });

    res.json({
      success: true,
      data: { totalResponses: total, completionRate: total ? 100 : 0, avgTime: '—', questions: analyzedQuestions, responses: responses }
    });
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ success: false, message: 'Нәтиже алу қатесі' });
  }
});

// ─── POST /api/surveys ─────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, questions, is_active = true } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Атауы міндетті' });
    if (!questions || !Array.isArray(questions) || questions.length === 0)
      return res.status(400).json({ success: false, message: 'Кемінде 1 сұрақ қажет' });

    const result = await query(
      `INSERT INTO "Surveys" ("title", "description", "questions", "userId", "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [title.trim(), description?.trim() || '', JSON.stringify(questions), req.user.id, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Сауалнама жасалды' });
  } catch (err) {
    console.error('Create survey error:', err);
    res.status(500).json({ success: false, message: 'Сауалнама жасау қатесі' });
  }
});

// ─── PUT /api/surveys/:id ──────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, questions, is_active } = req.body;
    const check = await query('SELECT "userId" FROM "Surveys" WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Сауалнама табылмады' });
    if (check.rows[0].userId !== req.user.id) return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });

    const fields = [], values = [];
    let i = 1;
    if (title !== undefined)       { fields.push(`title = $${i++}`);       values.push(title); }
    if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description); }
    if (questions !== undefined)   { fields.push(`questions = $${i++}`);   values.push(JSON.stringify(questions)); }
    if (is_active !== undefined)   { fields.push(`"isPublished" = $${i++}`);   values.push(is_active); }
    
    // Always update updatedAt when modifying
    fields.push(`"updatedAt" = $${i++}`);
    values.push(new Date());

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Өзгертетін өріс жоқ' });

    values.push(req.params.id);
    const result = await query(`UPDATE "Surveys" SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    res.json({ success: true, data: result.rows[0], message: 'Сауалнама жаңартылды' });
  } catch (err) {
    console.error('Update survey error:', err);
    res.status(500).json({ success: false, message: 'Өзгерту қатесі' });
  }
});

// ─── DELETE /api/surveys/:id ───────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const check = await query('SELECT "userId" FROM "Surveys" WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Сауалнама табылмады' });
    if (check.rows[0].userId !== req.user.id) return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });

    await query('BEGIN');
    await query('DELETE FROM "Responses" WHERE "surveyId" = $1', [req.params.id]);
    await query('DELETE FROM "Comments"  WHERE "surveyId" = $1', [req.params.id]);
    await query('DELETE FROM "Surveys"   WHERE id = $1',        [req.params.id]);
    await query('COMMIT');
    res.json({ success: true, message: 'Сауалнама жойылды' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Delete survey error:', err);
    res.status(500).json({ success: false, message: 'Жою қатесі' });
  }
});

export default router;