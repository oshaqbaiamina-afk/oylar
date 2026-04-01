import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../utils/api'
import { setAuth, isLoggedIn } from '../utils/auth'
import Navbar from '../components/Navbar'

const LoginPage = () => {
  const navigate = useNavigate()

  // Если уже залогинен — сразу на дашборд
  if (isLoggedIn()) {
    navigate('/dashboard', { replace: true })
  }

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { user, token } = await authAPI.login(form)
      setAuth(user, token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Кіру қатесі')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '68px' }}>
        <div className="auth-layout">
          {/* LEFT PANEL: FORM */}
          <div className="auth-left" style={{ justifyContent: 'center' }}>
            <div className="page-label">ҚОШ КЕЛДІҢІЗ</div>
            <h1 className="page-title">Кіру</h1>
            <p className="page-sub">Аккаунтыңызға кіріңіз және сауалнамаларыңызды басқарыңыз.</p>

            <button className="btn btn-google btn-lg" type="button">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" />
              Google арқылы кіру
            </button>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">немесе email арқылы</span>
              <div className="divider-line"></div>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              {error && <div className="field-error show">⚠ {error}</div>}

              <div className="field">
                <label className="label">Email <span>*</span></label>
                <div className="input-wrap">
                  <input 
                    className="input" 
                    type="email" 
                    name="email" 
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                  <span className="input-icon">✉️</span>
                </div>
              </div>

              <div className="field">
                <label className="label">Құпия сөз <span>*</span></label>
                <div className="input-wrap password-wrap">
                  <input 
                    className="input" 
                    type="password" 
                    name="password" 
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                  <span className="input-icon">🔒</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={loading}>
                {loading ? 'Кіру…' : 'Кіру'}
              </button>
            </form>

            <p className="login-link">Аккаунт жоқ па? <Link to="/register">Тіркелу →</Link></p>
          </div>

          {/* RIGHT PANEL */}
          <div className="auth-right">
            <div className="right-content">
              <div className="benefit-header">
                <div className="benefit-title">Қайта қош келдіңіз! 👋</div>
                <div className="benefit-sub">Жүйеге кіргеннен кейін:</div>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon bi-indigo">📊</div>
                <div className="benefit-info">
                  <div className="benefit-name">Сауалнамаларыңызды қараңыз</div>
                  <div className="benefit-desc">Барлық сауалнамалар мен жауаптарды бір жерден басқарыңыз</div>
                </div>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon bi-green">⚡</div>
                <div className="benefit-info">
                  <div className="benefit-name">Нәтижелерді талдаңыз</div>
                  <div className="benefit-desc">Жауаптарды графиктер мен диаграммалармен көріп, талдау жасаңыз</div>
                </div>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon bi-amber">🔗</div>
                <div className="benefit-info">
                  <div className="benefit-name">Жаңа сауалнама жасаңыз</div>
                  <div className="benefit-desc">2 минутта жаңа сауалнама құрастырып, бөлісіңіз</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginPage