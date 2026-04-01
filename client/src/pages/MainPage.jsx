import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { surveysAPI } from '../utils/api'
import { getUser, isLoggedIn, clearAuth } from '../utils/auth'

const COLORS = ['#4F46E5', '#F59E0B', '#10B981', '#F43F5E', '#0EA5E9', '#8B5CF6']
const colorFor = (str) => {
  let h = 0
  for (const c of (str || '')) h = (h * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

const timeAgo = (date) => {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 60) return 'қазір'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин бұрын`
  if (diff < 86400) return `${Math.floor(diff / 3600)} сағ бұрын`
  return `${Math.floor(diff / 86400)} күн бұрын`
}

const MainPage = () => {
  const navigate = useNavigate()
  const user = getUser()

  if (!isLoggedIn()) {
    navigate('/login', { replace: true })
    return null
  }

  const [surveys, setSurveys]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [stats, setStats]                   = useState({ surveys: 0, responses: 0, users: 0 })
  const [filter, setFilter]                 = useState('all')
  const [search, setSearch]                 = useState('')
  const [sort, setSort]                     = useState('new')
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [answers, setAnswers]               = useState({})
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [comments, setComments]             = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment]         = useState('')
  const [toast, setToast]                   = useState({ show: false, msg: '', type: 'success' })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [surveysData, statsData] = await Promise.all([
          surveysAPI.getAll(),
          surveysAPI.getStats(),
        ])
        if (cancelled) return
        setSurveys(Array.isArray(surveysData) ? surveysData : [])
        if (statsData) setStats(statsData)
      } catch {
        showToast('Мәліметтерді жүктеу сәтсіз', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // useMemo replaces the extra filterAndSortSurveys useEffect + state
  const filteredSurveys = useMemo(() => {
    let result = [...surveys]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        s =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.author_name || '').toLowerCase().includes(q)
      )
    }
    if (filter === 'popular' || sort === 'popular') {
      result.sort((a, b) => (b.response_count || 0) - (a.response_count || 0))
    } else {
      result.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
    }
    return result
  }, [surveys, filter, search, sort])

  const handleLogout = useCallback(() => {
    clearAuth()
    navigate('/login', { replace: true })
  }, [navigate])

  const openSurvey = useCallback(async (s) => {
    setAnswers({})
    setSubmitted(false)
    setComments([])
    setCommentsLoading(true)
    // Алдымен карточка деректерімен ашамыз (жылдам UX)
    // questions жолға айналған болса — парсингтейміз
    const fixQuestions = (survey) => {
      let q = survey.questions
      if (typeof q === 'string') { try { q = JSON.parse(q) } catch { q = [] } }
      if (!Array.isArray(q)) q = []
      return { ...survey, questions: q }
    }
    setSelectedSurvey(fixQuestions(s))
    try {
      // Толық деректерді (questions кепілді) серверден аламыз
      const [full, commentsData] = await Promise.all([
        surveysAPI.getOne(s.id),
        surveysAPI.getComments(s.id),
      ])
      if (full) setSelectedSurvey(fixQuestions(full))
      setComments(commentsData || [])
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }, [])

  const closeSurvey = useCallback(() => {
    setSelectedSurvey(null)
    setAnswers({})
    setSubmitted(false)
    setComments([])
  }, [])

  const setAnswer = useCallback((qIndex, value, type) => {
    setAnswers(prev => {
      if (type === 'checkbox') {
        const cur = Array.isArray(prev[qIndex]) ? prev[qIndex] : []
        const exists = cur.includes(value)
        return { ...prev, [qIndex]: exists ? cur.filter(v => v !== value) : [...cur, value] }
      }
      return { ...prev, [qIndex]: value }
    })
  }, [])

  const submitSurvey = async () => {
    if (!selectedSurvey) return
    setSubmitting(true)
    try {
      await surveysAPI.submitResponse(selectedSurvey.id, answers)
      setSubmitted(true)
      showToast('Жауаптарыңыз сәтті жіберілді! ✅')
      surveysAPI.getAll().then(d => { if (d) setSurveys(Array.isArray(d) ? d : []) })
    } catch (err) {
      showToast(err.message || 'Жіберу сәтсіз', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const submitComment = useCallback(async () => {
    if (!newComment.trim() || !selectedSurvey) return
    try {
      await surveysAPI.addComment(selectedSurvey.id, { text: newComment })
      setNewComment('')
      const data = await surveysAPI.getComments(selectedSurvey.id)
      setComments(data || [])
      showToast('Пікір жіберілді! 💬')
    } catch {
      showToast('Пікір жіберу сәтсіз', 'error')
    }
  }, [newComment, selectedSurvey])

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
  }

  const questions = selectedSurvey?.questions || []
  const answeredCount = useMemo(
    () =>
      Object.keys(answers).filter(k => {
        const v = answers[k]
        return v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
      }).length,
    [answers]
  )
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0

  return (
    <div className="main-page">
      {/* NAVBAR */}
      <nav className="nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <Link to="/" className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="brand-name"><em>Oylar</em></span>
        </Link>
        <div className="nav-right">
          <Link to="/dashboard" className="nav-user-chip">
            <span className="nav-username">{user?.name || 'Профиль'}</span>
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Шығу</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-header" style={{ marginTop: '68px' }}>
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-label">Барлық сауалнамалар</div>
            <h1 className="hero-title">Пікіріңізді білдіріңіз 🗳️</h1>
            <p className="hero-sub">Қызықты тақырыптарды тауып, жауап беріңіз және қоғамдастыққа қосылыңыз</p>
          </div>
          <div className="hero-stats">
            <div className="hstat"><div className="hstat-n">{stats.surveys || 0}+</div><div className="hstat-l">Сауалнама</div></div>
            <div className="hstat"><div className="hstat-n">{stats.responses || 0}+</div><div className="hstat-l">Жауап</div></div>
            <div className="hstat"><div className="hstat-n">{stats.users || 0}+</div><div className="hstat-l">Қолданушы</div></div>
          </div>
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="search-section">
        <div className="search-inner">
          <div className="search-wrap">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="search"
              autoComplete="off"
              placeholder="Сауалнама атауы немесе автор бойынша іздеу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {[{ id: 'all', label: 'Барлығы' }, { id: 'new', label: '🆕 Жаңа' }, { id: 'popular', label: '🔥 Танымал' }].map(f => (
              <button key={f.id} className={`filter-tab ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {!loading && (
          <div className="results-row">
            <span className="results-count"><strong>{filteredSurveys.length}</strong> сауалнама табылды</span>
            <div className="sort-wrap">
              <span>Сұрыптау:</span>
              <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="new">Жаңалары алдымен</option>
                <option value="popular">Танымалдары</option>
              </select>
            </div>
          </div>
        )}

        <div className="surveys-grid">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="skel-card">
                <div className="skel-top skeleton" />
                <div className="skel-body">
                  <div className="skel-line skeleton" style={{ width: '60%' }} />
                  <div className="skel-line skeleton" style={{ width: '90%' }} />
                  <div className="skel-line skeleton" style={{ width: '75%' }} />
                </div>
              </div>
            ))
          ) : filteredSurveys.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">Ештеңе табылмады</div>
              <div className="empty-desc">Іздеу сөзін өзгертіп көріңіз</div>
            </div>
          ) : (
            filteredSurveys.map(s => (
              <div key={s.id} className="s-card">
                {s.imageUrl && (
                  <img src={s.imageUrl} alt="Cover" loading="lazy"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '16px 16px 0 0' }} />
                )}
                <div className="s-card-top" style={{ padding: '1.5rem 1.5rem 1rem' }}>
                  <div className="s-meta">
                    <span className="s-category">{s.category || 'Сауалнама'}</span>
                    <span className="s-responses">👥 {s.response_count || 0} жауап</span>
                  </div>
                  <div className="s-title">{s.title}</div>
                </div>
                <div className="s-card-body">
                  <div className="s-desc">{s.description || 'Сипаттама жоқ'}</div>
                  <div className="s-info-row">
                    <div className="s-author">
                      <span className="s-author-name">👤 {s.author_name || 'Аноним'}</span>
                    </div>
                    <span className="s-time">{timeAgo(s.createdAt || s.created_at)}</span>
                  </div>
                </div>
                <div className="s-card-footer">
                  <button className="s-btn" onClick={() => openSurvey(s)}>Жауап беру →</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* SURVEY VIEWER MODAL */}
      {selectedSurvey && (
        <div className="overlay open" onClick={(e) => e.target === e.currentTarget && closeSurvey()}>
          <div className="viewer">
            <button className="viewer-close" onClick={closeSurvey}>✕</button>

            {/* ✅ FIXED: selectedSurvey instead of survey */}
            {selectedSurvey.imageUrl && (
              <img src={selectedSurvey.imageUrl} alt="Cover"
                style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
            )}

            <div className="viewer-header" style={selectedSurvey.imageUrl ? { borderRadius: 0 } : {}}>
              <div className="viewer-title">{selectedSurvey.title}</div>
              {selectedSurvey.description && <div className="viewer-desc">{selectedSurvey.description}</div>}
            </div>

            <div className="viewer-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-label">{answeredCount}/{questions.length}</span>
            </div>

            {submitted ? (
              /* SUCCESS STATE */
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '56px', marginBottom: '1rem' }}>🎉</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate)', marginBottom: '.5rem' }}>Рахмет!</div>
                <div style={{ fontSize: '14px', color: 'var(--slate-600)', marginBottom: '1.5rem' }}>Жауаптарыңыз сәтті жіберілді.</div>
                <button className="btn btn-primary btn-sm" onClick={closeSurvey}>Жабу</button>
              </div>
            ) : (
              <>
                <div className="viewer-body">
                  {questions.map((q, i) => {
                    const isAnswered = answers[i] !== undefined && answers[i] !== '' &&
                      (Array.isArray(answers[i]) ? answers[i].length > 0 : true)
                    const type = q.type || 'single'
                    return (
                      <div key={i} className={`vq-wrap ${isAnswered ? 'answered' : ''}`}>
                        <div className="vq-num">Сұрақ {i + 1}</div>
                        <div className="vq-text">{q.text}</div>

                        {['radio', 'single', 'dropdown'].includes(type) && (
                          <div className="vq-opts">
                            {(q.options || []).map((opt, j) => (
                              <button key={j} className={`opt-btn ${answers[i] === opt ? 'sel' : ''}`}
                                onClick={() => setAnswer(i, opt, 'radio')}>
                                <div className="opt-radio" /><span>{opt}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {(type === 'checkbox' || type === 'multiple') && (
                          <div className="vq-opts">
                            {(q.options || []).map((opt, j) => {
                              const arr = Array.isArray(answers[i]) ? answers[i] : []
                              const sel = arr.includes(opt)
                              return (
                                <button key={j} className={`opt-btn ${sel ? 'sel' : ''}`}
                                  onClick={() => setAnswer(i, opt, 'checkbox')}>
                                  <div className="opt-check">{sel ? '✓' : ''}</div><span>{opt}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {type === 'text' && (
                          <textarea className="text-input" placeholder="Жауабыңызды жазыңыз..."
                            value={answers[i] || ''} autoComplete="off"
                            onChange={(e) => setAnswer(i, e.target.value, 'text')} />
                        )}

                        {(type === 'rating' || type === 'scale') && (
                          <div className="rating-row">
                            {[1,2,3,4,5].map(n => (
                              <button key={n} className={`rating-btn ${answers[i] === n ? 'sel' : ''}`}
                                onClick={() => setAnswer(i, n, 'radio')}>{n}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="viewer-footer">
                  <span className="answered-count">Жауапталды: <strong>{answeredCount}/{questions.length}</strong></span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={closeSurvey}>Болдырмау</button>
                    <button className="btn btn-primary btn-sm" onClick={submitSurvey} disabled={submitting}>
                      {submitting ? 'Жіберілуде...' : 'Жіберу ✓'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* COMMENTS */}
            <div className="comments-section">
              <div className="comments-header">
                <h3>💬 Пікірлер</h3>
                <span>{comments.length} пікір</span>
              </div>
              <div className="comments-list">
                {commentsLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="comments-empty">Әлі пікірлер жоқ. Бірінші болыңыз!</div>
                ) : (
                  comments.map((c, i) => (
                    <div key={c.id || i} className="comment-item">
                      <div className="comment-avatar" style={{ background: colorFor(c.author_name) }}>
                        {(c.author_name || 'A')[0].toUpperCase()}
                      </div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-author">{c.author_name || 'Аноним'}</span>
                          <span className="comment-time">{timeAgo(c.createdAt || c.created_at)}</span>
                        </div>
                        <div className="comment-text">{c.text}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="comment-form">
                <textarea placeholder="Пікіріңізді жазыңыз..." rows="2"
                  value={newComment} autoComplete="off"
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitComment())}
                />
                <button className="btn btn-primary btn-sm" onClick={submitComment}>Жіберу</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type === 'error' ? 'e' : ''}`}>
        {toast.msg}
      </div>
    </div>
  )
}

export default MainPage