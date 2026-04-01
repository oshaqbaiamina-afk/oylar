// ─── Oylar API — Mocha/Chai тесттері ───────────────────────
// Іске қосу: npm test
// Талап: сервер http://localhost:9999 жұмыс істеп тұруы керек

import { strict as assert } from 'assert';
import { describe, it, before } from 'mocha';

const BASE = 'http://localhost:9999/api';

// ─── Тест деректері ────────────────────────────────────────
const testUser = {
  name:     'Тест Пайдаланушы',
  email:    `test_${Date.now()}@oylar.kz`,
  password: 'Test12345!',
};

let authToken   = null;
let surveyId    = null;
let commentId   = null;

// ─── Утилита: fetch + JSON ─────────────────────────────────
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ══════════════════════════════════════════════════════════
// 1. HEALTH CHECK
// ══════════════════════════════════════════════════════════
describe('🟢 Health Check', () => {
  it('сервер жұмыс істейді (200 қайтарады)', async () => {
    const { status, body } = await api('/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });
});

// ══════════════════════════════════════════════════════════
// 2. АУТЕНТИФИКАЦИЯ
// ══════════════════════════════════════════════════════════
describe('🔐 Аутентификация', () => {

  it('жаңа пайдаланушы тіркеледі', async () => {
    const { status, body } = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser),
    });
    assert.equal(status, 201, `Тіркелу сәтсіз: ${body.message}`);
    assert.ok(body.success, 'success: true болуы керек');
    assert.ok(body.data?.token, 'token болуы керек');
    assert.ok(body.data?.user?.email, 'user.email болуы керек');

    authToken = body.data.token; // кейінгі тесттер үшін сақтаймыз
  });

  it('бірдей email қайта тіркелмейді (400)', async () => {
    const { status, body } = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser),
    });
    assert.equal(status, 400);
    assert.ok(!body.success);
  });

  it('қысқа құпия сөз қабылданбайды (400)', async () => {
    const { status } = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'А', email: 'short@t.kz', password: '123' }),
    });
    assert.equal(status, 400);
  });

  it('дұрыс email/пароль → кіреміз', async () => {
    const { status, body } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    assert.equal(status, 200, `Кіру сәтсіз: ${body.message}`);
    assert.ok(body.data?.token, 'token болуы керек');

    authToken = body.data.token;
  });

  it('қате пароль → 400', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testUser.email, password: 'WrongPass!' }),
    });
    assert.equal(status, 400);
  });

  it('токенсіз /auth/me → 401', async () => {
    const res = await fetch(`${BASE}/auth/me`);
    assert.equal(res.status, 401);
  });

  it('токенмен /auth/me → пайдаланушы деректері', async () => {
    const { status, body } = await api('/auth/me');
    assert.equal(status, 200);
    assert.equal(body.data.email, testUser.email);
  });
});

