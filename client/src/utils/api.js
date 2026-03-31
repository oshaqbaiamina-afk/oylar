// Барлық API шақырулары осы файл арқылы өтеді

const BASE = '/api';

const getToken = () => localStorage.getItem('token');

// Бэк { success, data, message } немесе тікелей массив қайтарады
// Екеуін де дұрыс өңдейтін жалпы функция
const request = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    // 401 — токен жарамсыз, шығу
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }
    throw new Error(json.message || json.error || 'Сервер қатесі');
  }

  // { success: true, data: ... } форматы
  if (json && typeof json === 'object' && 'success' in json) {
    return json.data;
  }
  // Тікелей массив немесе объект
  return json;
};

// ─── AUTH ─────────────────────────────────────────────────
export const authAPI = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => request('/auth/me'),
  updateProfile:   (body) => request('/auth/profile',         { method: 'PUT',  body: JSON.stringify(body) }),
  changePassword:  (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  deleteAccount:   ()     => request('/auth/delete',          { method: 'DELETE' }),
};

// ─── SURVEYS ──────────────────────────────────────────────
export const surveysAPI = {
  getAll:   ()         => request('/surveys'),
  getMy:    ()         => request('/surveys/my'),
  getOne:   (id)       => request(`/surveys/${id}`),
  getStats: ()         => request('/surveys/stats'),
  getResults: (id)     => request(`/surveys/${id}/results`),
  create:   (body)     => request('/surveys',       { method: 'POST',   body: JSON.stringify(body) }),
  update:   (id, body) => request(`/surveys/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  delete:   (id)       => request(`/surveys/${id}`, { method: 'DELETE' }),
};

// ─── RESPONSES ────────────────────────────────────────────
export const responsesAPI = {
  submit:   (body)     => request('/responses',              { method: 'POST', body: JSON.stringify(body) }),
  getAll:   (surveyId) => request(`/responses/${surveyId}`),
  getStats: (surveyId) => request(`/responses/${surveyId}/stats`),
};

// ─── COMMENTS ─────────────────────────────────────────────
export const commentsAPI = {
  getAll: (surveyId)   => request(`/comments/${surveyId}`),
  add:    (body)       => request('/comments',       { method: 'POST',   body: JSON.stringify(body) }),
  update: (id, body)   => request(`/comments/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (id)         => request(`/comments/${id}`, { method: 'DELETE' }),
};