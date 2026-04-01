import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { surveysAPI } from '../utils/api';
import { isLoggedIn, getUser, clearAuth } from '../utils/auth';

const PublicPage = () => {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [stats, setStats] = useState({ users: '1,200', surveys: '8,400', responses: '1,248' });
  const [toast, setToast] = useState({ show: false, msg: '' });
  
  // Demo Survey State
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState({});
  const [isFinished, setIsFinished] = useState(false);

  const qs = [
    { text: "Oylar платформасы туралы не деп ойлайсыз?", opts: ["⭐⭐⭐⭐⭐ Өте керемет, ұнайды", "⭐⭐⭐⭐ Жақсы, жақсартуға болады", "⭐⭐⭐ Орташа деңгей", "⭐⭐ Ойлайтын нәрсе бар"] },
    { text: "Платформаны достарыңызға ұсынар ма едіңіз?", opts: ["✅ Иә, міндетті түрде ұсынамын", "🤔 Мүмкін, жағдайға байланысты", "❌ Жоқ, ұсынбаймын", "⏳ Әлі шешпедім"] },
    { text: "Сізге ең маңызды функция қайсы?", opts: ["⚡ Жылдамдық пен қарапайымдылық", "📊 Терең аналитика", "🔗 Жауаптарды бөлісу", "💬 Қолдау қызметі"] }
  ];

  useEffect(() => {
    // Статистиканы жүктеу
    surveysAPI.getStats().then(s => {
      if (s) setStats({ users: s.users || '1,200', surveys: s.surveys || '8,400', responses: s.responses || '1,248' });
    }).catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToast({ show: true, msg: '✓ ' + msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2800);
  };

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  return (
    <div className="fade-up">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-left">
          <h1>Сауалнама жасаңыз,<br/><span className="hl ul">пікір жинаңыз</span>,<br/>нәтиже алыңыз</h1>
          <p className="hero-sub">Oylar — қазақстандық бизнес пен студенттерге арналған онлайн сауалнама платформасы. 2 минутта жасаңыз, бірден жіберіңіз.</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">🚀 Тегін бастау</Link>
            <a href="#demo" className="btn btn-ghost btn-lg">▶ Демо көру</a>
          </div>
          <div className="hero-quick">
            <span className="quick-lbl">Жылдам әрекеттер:</span>
            <button className="btn btn-indigo-soft btn-sm" onClick={() => showToast('Шаблон ашылды!')}>📋 Шаблондар</button>
            <button className="btn btn-indigo-soft btn-sm" onClick={() => showToast('API кілті жіберілді')}>🔗 API қосылу</button>
            <button className="btn btn-indigo-soft btn-sm" onClick={() => showToast('WhatsApp чаты ашылды')}>💬 Қолдау</button>
          </div>
          <div className="hero-trust">
            <div className="trust-faces">
              <div className="face" style={{background:'#4F46E5'}}>АС</div>
              <div className="face" style={{background:'#F59E0B'}}>МБ</div>
              <div className="face" style={{background:'#F43F5E'}}>ДН</div>
              <div className="face" style={{background:'#0EA5E9'}}>КА</div>
            </div>
            <div className="trust-text">Осы аптада <strong>{stats.users}</strong>+ адам тіркелді</div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-visual">
            <div className="vis-card">
              <div className="vis-card-header">
                <span className="vis-card-title">📊 Нақты уақыт статистикасы</span>
                <span className="vis-status" style={{color:'var(--green)'}}><span className="vis-status-dot"></span>Тікелей</span>
              </div>
              <div className="vis-progress-list">
                {[
                  {l: 'Өте жақсы', p: 72, c: 'var(--indigo)'},
                  {l: 'Жақсы', p: 18, c: 'var(--sky)'},
                  {l: 'Орташа', p: 7, c: 'var(--amber)'},
                  {l: 'Нашар', p: 3, c: 'var(--rose)'}
                ].map(item => (
                  <div className="vis-p-row" key={item.l}>
                    <span className="vis-p-label">{item.l}</span>
                    <div className="vis-p-track"><div className="vis-p-fill" style={{width: `${item.p}%`, background: item.c}}></div></div>
                    <span className="vis-p-pct">{item.p}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="vis-stat-row">
              <div className="vis-stat"><div className="vis-stat-n">{stats.responses}</div><div className="vis-stat-l">Жауаптар</div></div>
              <div className="vis-stat"><div className="vis-stat-n">89%</div><div className="vis-stat-l">Аяқтаған</div></div>
              <div className="vis-stat"><div className="vis-stat-n">+67</div><div className="vis-stat-l">NPS ұпай</div></div>
            </div>
          </div>
        </div>
      </section>


      {/* ─── QUICK ACTIONS & STATS ─── */}
      <div className="quick-actions">
        <div className="qa-left">Бүгін <strong>247 жаңа сауалнама</strong> жасалды</div>
        <div className="qa-btns">
          <Link to="/register" className="btn btn-white btn-sm">✨ Сауалнама жасау</Link>
          <button className="btn btn-outline-white btn-sm" onClick={() => showToast('Шаблондар тізімі...')}>📋 Шаблондар</button>
          <button className="btn btn-amber btn-sm" onClick={() => showToast('Аналитика беті...')}>📈 Аналитика</button>
        </div>
      </div>

      <section className="stats">
        <div className="stat"><div className="stat-icon">👥</div><div className="stat-n">{stats.users}+</div><div className="stat-l">Тіркелген пайдаланушы</div></div>
        <div className="stat"><div className="stat-icon">📊</div><div className="stat-n">{stats.surveys}+</div><div className="stat-l">Жасалған сауалнама</div></div>
        <div className="stat"><div className="stat-icon">✅</div><div className="stat-n">95%</div><div className="stat-l">Қанағаттанған</div></div>
        <div className="stat"><div className="stat-icon">⚡</div><div className="stat-n">2 мин</div><div className="stat-l">Сауалнама уақыты</div></div>
      </section>


      {/* ─── HOW IT WORKS ─── */}
      <section id="how" style={{padding: '5rem 0'}}>
        <div style={{textAlign: 'center', marginBottom: '3rem'}}>
          <div className="sec-label">Жұмыс принципі</div>
          <h2 style={{fontSize: '32px', fontWeight: 800}}>3 қадамда нәтиже алыңыз</h2>
        </div>
        <div className="steps container">
          <div className="step-card">
            <div style={{background: 'var(--indigo-l)', color: 'var(--indigo)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '1rem'}}>1</div>
            <div style={{fontWeight: 700, marginBottom: '0.5rem'}}>Сауалнама жасаңыз</div>
            <p style={{fontSize: '14px', color: 'var(--slate-600)'}}>Дайын шаблондарды қолданыңыз немесе нөлден бастаңыз.</p>
          </div>
          <div className="step-card">
            <div style={{background: 'var(--amber-l)', color: 'var(--amber-d)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '1rem'}}>2</div>
            <div style={{fontWeight: 700, marginBottom: '0.5rem'}}>Сілтемені жіберіңіз</div>
            <p style={{fontSize: '14px', color: 'var(--slate-600)'}}>WhatsApp, Telegram немесе Email арқылы бірден бөлісіңіз.</p>
          </div>
          <div className="step-card">
            <div style={{background: 'var(--rose-l)', color: 'var(--rose-d)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '1rem'}}>3</div>
            <div style={{fontWeight: 700, marginBottom: '0.5rem'}}>Талдау жасаңыз</div>
            <p style={{fontSize: '14px', color: 'var(--slate-600)'}}>Жауаптарды нақты уақытта әдемі диаграммалармен көріңіз.</p>
          </div>
        </div>
      </section>
      
      {/* ─── FEATURES SECTION ─────────────────────────────────── */}
<section className="features" id="features">
  <div className="sec-header center">
    <div className="sec-label">Мүмкіндіктер</div>
    <h2 className="sec-title">Барлығы бір платформада</h2>
    <p className="sec-sub">Кәсіби сауалнама, аналитика және пікір жинауға қажетті барлық құралдар</p>
  </div>

  <div className="features-grid container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
    {/* 1. Editor */}
    <div className="feat-card">
      <div className="feat-icon feat-icon-indigo">📝</div>
      <h3 className="feat-title">Сауалнама редакторы</h3>
      <p className="feat-desc">Drag & drop интерфейсімен сұрақтар қосыңыз. 4 түрлі сұрақ форматы бар.</p>
      <div className="feat-tags">
        <span className="tag">Drag & drop</span>
        <span className="tag">4 формат</span>
      </div>
    </div>

    {/* 2. Analytics */}
    <div className="feat-card">
      <div className="feat-icon feat-icon-amber">📊</div>
      <h3 className="feat-title">Нақты уақыт аналитикасы</h3>
      <p className="feat-desc">Жауаптар түскен сайын диаграммалар жаңарады. NPS, CSAT есептеулері автоматты.</p>
      <div className="feat-tags">
        <span className="tag">NPS</span>
        <span className="tag">CSAT</span>
        <span className="tag">Live</span>
      </div>
    </div>

    {/* 3. Sharing */}
    <div className="feat-card">
      <div className="feat-icon feat-icon-rose">🔗</div>
      <h3 className="feat-title">Жіберу мүмкіндіктері</h3>
      <p className="feat-desc">Email, WhatsApp, Telegram арқылы жіберіңіз немесе сайтыңызға iframe ретінде қосыңыз.</p>
      <div className="feat-tags">
        <span className="tag">Email</span>
        <span className="tag">QR-код</span>
        <span className="tag">Iframe</span>
      </div>
    </div>

    {/* 4. Auth */}
    <div className="feat-card">
      <div className="feat-icon feat-icon-sky">🛡️</div>
      <h3 className="feat-title">Аутентификация</h3>
      <p className="feat-desc">JWT токен, парольді шифрлау, рөлдер жүйесі (admin/user). Деректеріңіз қорғалған.</p>
      <div className="feat-tags">
        <span className="tag">JWT</span>
        <span className="tag">bcrypt</span>
        <span className="tag">Рөлдер</span>
      </div>
    </div>

    {/* 5. Feedback */}
    <div className="feat-card">
      <div className="feat-icon feat-icon-green">💬</div>
      <h3 className="feat-title">Пікірлер жүйесі</h3>
      <p className="feat-desc">Қатысушылар сауалнама бойынша пікір қалдыра алады. Модерация қолдауы бар.</p>
      <div className="feat-tags">
        <span className="tag">Пікірлер</span>
        <span className="tag">Модерация</span>
      </div>
    </div>

    {/* 6. Export */}
    <div className="feat-card">
      <div className="feat-icon feat-icon-slate">📤</div>
      <h3 className="feat-title">Экспорт</h3>
      <p className="feat-desc">Нәтижелерді Excel, CSV немесе PDF форматында жүктеп алыңыз. API арқылы интеграция.</p>
      <div className="feat-tags">
        <span className="tag">Excel</span>
        <span className="tag">CSV</span>
        <span className="tag">REST API</span>
      </div>
    </div>
  </div>
</section>
      

      {/* ─── DEMO SURVEY ─── */}
      <section className="demo-sec" id="demo">
        <div className="sec-header center">
          <div className="sec-label">Демо</div>
          <div className="sec-title">Өзіңіз байқап көріңіз</div>
        </div>
        <div className="demo-wrap">
          <div className="survey-card">
            <div className="survey-top">
              <h3>Oylar платформасын бағалаңыз</h3>
              <p>Бұл демо сауалнама — нақты деректер жіберілмейді</p>
              <div className="prog-track"><div className="prog-fill" style={{width: `${((cur+1)/qs.length)*100}%`}}></div></div>
            </div>
            <div className="survey-body">
              {!isFinished ? (
                <>
                  <div className="q-tag">{cur+1}-сұрақ / {qs.length}</div>
                  <div className="q-text">{qs[cur].text}</div>
                  <div className="opts">
                    {qs[cur].opts.map((o, i) => (
                      <button key={i} className={`opt ${ans[cur] === i ? 'sel' : ''}`} onClick={() => setAns({...ans, [cur]: i})}>
                        <div className="opt-radio"></div><span className="opt-txt">{o}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{textAlign:'center', padding:'2.5rem 0'}}>
                  <div style={{fontSize:'28px', marginBottom:'1.2rem'}}>✅</div>
                  <div style={{fontSize:'22px', fontWeight:800}}>Рахмет!</div>
                  <p>Жауаптарыңыз сәтті жіберілді</p>
                  <button className="btn btn-primary" style={{marginTop:'1rem'}} onClick={() => {setCur(0); setAns({}); setIsFinished(false);}}>Қайта өту</button>
                </div>
              )}
            </div>
            {!isFinished && (
              <div className="survey-foot">
                <span className="foot-step">{cur+1} / {qs.length}</span>
                <div className="foot-btns">
                  <button className="btn btn-ghost btn-sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>← Алдыңғы</button>
                  <button className="btn btn-primary btn-sm" onClick={() => cur === qs.length - 1 ? setIsFinished(true) : setCur(cur + 1)}>
                    {cur === qs.length - 1 ? 'Жіберу ✓' : 'Келесі →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── USE CASES ─── */}
      <section className="usecases">
        <div className="sec-header center">
          <div className="sec-label">Қолдану салалары</div>
          <div className="sec-title">Кім пайдалана алады?</div>
        </div>
        <div className="uc-grid container">
          {['🏢 Бизнес', '🎓 Білім', '👥 HR', '🔬 Зерттеу'].map(uc => (
            <div className="uc-card" key={uc} onClick={() => showToast(`${uc} шаблондары...`)}>
              <div className="uc-icon">{uc.split(' ')[0]}</div>
              <div className="uc-title">{uc.split(' ')[1]}</div>
              <div className="uc-desc">Тұтынушы қанағатын өлшеу, пікір жинау.</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta">
        <h2>Бүгін тегін бастаңыз</h2>
        <p>Тіркелусіз алғашқы сауалнамаңызды 2 минутта жасаңыз.</p>
        <div className="cta-btns">
          <Link to="/register" className="btn btn-white btn-xl">🚀 Тегін тіркелу</Link>
          <Link to="/login" className="btn btn-outline-white btn-xl">Кіру →</Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="footer-top container" style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'3rem'}}>
          <div>
            <div className="footer-brand-name"><em>Oylar</em></div>
            <p className="footer-tagline">Қазақстандық бизнес пен студенттерге арналған онлайн сауалнама платформасы.</p>
          </div>
          {['Платформа', 'Компания', 'Анықтама'].map(col => (
            <div key={col}>
              <div className="footer-col-title">{col}</div>
              <div className="footer-links">
                <span className="footer-link">Мүмкіндіктер</span>
                <span className="footer-link">Біз туралы</span>
                <span className="footer-link">Қолдау</span>
              </div>
            </div>
          ))}
        </div>
        <div className="footer-bottom container">
          <div className="footer-copy">© 2026 Oylar. Барлық құқықтар қорғалған.</div>
          <div className="footer-badges">
             <span className="footer-badge">React</span><span className="footer-badge">Node.js</span>
          </div>
        </div>
      </footer>

      {/* TOAST */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
};

export default PublicPage;