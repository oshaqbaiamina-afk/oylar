// Auth helper функциялары

export const getUser = () => {
  try {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

export const getToken = () => localStorage.getItem('token');

export const setAuth = (user, token) => {
  localStorage.setItem('user',  JSON.stringify(user));
  localStorage.setItem('token', token);
};

export const clearAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

export const isLoggedIn = () => !!getToken();