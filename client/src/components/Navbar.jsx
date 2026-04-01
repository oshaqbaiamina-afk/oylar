import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { isLoggedIn, getUser, clearAuth } from '../utils/auth'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const loggedIn = isLoggedIn()
  const user = getUser()

  const handleLogout = () => {
    clearAuth()
    navigate('/', { replace: true })
    setMobileMenuOpen(false)
  }

  // На главной странице показываем навигационные ссылки
  const isHomePage = location.pathname === '/'

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <>
      <nav className="nav">
        <Link to="/" className="brand" onClick={closeMobileMenu}>
          <div className="brand-mark">
            <svg viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="brand-name"><em>Oylar</em></span>
        </Link>

        {isHomePage && (
          <div className="nav-links">
            <a href="#how" className="nav-link">Қалай жұмыс істейді</a>
            <a href="#features" className="nav-link">Мүмкіндіктер</a>
            <a href="#demo" className="nav-link">Демо</a>
          </div>
        )}

        {/* Mobile Menu Button */}
        {isHomePage && (
          <button 
            className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}

        <div className="nav-right">
          {loggedIn ? (
            <>
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                👤 {user?.name || 'Кабинет'}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Шығу
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className={`btn btn-sm ${location.pathname === '/login' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Кіру
              </Link>
              <Link 
                to="/register" 
                className={`btn btn-sm ${location.pathname === '/register' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Тегін тіркелу
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isHomePage && (
        <div className={`mobile-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#how" className="nav-link" onClick={closeMobileMenu}>Қалай жұмыс істейді</a>
          <a href="#features" className="nav-link" onClick={closeMobileMenu}>Мүмкіндіктер</a>
          <a href="#demo" className="nav-link" onClick={closeMobileMenu}>Демо</a>
        </div>
      )}
    </>
  )
}

export default Navbar