// ══════════════════════════════════════════════════════════
// 3. САУАЛНАМАЛАР
// ══════════════════════════════════════════════════════════
describe('📊 Сауалнамалар (Surveys)', () => {

  it('статистика алынады (GET /surveys/stats)', async () => {
    const { status, body } = await api('/surveys/stats');
    assert.equal(status, 200);
    assert.ok(body.success);
    assert.ok(typeof body.data.surveys === 'number', 'surveys саны сан болуы керек');
  });

  it('жаңа сауалнама жасалады', async () => {
    const { status, body } = await api('/surveys', {
      method: 'POST',
      body: JSON.stringify({
        title:       'Тест сауалнамасы',
        description: 'Mocha тесті арқылы жасалды',
        questions: [
          { text: 'Бірінші сұрақ?', type: 'radio',  options: ['Иә', 'Жоқ'] },
          { text: 'Бағаңыз?',       type: 'rating'                          },
          { text: 'Пікіріңіз?',     type: 'text'                            },
        ],
        is_active: true,
      }),
    });
    assert.equal(status, 201, `Жасау сәтсіз: ${body.message}`);
    assert.ok(body.data?.id, 'id болуы керек');
    surveyId = body.data.id;
  });

  it('сауалнамасыз жасау → 400', async () => {
    const { status } = await api('/surveys', {
      method: 'POST',
      body: JSON.stringify({ title: '', questions: [] }),
    });
    assert.equal(status, 400);
  });

  it('барлық белсенді сауалнамалар алынады', async () => {
    const { status, body } = await api('/surveys');
    assert.equal(status, 200);
    assert.ok(body.success);
    assert.ok(Array.isArray(body.data), 'data массив болуы керек');
  });

  it('менің сауалнамаларым алынады (GET /surveys/my)', async () => {
    const { status, body } = await api('/surveys/my');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    const found = body.data.find(s => s.id === surveyId);
    assert.ok(found, 'жасалған сауалнама тізімде болуы керек');
  });

  it('бір сауалнама алынады (GET /surveys/:id)', async () => {
    const { status, body } = await api(`/surveys/${surveyId}`);
    assert.equal(status, 200);
    assert.equal(body.data.id, surveyId);
    assert.ok(Array.isArray(body.data.questions), 'questions массив болуы керек');
  });

  it('жоқ сауалнама → 404', async () => {
    const { status } = await api('/surveys/999999');
    assert.equal(status, 404);
  });

  it('сауалнама жаңартылады (PUT /surveys/:id)', async () => {
    const { status, body } = await api(`/surveys/${surveyId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Жаңартылған тест', is_active: true }),
    });
    assert.equal(status, 200);
    assert.equal(body.data.title, 'Жаңартылған тест');
  });
});

// ══════════════════════════════════════════════════════════
// 4. ЖАУАПТАР (Responses)
// ══════════════════════════════════════════════════════════
describe('✅ Жауаптар (Responses)', () => {

  it('жауап жіберіледі (POST /responses)', async () => {
    const { status, body } = await api('/responses', {
      method: 'POST',
      body: JSON.stringify({
        surveyId,
        answers: [
          { questionIndex: 0, answer: 'Иә'    },
          { questionIndex: 1, answer: 4        },
          { questionIndex: 2, answer: 'Жақсы!' },
        ],
      }),
    });
    assert.equal(status, 201, `Жауап сәтсіз: ${body.message}`);
    assert.ok(body.success);
  });

  it('surveyId жоқ жауап → 400', async () => {
    const { status } = await api('/responses', {
      method: 'POST',
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(status, 400);
  });
});

// ══════════════════════════════════════════════════════════
// 5. ПІКІРЛЕР (Comments)
// ══════════════════════════════════════════════════════════
describe('💬 Пікірлер (Comments)', () => {

  it('пікір қалдырылады (POST /comments)', async () => {
    const { status, body } = await api('/comments', {
      method: 'POST',
      body: JSON.stringify({ surveyId, text: 'Тест пікірі — Mocha арқылы' }),
    });
    assert.equal(status, 201, `Пікір сәтсіз: ${JSON.stringify(body)}`);
    assert.ok(body.id, 'id болуы керек');
    commentId = body.id;
  });

  it('бос пікір → 400', async () => {
    const { status } = await api('/comments', {
      method: 'POST',
      body: JSON.stringify({ surveyId, text: '   ' }),
    });
    assert.equal(status, 400);
  });

  it('пікірлер тізімі алынады (GET /comments/:surveyId)', async () => {
    const { status, body } = await api(`/comments/${surveyId}`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body), 'массив болуы керек');
    assert.ok(body.length > 0, 'кем дегенде 1 пікір болуы керек');
  });

  it('пікір жойылады (DELETE /comments/:id)', async () => {
    const { status, body } = await api(`/comments/${commentId}`, {
      method: 'DELETE',
    });
    assert.equal(status, 200, `Жою сәтсіз: ${JSON.stringify(body)}`);
  });
});

// ══════════════════════════════════════════════════════════
// 6. ПРОФИЛЬ
// ══════════════════════════════════════════════════════════
describe('👤 Профиль', () => {

  it('профиль жаңартылады (PUT /auth/profile)', async () => {
    const { status, body } = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Жаңа Аты', bio: 'Mocha тесті' }),
    });
    assert.equal(status, 200);
    assert.equal(body.data.name, 'Жаңа Аты');
  });

  it('аты жоқ профиль жаңарту → 400', async () => {
    const { status } = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: '' }),
    });
    assert.equal(status, 400);
  });
});

// ══════════════════════════════════════════════════════════
// 7. ТАЗАЛАУ — сауалнама жойылады
// ══════════════════════════════════════════════════════════
describe('🧹 Тазалау', () => {

  it('сауалнама жойылады (DELETE /surveys/:id)', async () => {
    const { status, body } = await api(`/surveys/${surveyId}`, {
      method: 'DELETE',
    });
    assert.equal(status, 200, `Жою сәтсіз: ${body.message}`);
    assert.ok(body.success);
  });

  it('жойылған сауалнама → 404', async () => {
    const { status } = await api(`/surveys/${surveyId}`);
    assert.equal(status, 404);
  });
});
