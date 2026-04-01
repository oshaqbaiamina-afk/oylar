import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, surveysAPI } from '../utils/api';
import { setAuth, isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';

const RegisterPage = () => {
  const navigate = useNavigate();
  
  if (isLoggedIn()) {
    navigate('/dashboard', { replace: true });
  }

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPass: '', terms: false });
  const [stats, setStats] = useState({ users: '1.2K+', surveys: '8.5K+', responses: '42K+' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Статистиканы серверден алу
  useEffect(() => {
    surveysAPI.getStats().then(s => {
      if (s) setStats({
        users: (s.users || 1200) + '+',
        surveys: (s.surveys || 8400) + '+',
        responses: (s.responses || 1248) + '+'
      });
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPass) return setError('Құпия сөздер сәйкес келмейді');
    
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.register({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password
      });
      const authData = response.data || response;
      setAuth(authData.user, authData.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Тіркелу кезінде қате кетті');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '68px' }}>
        <div className="auth-layout">
          {/* LEFT PANEL: FORM */}
          <div className="auth-left">
            <div className="page-label">БАСТАУ</div>
            <h1 className="page-title">Тіркелу</h1>
            <p className="page-sub">Тегін аккаунт жасаңыз және өз сауалнамаңызды бүгін жариялаңыз.</p>

            <button className="btn btn-google btn-lg" type="button">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" />
              Google арқылы тіркелу
            </button>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">немесе email арқылы</span>
              <div className="divider-line"></div>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              {error && <div className="field-error show">⚠ {error}</div>}
              
              <div className="field-row">
                <div className="field">
                  <label className="label">Аты <span>*</span></label>
                  <div className="input-wrap">
                    <input className="input" type="text" id="firstName" placeholder="Асқар" value={form.firstName} onChange={handleChange} required />
                    <span className="input-icon">👤</span>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Тегі <span>*</span></label>
                  <div className="input-wrap">
                    <input className="input" type="text" id="lastName" placeholder="Сейткали" value={form.lastName} onChange={handleChange} required />
                    <span className="input-icon">👤</span>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="label">Email <span>*</span></label>
                <div className="input-wrap">
                  <input className="input" type="email" id="email" placeholder="askar@example.com" value={form.email} onChange={handleChange} required />
                  <span className="input-icon">✉️</span>
                </div>
              </div>

              <div className="field">
                <label className="label">Құпия сөз <span>*</span></label>
                <div className="input-wrap password-wrap">
                  <input className="input" type={showPass ? 'text' : 'password'} id="password" placeholder="Кемінде 8 символ" value={form.password} onChange={handleChange} required />
                  <span className="input-icon">🔒</span>
                  <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁'}</button>
                </div>
              </div>

              <div className="field">
                <label className="label">Құпия сөзді растаңыз <span>*</span></label>
                <div className="input-wrap password-wrap">
                  <input className="input" type={showConfirm ? 'text' : 'password'} id="confirmPass" placeholder="Қайта енгізіңіз" value={form.confirmPass} onChange={handleChange} required />
                  <span className="input-icon">🔒</span>
                  <button type="button" className="toggle-pass" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? '🙈' : '👁'}</button>
                </div>
              </div>

              <div className="field">
                <label className="check-row">
                  <input type="checkbox" id="terms" checked={form.terms} onChange={handleChange} />
                  <div className="check-box"></div>
                  <span className="check-text">
                    Пайдалану шарттарымен және Құпиялылық саясатымен келісемін
                  </span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={loading}>
                {loading ? 'Жүктелуде...' : 'Тіркелу — Тегін 🚀'}
              </button>
            </form>

            <p className="login-link">Аккаунтыңыз бар ма? <Link to="/login">Кіру →</Link></p>
          </div>

          {/* RIGHT PANEL: BENEFITS & STATS */}
          <div className="auth-right">
            <div className="right-content">
              <div className="benefit-header">
                <div className="benefit-title">Oylar-ға қош келдіңіз! 👋</div>
                <div className="benefit-sub">Тіркелгеннен кейін мына мүмкіндіктер қол жетімді болады:</div>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon bi-indigo">📊</div>
                <div className="benefit-info">
                  <div className="benefit-name">Шексіз сауалнамалар жасаңыз</div>
                  <div className="benefit-desc">Кез келген тақырыпта сауалнама құрастырыңыз</div>
                </div>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon bi-green">⚡</div>
                <div className="benefit-info">
                  <div className="benefit-name">Нәтижелерді нақты уақытта көріңіз</div>
                  <div className="benefit-desc">Жауаптар мен аналитика бірден жаңарады</div>
                </div>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon bi-amber">🔗</div>
                <div className="benefit-info">
                  <div className="benefit-name">Сауалнаманы оңай бөлісіңіз</div>
                  <div className="benefit-desc">Бір сілтеме арқылы кез келген адамға жіберіңіз</div>
                </div>
              </div>

              <div className="stats-row">
                <div className="mini-stat">
                  <div className="mini-stat-n">{stats.users}</div>
                  <div className="mini-stat-l">Қолданушы</div>
                </div>
                <div className="mini-stat">
                  <div className="mini-stat-n">{stats.surveys}</div>
                  <div className="mini-stat-l">Сауалнама</div>
                </div>
                <div className="mini-stat">
                  <div className="mini-stat-n">{stats.responses}</div>
                  <div className="mini-stat-l">Жауап</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;