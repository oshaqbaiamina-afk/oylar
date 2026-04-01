import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { surveysAPI, authAPI } from '../utils/api'
import { getUser, isLoggedIn, clearAuth } from '../utils/auth'
import Chart from 'chart.js/auto'

const COLORS = ['#4F46E5','#F59E0B','#10B981','#F43F5E','#0EA5E9','#8B5CF6']
const colorFor = (str) => {
  let h = 0
  for (const c of (str||'')) h = (h * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1) return 'Бүгін'
  if (d < 30) return `${d} күн бұрын`
  return new Date(dateStr).toLocaleDateString('kk-KZ')
}

const TYPE_LABELS = { single: 'Бір жауап', multiple: 'Бірнеше', text: 'Мәтін', rating: 'Рейтинг' }

const TEMPLATES = {
  satisfaction: {
    title: 'Қанағаттану сауалнамасы',
    description: 'Клиент пікірін жинау үшін арналған',
    questions: [
      { type: 'rating', text: 'Біздің сервисті бағалаңыз (1-5)' },
      { type: 'single', text: 'Сервис ыңғайлы болды ма?', options: ['Иә, өте ыңғайлы', 'Жартылай', 'Ыңғайсыз'] },
      { type: 'text',   text: 'Жақсарту бойынша ұсыныстарыңыз:' }
    ]
  },
  demographic: {
    title: 'Әлеуметтік анкета',
    description: 'Аудиторияңызды жақсырақ түсінуге арналған',
    questions: [
      { type: 'single',   text: 'Жасыңыз:', options: ['18 жасқа дейін', '18–25', '26–35', '36+'] },
      { type: 'single',   text: 'Кәсібіңіз:', options: ['Студент', 'Жалдамалы қызметкер', 'Кәсіпкер', 'Басқа'] },
      { type: 'multiple', text: 'Қандай платформаларды қолданасыз?', options: ['Instagram', 'TikTok', 'YouTube', 'Telegram'] }
    ]
  },
  education: {
    title: 'Білім тексеру тесті',
    description: 'Оқушылардың білім деңгейін анықтаңыз',
    questions: [
      { type: 'single', text: 'HTTP дегеніміз не?', options: ['Бағдарламалау тілі', 'Деректер тасымалы протоколы', 'Дерекқор', 'Фреймворк'] },
      { type: 'multiple', text: 'Backend тілдері қайсылары?', options: ['JavaScript', 'Python', 'Java', 'CSS'] },
      { type: 'rating', text: 'Өз білім деңгейіңізді бағалаңыз (1-5)' }
    ]
  },
  feedback: {
    title: 'Іс-шара пікірі',
    description: 'Оқиға немесе өнім туралы пікір жинаңыз',
    questions: [
      { type: 'rating', text: 'Іс-шараны бағалаңыз (1-5)' },
      { type: 'single', text: 'Материал түсінікті болды ма?', options: ['Иә', 'Жартылай', 'Жоқ'] },
      { type: 'text',   text: 'Ең ұнаған нәрсе не болды?' }
    ]
  }
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const user = getUser()
  const chartInstances = useRef([])

  if (!isLoggedIn()) {
    navigate('/login', { replace: true })
    return null
  }

  const [activeSection, setActiveSection] = useState('overview')
  const [overviewStats, setOverviewStats] = useState({ surveys: 0, responses: 0, active: 0, days: 0 })
  const [profile, setProfile] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    bio: user?.bio || ''
  })
  const [passwordData, setPasswordData] = useState({ oldPass: '', newPass: '', confPass: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [builder, setBuilder] = useState({ title: '', description: '', questions: [], imageUrl: null })
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [editingQIdx, setEditingQIdx] = useState(null)
  const [currentQType, setCurrentQType] = useState(null)
  const [editorText, setEditorText] = useState('')
  const [editorOptions, setEditorOptions] = useState(['', ''])
  const [publishing, setPublishing] = useState(false)
  const [mySurveys, setMySurveys] = useState([])
  const [surveysSearch, setSurveysSearch] = useState('')
  const [loadingSurveys, setLoadingSurveys] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [analyticsSurvey, setAnalyticsSurvey] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsComments, setAnalyticsComments] = useState([])
  const [toast, setToast] = useState({ show: false, msg: '', type: 's' })

  useEffect(() => { loadOverview() }, [])
  useEffect(() => { if (activeSection === 'my-surveys') loadMySurveys() }, [activeSection])
  useEffect(() => {
    return () => {
      chartInstances.current.forEach(c => c.destroy())
      chartInstances.current = []
    }
  }, [])

  const showToastMsg = (msg, type = 's') => {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast({ show: false, msg: '', type: 's' }), 3000)
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const loadOverview = async () => {
    try {
      const surveys = await surveysAPI.getUserSurveys()
      const arr = Array.isArray(surveys) ? surveys : []
      const total = arr.length
      const active = arr.filter(s => s.isPublished !== false).length
      const responses = arr.reduce((sum, s) => sum + (s.response_count || 0), 0)
      const days = user?.created_at 
        ? Math.floor((Date.now() - new Date(user.created_at)) / 86400000)
        : 0
      setOverviewStats({ surveys: total, responses, active, days })
    } catch {}
  }

  const saveProfile = async () => {
    if (!profile.firstName.trim()) { showToastMsg('Атыңызды енгізіңіз', 'e'); return }
    setSavingProfile(true)
    try {
      const updated = await authAPI.updateProfile({
        name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
        bio: profile.bio.trim()
      })
      const newUser = { ...user, ...updated }
      localStorage.setItem('user', JSON.stringify(newUser))
      showToastMsg('Профиль сәтті сақталды!', 'ok')
    } catch (err) {
      showToastMsg(err.message, 'e')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    const { oldPass, newPass, confPass } = passwordData
    if (!oldPass || !newPass) { showToastMsg('Барлық өрістерді толтырыңыз', 'e'); return }
    if (newPass.length < 8) { showToastMsg('Кемінде 8 символ', 'e'); return }
    if (newPass !== confPass) { showToastMsg('Құпия сөздер сәйкес келмейді', 'e'); return }
    
    try {
      await authAPI.changePassword({ oldPassword: oldPass, newPassword: newPass })
      showToastMsg('Құпия сөз өзгертілді!', 'ok')
      setPasswordData({ oldPass: '', newPass: '', confPass: '' })
    } catch (e) {
      showToastMsg(e.message, 'e')
    }
  }

  const confirmDeleteAccount = async () => {
    if (!confirm('⚠️ Аккаунтты жою керек пе? Барлық деректер жойылады!')) return
    if (!confirm('🔴 Соңғы растау. Бұл қайтарылмайды!')) return
    try {
      await authAPI.deleteAccount()
      clearAuth()
      navigate('/', { replace: true })
    } catch (e) {
      showToastMsg(e.message, 'e')
    }
  }

  const loadTemplate = (name) => {
    const tpl = TEMPLATES[name]
    if (!tpl) return
    setBuilder({
      title: tpl.title,
      description: tpl.description,
      questions: JSON.parse(JSON.stringify(tpl.questions)),
      imageUrl: null
    })
    setActiveSection('create')
    showToastMsg('Шаблон жүктелді!', 'ok')
  }

  const addQuestion = (type) => {
    setCurrentQType(type)
    setEditingQIdx(null)
    setEditorText('')
    setEditorOptions(['', ''])
    setShowTypeModal(false)
    setShowEditorModal(true)
  }

  const editQuestion = (idx) => {
    const q = builder.questions[idx]
    setCurrentQType(q.type)
    setEditingQIdx(idx)
    setEditorText(q.text)
    setEditorOptions(q.options ? [...q.options] : ['', ''])
    setShowEditorModal(true)
  }

  const saveQuestion = () => {
    const text = editorText.trim()
    if (!text) { showToastMsg('Сұрақ мәтінін енгізіңіз', 'e'); return }
    
    const q = { type: currentQType, text }
    if (currentQType === 'single' || currentQType === 'multiple') {
      const opts = editorOptions.map(o => o.trim()).filter(Boolean)
      if (opts.length < 2) { showToastMsg('Кемінде 2 нұсқа қажет', 'e'); return }
      q.options = opts
    }
    
    if (editingQIdx !== null) {
      const newQuestions = [...builder.questions]
      newQuestions[editingQIdx] = q
      setBuilder({ ...builder, questions: newQuestions })
      showToastMsg('Сұрақ жаңартылды', 'ok')
    } else {
      setBuilder({ ...builder, questions: [...builder.questions, q] })
      showToastMsg('Сұрақ қосылды', 'ok')
    }
    setShowEditorModal(false)
  }

  const removeQuestion = (idx) => {
    const newQuestions = builder.questions.filter((_, i) => i !== idx)
    setBuilder({ ...builder, questions: newQuestions })
  }

  const resetBuilder = () => {
    setBuilder({ title: '', description: '', questions: [], imageUrl: null })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) { setBuilder({ ...builder, imageUrl: null }); return }
    if (file.size > 3 * 1024 * 1024) { showToastMsg('Көлемі 3МБ-тан аспауы керек', 'e'); return }
    const reader = new FileReader()
    reader.onload = (e) => setBuilder({ ...builder, imageUrl: e.target.result })
    reader.readAsDataURL(file)
  }

  const publishSurvey = async () => {
    if (!builder.title.trim()) { showToastMsg('Атауын енгізіңіз', 'e'); return }
    if (!builder.questions.length) { showToastMsg('Кемінде 1 сұрақ қосыңыз', 'e'); return }
    
    setPublishing(true)
    try {
      await surveysAPI.createSurvey({
        title: builder.title,
        description: builder.description,
        questions: builder.questions,
        is_active: true,
        imageUrl: builder.imageUrl
      })
      showToastMsg('Сауалнама жарияланды! 🎉', 'ok')
      resetBuilder()
      setTimeout(() => setActiveSection('my-surveys'), 1500)
    } catch (e) {
      showToastMsg(e.message, 'e')
    } finally {
      setPublishing(false)
    }
  }

  const saveDraft = async () => {
    if (!builder.title.trim()) { showToastMsg('Атауын енгізіңіз', 'e'); return }
    try {
      await surveysAPI.createSurvey({
        title: builder.title,
        description: builder.description,
        questions: builder.questions,
        is_active: false,
        imageUrl: builder.imageUrl
      })
      showToastMsg('Нобайға сақталды 💾', 'ok')
      resetBuilder()
    } catch (e) {
      showToastMsg(e.message, 'e')
    }
  }

  const loadMySurveys = async () => {
    setLoadingSurveys(true)
    try {
      const data = await surveysAPI.getUserSurveys()
      setMySurveys(Array.isArray(data) ? data : [])
    } catch (e) {
      showToastMsg(e.message, 'e')
    } finally {
      setLoadingSurveys(false)
    }
  }

  const filteredSurveys = mySurveys.filter(s => 
    s.title.toLowerCase().includes(surveysSearch.toLowerCase())
  )

  const deleteSurvey = async (id, title) => {
    if (!confirm(`"${title}" сауалнамасын жою керек пе?`)) return
    try {
      await surveysAPI.deleteSurvey(id)
      setMySurveys(mySurveys.filter(s => s.id !== id))
      showToastMsg('Сауалнама жойылды', 's')
    } catch (e) {
      showToastMsg(e.message, 'e')
    }
  }

  const toggleSurveyStatus = async (id, isActive) => {
    try {
      await surveysAPI.updateSurvey(id, { is_active: !isActive })
      setMySurveys(mySurveys.map(s => s.id === id ? { ...s, isPublished: !isActive } : s))
      showToastMsg(isActive ? 'Сауалнама тоқтатылды' : 'Сауалнама белсендірілді', 'ok')
    } catch (e) {
      showToastMsg(e.message, 'e')
    }
  }

  const shareSurvey = (id) => {
    const url = window.location.origin + '/main?survey=' + id
    navigator.clipboard.writeText(url).then(() => {
      showToastMsg('Сілтеме көшірілді!', 's')
    }).catch(() => {
      showToastMsg('Сілтемені көшіру мүмкін болмады', 'e')
    })
  }

  const openAnalytics = async (survey) => {
    setAnalyticsSurvey(survey)
    setAnalyticsOpen(true)
    setAnalyticsData(null)
    
    chartInstances.current.forEach(c => c.destroy())
    chartInstances.current = []
    
    try {
      const data = await surveysAPI.getSurveyResults(survey.id)
      setAnalyticsData(data)
      const comments = await surveysAPI.getComments(survey.id)
      setAnalyticsComments(comments || [])
      setTimeout(() => renderCharts(data), 100)
    } catch (e) {
      showToastMsg(e.message, 'e')
    }
  }

  const renderCharts = (data) => {
    if (!data?.questions) return
    
    data.questions.forEach((q, i) => {
      const ctx = document.getElementById(`chart-${i}`)
      if (!ctx) return
      
      if (['single', 'multiple', 'dropdown'].includes(q.type) && q.options) {
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: q.options.map(o => o.label),
            datasets: [{
              data: q.options.map(o => o.count),
              backgroundColor: ['#4F46E5','#10B981','#F59E0B','#F43F5E','#0EA5E9','#8B5CF6'],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } }
          }
        })
        chartInstances.current.push(chart)
      } else if (q.type === 'rating' || q.type === 'scale') {
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['1','2','3','4','5'],
            datasets: [{
              data: q.distribution || [0,0,0,0,0],
              backgroundColor: ['#F43F5E','#F59E0B','#10B981','#0EA5E9','#4F46E5'],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
          }
        })
        chartInstances.current.push(chart)
      }
    })
  }

  const closeAnalytics = () => {
    setAnalyticsOpen(false)
    chartInstances.current.forEach(c => c.destroy())
    chartInstances.current = []
  }

  // ─── EXPORT HELPERS ───────────────────────────────────────
  const buildExportRows = () => {
    if (!analyticsData) return []
    const rows = []
    rows.push(['Сауалнама:', analyticsSurvey?.title || ''])
    rows.push(['Жауап саны:', analyticsData.totalResponses || 0])
    rows.push([])
    analyticsData.questions?.forEach((q, i) => {
      rows.push([`Сұрақ ${i + 1}:`, q.text])
      if (q.options) {
        const total = q.options.reduce((s, o) => s + o.count, 0) || 1
        rows.push(['Нұсқа', 'Жауап саны', 'Пайыз'])
        q.options.forEach(o => rows.push([o.label, o.count, `${Math.round((o.count / total) * 100)}%`]))
      } else if (q.type === 'rating' || q.type === 'scale') {
        rows.push(['Баға', 'Саны'])
        ;[1,2,3,4,5].forEach((n, idx) => rows.push([n, q.distribution?.[idx] || 0]))
        rows.push(['Орташа:', q.average || '—'])
      } else if (q.answers?.length) {
        rows.push(['Жауаптар:'])
        q.answers.forEach(a => rows.push([a]))
      }
      rows.push([])
    })
    return rows
  }

  const exportCSV = () => {
    const rows = buildExportRows()
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${analyticsSurvey?.title || 'survey'}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToastMsg('CSV жүктелді!', 'ok')
  }

  const exportExcel = () => {
    if (!analyticsData) return
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #CBD5E1;padding:8px 12px;font-size:13px;font-family:Arial}.hdr{background:#4F46E5;color:white;font-weight:bold}.ttl{background:#EEF2FF;font-weight:bold;font-size:15px}.sec{background:#F1F5F9;font-weight:bold}</style></head><body><table>`
    html += `<tr class="ttl"><td colspan="3">📊 ${analyticsSurvey?.title || ''}</td></tr>`
    html += `<tr><td colspan="3">Жауап саны: ${analyticsData.totalResponses || 0}</td></tr><tr><td></td></tr>`
    analyticsData.questions?.forEach((q, i) => {
      html += `<tr class="sec"><td colspan="3">Сұрақ ${i + 1}: ${q.text}</td></tr>`
      if (q.options) {
        const total = q.options.reduce((s, o) => s + o.count, 0) || 1
        html += `<tr><th class="hdr">Нұсқа</th><th class="hdr">Саны</th><th class="hdr">Пайыз</th></tr>`
        q.options.forEach(o => (html += `<tr><td>${o.label}</td><td>${o.count}</td><td>${Math.round((o.count / total) * 100)}%</td></tr>`))
      } else if (q.type === 'rating' || q.type === 'scale') {
        html += `<tr><th class="hdr">Баға</th><th class="hdr">Саны</th></tr>`
        ;[1,2,3,4,5].forEach((n, idx) => (html += `<tr><td>${n}</td><td>${q.distribution?.[idx] || 0}</td></tr>`))
        html += `<tr><td><b>Орташа</b></td><td><b>${q.average || '—'}</b></td></tr>`
      } else if (q.answers?.length) {
        html += `<tr><th class="hdr">Жауаптар</th></tr>`
        q.answers.forEach(a => (html += `<tr><td>${a}</td></tr>`))
      }
      html += `<tr><td></td></tr>`
    })
    html += `</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${analyticsSurvey?.title || 'survey'}_results.xls`
    a.click()
    URL.revokeObjectURL(url)
    showToastMsg('Excel жүктелді!', 'ok')
  }

  const exportPDF = () => {
    if (!analyticsData) return
    const win = window.open('', '_blank')
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${analyticsSurvey?.title || 'Нәтижелер'}</title><style>body{font-family:Arial,sans-serif;padding:2rem;color:#0F172A;max-width:800px;margin:0 auto}h1{font-size:22px;color:#4F46E5;margin-bottom:4px}.meta{font-size:13px;color:#64748b;margin-bottom:2rem;padding-bottom:1rem;border-bottom:2px solid #e2e8f0}.q-block{margin-bottom:1.5rem;padding:1.2rem;border:1px solid #e2e8f0;border-radius:10px;page-break-inside:avoid}.q-num{font-size:10px;font-weight:700;color:#4F46E5;text-transform:uppercase;margin-bottom:4px;letter-spacing:1px}.q-title{font-size:15px;font-weight:700;margin-bottom:1rem}.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:7px}.bar-label{width:150px;font-size:12px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar-track{flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden}.bar-fill{height:100%;background:#4F46E5;border-radius:5px}.bar-pct{width:38px;font-size:12px;font-weight:700;text-align:right}.text-ans{padding:7px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;margin-bottom:5px}.avg{text-align:center;font-size:22px;font-weight:800;color:#4F46E5;margin-top:.8rem}@media print{body{padding:.5rem}.q-block{page-break-inside:avoid}}</style></head><body><h1>📊 ${analyticsSurvey?.title || ''}</h1><div class="meta">Жауап саны: ${analyticsData.totalResponses || 0} · Сұрақ саны: ${analyticsData.questions?.length || 0} · ${new Date().toLocaleDateString('kk-KZ')}</div>`
    analyticsData.questions?.forEach((q, i) => {
      html += `<div class="q-block"><div class="q-num">Сұрақ ${i + 1}</div><div class="q-title">${q.text}</div>`
      if (q.options) {
        const total = q.options.reduce((s, o) => s + o.count, 0) || 1
        q.options.forEach(o => {
          const pct = Math.round((o.count / total) * 100)
          html += `<div class="bar-row"><div class="bar-label">${o.label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-pct">${pct}%</div></div>`
        })
      } else if (q.type === 'rating' || q.type === 'scale') {
        const maxVal = Math.max(...(q.distribution || [1]), 1)
        ;[1,2,3,4,5].forEach((n, idx) => {
          const cnt = q.distribution?.[idx] || 0
          const pct = Math.round((cnt / maxVal) * 100)
          html += `<div class="bar-row"><div class="bar-label">⭐ ${n}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-pct">${cnt}</div></div>`
        })
        html += `<div class="avg">Орташа: ${q.average || '—'} / 5</div>`
      } else if (q.answers?.length) {
        q.answers.slice(0, 10).forEach(a => (html += `<div class="text-ans">${a}</div>`))
        if (q.answers.length > 10) html += `<div style="font-size:11px;color:#94a3b8">... және ${q.answers.length - 10} жауап</div>`
      }
      html += `</div>`
    })
    html += `</body></html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
    showToastMsg('PDF баспаға жіберілді!', 'ok')
  }

  return (
    <div className="dashboard-page">
      <nav className="nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <Link to="/main" className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="brand-name"><em>Oylar</em></span>
        </Link>
        <div className="nav-right">
          <div className="nav-user-chip">
            <span className="nav-username">{user?.name || 'Қолданушы'}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Шығу</button>
        </div>
      </nav>

      <div className="dashboard-layout" style={{ marginTop: '68px' }}>
        <aside className="sidebar">
          <div className="sb-section-label">Жеке кабинет</div>
          <button className={`sb-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>
            <span className="sb-icon">🏠</span> Шолу
          </button>
          <button className={`sb-item ${activeSection === 'account' ? 'active' : ''}`} onClick={() => setActiveSection('account')}>
            <span className="sb-icon">👤</span> Профиль
          </button>
          <div className="sb-divider"></div>
          <div className="sb-section-label">Сауалнамалар</div>
          <button className={`sb-item ${activeSection === 'create' ? 'active' : ''}`} onClick={() => setActiveSection('create')}>
            <span className="sb-icon">✏️</span> Жасау
          </button>
          <button className={`sb-item ${activeSection === 'my-surveys' ? 'active' : ''}`} onClick={() => setActiveSection('my-surveys')}>
            <span className="sb-icon">📊</span> Менің сауалнамаларым
            <span className="sb-badge">{overviewStats.surveys}</span>
          </button>
          <div className="sb-divider"></div>
          <Link to="/main" className="sb-item">
            <span className="sb-icon">🔍</span> Барлық сауалнамалар
          </Link>
        </aside>

        <main className="content">
          {activeSection === 'overview' && (
            <div className="section active">
              <div className="c-header">
                <h1 className="c-title">🏠 Шолу</h1>
                <p className="c-sub">Бүгін <strong>{user?.name?.split(' ')[0] || 'Қолданушы'}</strong>, сіздің жеке кабинетіңізге қош келдіңіз!</p>
              </div>
              <div className="c-body">
                <div className="overview-grid">
                  <div className="ov-card"><div className="ov-icon ovi-indigo">📊</div><div className="ov-info"><div className="ov-n">{overviewStats.surveys}</div><div className="ov-l">Менің сауалнамаларым</div></div></div>
                  <div className="ov-card"><div className="ov-icon ovi-green">👥</div><div className="ov-info"><div className="ov-n">{overviewStats.responses}</div><div className="ov-l">Барлық жауаптар</div></div></div>
                  <div className="ov-card"><div className="ov-icon ovi-amber">🔥</div><div className="ov-info"><div className="ov-n">{overviewStats.active}</div><div className="ov-l">Белсенді сауалнамалар</div></div></div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setActiveSection('create')}>✏️ Жаңа сауалнама жасау</button>
                  <button className="btn btn-ghost" onClick={() => setActiveSection('my-surveys')}>📊 Сауалнамаларымды көру</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="section active">
              <div className="c-header"><h1 className="c-title">👤 Профиль</h1><p className="c-sub">Аккаунт мәліметтерін өзгертіңіз</p></div>
              <div className="c-body">
                <div className="profile-card">
                  <div className="profile-top">
                    <div className="profile-info">
                      <div className="form-row">
                        <div className="field">
                          <label className="label">Аты <em>*</em></label>
                          <input className="input" type="text" value={profile.firstName} onChange={(e) => setProfile({...profile, firstName: e.target.value})} placeholder="Асқар"/>
                        </div>
                        <div className="field">
                          <label className="label">Тегі <em>*</em></label>
                          <input className="input" type="text" value={profile.lastName} onChange={(e) => setProfile({...profile, lastName: e.target.value})} placeholder="Сейткали"/>
                        </div>
                      </div>
                      <div className="field">
                        <label className="label">Email</label>
                        <input className="input" type="email" value={profile.email} disabled style={{ background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }}/>
                        <span className="field-hint">Email өзгертуге болмайды</span>
                      </div>
                      <div className="field">
                        <label className="label">Сипаттама</label>
                        <textarea className="textarea" value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} placeholder="Өзіңіз туралы қысқаша жазыңыз..." style={{ minHeight: '70px' }}/>
                      </div>
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button className="btn btn-ghost" onClick={() => setProfile({ firstName: user?.name?.split(' ')[0] || '', lastName: user?.name?.split(' ').slice(1).join(' ') || '', email: user?.email || '', bio: user?.bio || '' })}>↺ Болдырмау</button>
                    <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Сақталуда...' : 'Сақтау'}</button>
                  </div>
                </div>

                <div className="pass-section">
                  <div className="pass-title">🔐 Құпия сөзді өзгерту</div>
                  <form className="form" onSubmit={changePassword}>
                    <div className="field">
                      <label className="label">Ағымдағы құпия сөз</label>
                      <input className="input" type="password" value={passwordData.oldPass} onChange={(e) => setPasswordData({...passwordData, oldPass: e.target.value})} placeholder="••••••••" required/>
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label className="label">Жаңа құпия сөз</label>
                        <input className="input" type="password" value={passwordData.newPass} onChange={(e) => setPasswordData({...passwordData, newPass: e.target.value})} placeholder="Кемінде 8 символ" required minLength={8}/>
                      </div>
                      <div className="field">
                        <label className="label">Растаңыз</label>
                        <input className="input" type="password" value={passwordData.confPass} onChange={(e) => setPasswordData({...passwordData, confPass: e.target.value})} placeholder="Қайта енгізіңіз" required/>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-primary btn-sm">Жаңарту</button>
                    </div>
                  </form>
                </div>

                <div className="danger-zone">
                  <div className="danger-text">
                    <div className="danger-title">⚠️ Аккаунтты жою</div>
                    <div className="danger-desc">Бұл әрекет қайтарылмайды. Барлық сауалнамалар мен деректер жойылады.</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={confirmDeleteAccount}>Аккаунтты жою</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'create' && (
            <div className="section active">
              <div className="c-header"><h1 className="c-title">✏️ Сауалнама жасау</h1><p className="c-sub">Шаблон таңдаңыз немесе нөлден бастаңыз</p></div>
              <div className="c-body">
                <div className="builder-section">
                  <div className="builder-title">📋 Дайын шаблондар</div>
                  <div className="templates-grid">
                    <div className="tpl-card" onClick={() => loadTemplate('satisfaction')}><div className="tpl-icon">😊</div><div><div className="tpl-name">Қанағаттану сауалнамасы</div><div className="tpl-desc">Клиент немесе қолданушы пікірін жинаңыз</div></div></div>
                    <div className="tpl-card" onClick={() => loadTemplate('demographic')}><div className="tpl-icon">👥</div><div><div className="tpl-name">Әлеуметтік анкета</div><div className="tpl-desc">Жас, мамандық, қызығушылықтар</div></div></div>
                    <div className="tpl-card" onClick={() => loadTemplate('education')}><div className="tpl-icon">🎓</div><div><div className="tpl-name">Білім тексеру</div><div className="tpl-desc">Тест немесе оқу деңгейін анықтаңыз</div></div></div>
                    <div className="tpl-card" onClick={() => loadTemplate('feedback')}><div className="tpl-icon">⭐</div><div><div className="tpl-name">Іс-шара пікірі</div><div className="tpl-desc">Оқиға немесе өнім бойынша баға алыңыз</div></div></div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-title">ℹ️ Сауалнама туралы</div>
                  <div className="form">
                    <div className="field">
                      <label className="label">Атауы <em>*</em></label>
                      <input className="input" type="text" value={builder.title} onChange={(e) => setBuilder({...builder, title: e.target.value})} placeholder="Сауалнама атауын енгізіңіз"/>
                    </div>
                    <div className="field">
                      <label className="label">Сипаттамасы</label>
                      <textarea className="textarea" value={builder.description} onChange={(e) => setBuilder({...builder, description: e.target.value})} placeholder="Қысқаша сипаттама (міндетті емес)"/>
                    </div>
                    <div className="field">
                      <label className="label">🖼️ Сауалнама мұқабасы (міндетті емес)</label>
                      <input type="file" id="surveyImage" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageChange}/>
                      <div className="image-drop-zone" onClick={() => document.getElementById('surveyImage').click()} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', border: `2px dashed ${builder.imageUrl ? 'var(--indigo)' : 'var(--slate-300)'}`, borderRadius: '12px', background: builder.imageUrl ? 'var(--indigo-l)' : 'var(--slate-50)', cursor: 'pointer', transition: 'all .2s' }}>
                        <span style={{ fontSize: '26px' }}>📁</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-700)' }}>{builder.imageUrl ? 'Сурет жүктелді' : 'Файл таңдау үшін басыңыз'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '2px' }}>JPEG, PNG, WebP · Ең көбі 3 МБ</div>
                        </div>
                        {builder.imageUrl && <span style={{ marginLeft: 'auto', fontSize: '18px', color: 'var(--rose)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setBuilder({...builder, imageUrl: null}); document.getElementById('surveyImage').value = '' }}>✕</span>}
                      </div>
                      {builder.imageUrl && <div style={{ marginTop: '10px', width: '100%', height: '160px', borderRadius: '10px', backgroundSize: 'cover', backgroundPosition: 'center', border: '1.5px solid var(--slate-200)', backgroundImage: `url(${builder.imageUrl})` }}/>}
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-title">❓ Сұрақтар <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--slate-400)' }}>{builder.questions.length > 0 && `(${builder.questions.length} сұрақ)`}</span></div>
                  <div className="q-list">
                    {builder.questions.length === 0 ? <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--slate-400)', fontSize: '14px' }}>Әлі сұрақ жоқ. Төмендегі батырманы басыңыз.</div> : (
                      builder.questions.map((q, i) => (
                        <div key={i} className="q-item">
                          <span className="q-drag">⠿</span>
                          <div className="q-info">
                            <div className="q-badges"><span className="q-num-badge">Q{i+1}</span><span className="q-type-badge">{TYPE_LABELS[q.type] || q.type}</span></div>
                            <div className="q-text">{q.text}</div>
                            {q.options && <div className="q-opts-preview">{q.options.join(' · ')}</div>}
                          </div>
                          <div className="q-actions">
                            <button className="q-action-btn q-edit-btn" onClick={() => editQuestion(i)} title="Өзгерту">✏️</button>
                            <button className="q-action-btn q-del-btn" onClick={() => removeQuestion(i)} title="Жою">🗑</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button className="add-q-btn" onClick={() => setShowTypeModal(true)}>＋ Сұрақ қосу</button>
                </div>

                <div className="publish-bar">
                  <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={publishSurvey} disabled={publishing}>{publishing ? 'Жариялануда...' : '📤 Жариялау'}</button>
                  <button className="btn btn-ghost btn-lg" onClick={saveDraft}>💾 Нобайға сақтау</button>
                  <button className="btn btn-ghost btn-sm" onClick={resetBuilder}>↺ Тазалау</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'my-surveys' && (
            <div className="section active">
              <div className="c-header"><h1 className="c-title">📊 Менің сауалнамаларым</h1><p className="c-sub">{mySurveys.length} сауалнама</p></div>
              <div className="c-body">
                <div className="surveys-toolbar">
                  <div className="surveys-search">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Іздеу..." value={surveysSearch} onChange={(e) => setSurveysSearch(e.target.value)}/>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveSection('create')}>＋ Жаңа сауалнама</button>
                </div>
                <div className="surveys-grid">
                  {loadingSurveys ? <div className="spinner"></div> : filteredSurveys.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                      <div className="empty-icon">📭</div>
                      <div className="empty-title">Сауалнама жоқ</div>
                      <div className="empty-desc">Алғашқы сауалнамаңызды жасаңыз!</div>
                      <button className="btn btn-primary" onClick={() => setActiveSection('create')}>✏️ Жасау</button>
                    </div>
                  ) : (
                    filteredSurveys.map(s => {
                      const isActive = s.isPublished !== false
                      return (
                        <div key={s.id} className="s-card" style={{ position: 'relative' }}>
                          {s.imageUrl && <img src={s.imageUrl} alt="Cover" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '16px 16px 0 0' }}/>}
                          <div className="s-card-header">
                            <div className="s-card-title">{s.title}</div>
                            <div className="s-card-stats"><span>👥 {s.response_count || 0} жауап</span><span>📅 {timeAgo(s.created_at)}</span></div>
                          </div>
                          <div className="s-card-body">
                            <div className="s-card-desc">{s.description || 'Сипаттама жоқ'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--slate-100)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-600)' }}>👤 {user?.name || 'Қолданушы'}</span>
                              </div>
                              <span className={`s-status ${isActive ? 'active' : 'draft'}`}>{isActive ? 'Белсенді' : 'Нобай'}</span>
                            </div>
                          </div>
                          <div className="s-card-actions">
                            <button className="s-act-btn" onClick={() => shareSurvey(s.id)} title="Сілтемені көшіру">🔗 Бөлісу</button>
                            <button className="s-act-btn" onClick={() => openAnalytics(s)}>📊 Анализ</button>
                            <button className="s-act-btn" onClick={() => toggleSurveyStatus(s.id, isActive)}>{isActive ? '⏸' : '▶'}</button>
                            <button className="s-act-btn danger" onClick={() => deleteSurvey(s.id, s.title)}>🗑</button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showTypeModal && (
        <div className="overlay open" onClick={(e) => e.target === e.currentTarget && setShowTypeModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">Сұрақ түрін таңдаңыз</span><button className="modal-close" onClick={() => setShowTypeModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="q-type-grid">
                <div className="q-type-opt" onClick={() => addQuestion('single')}><div className="q-type-icon">⭕</div><div className="q-type-name">Бір жауап</div><div className="q-type-desc">Radio button</div></div>
                <div className="q-type-opt" onClick={() => addQuestion('multiple')}><div className="q-type-icon">☑️</div><div className="q-type-name">Бірнеше жауап</div><div className="q-type-desc">Checkbox</div></div>
                <div className="q-type-opt" onClick={() => addQuestion('text')}><div className="q-type-icon">📝</div><div className="q-type-name">Ашық жауап</div><div className="q-type-desc">Мәтін өрісі</div></div>
                <div className="q-type-opt" onClick={() => addQuestion('rating')}><div className="q-type-icon">⭐</div><div className="q-type-name">Рейтинг (1-5)</div><div className="q-type-desc">Баға беру шкаласы</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditorModal && (
        <div className="overlay open" onClick={(e) => e.target === e.currentTarget && setShowEditorModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">{editingQIdx !== null ? 'Сұрақты өзгерту' : `Сұрақ қосу — ${TYPE_LABELS[currentQType] || currentQType}`}</span><button className="modal-close" onClick={() => setShowEditorModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form">
                <div className="field">
                  <label className="label">Сұрақ мәтіні <em>*</em></label>
                  <textarea className="input" value={editorText} onChange={(e) => setEditorText(e.target.value)} placeholder="Сұрақты енгізіңіз" style={{ resize: 'vertical', minHeight: '70px' }}/>
                </div>
                {(currentQType === 'single' || currentQType === 'multiple') && (
                  <div style={{ display: 'block' }}>
                    <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Жауап нұсқалары <em>*</em></label>
                    <div className="form" style={{ gap: '8px', marginBottom: '10px' }}>
                      {editorOptions.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px' }}>
                          <textarea className="input opt-input" placeholder="Нұсқа..." value={opt} onChange={(e) => { const newOpts = [...editorOptions]; newOpts[i] = e.target.value; setEditorOptions(newOpts) }} style={{ flex: 1, resize: 'none', overflow: 'hidden', minHeight: '44px', paddingTop: '11px' }}/>
                          <button type="button" className="btn btn-ghost btn-sm" style={{ flexShrink: 0, height: '44px' }} onClick={() => setEditorOptions(editorOptions.filter((_, idx) => idx !== i))}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setEditorOptions([...editorOptions, ''])}>＋ Нұсқа қосу</button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEditorModal(false)}>Бас тарту</button>
              <button className="btn btn-primary btn-sm" onClick={saveQuestion}>Сақтау</button>
            </div>
          </div>
        </div>
      )}

      {analyticsOpen && analyticsData && (
        <div className="overlay open" onClick={(e) => e.target === e.currentTarget && closeAnalytics()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">📊 {analyticsSurvey?.title || 'Аналитика'}</div>
                <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '2px' }}>{analyticsSurvey?.response_count || 0} жауап · {timeAgo(analyticsSurvey?.created_at)}</div>
              </div>
              <button className="modal-close" onClick={closeAnalytics}>✕</button>
            </div>
            <div className="modal-body">
              <div className="analytics-overview">
                <div className="an-stat"><div className="an-stat-n">{analyticsData.totalResponses || 0}</div><div className="an-stat-l">Жауап бергендер</div></div>
                <div className="an-stat"><div className="an-stat-n">{analyticsData.completionRate || 0}%</div><div className="an-stat-l">Аяқталу %</div></div>
                <div className="an-stat"><div className="an-stat-n">{analyticsData.questions?.length || 0}</div><div className="an-stat-l">Сұрақ саны</div></div>
              </div>
              
              {analyticsData.questions?.map((q, i) => (
                <div key={i} className="an-q">
                  <div className="an-q-title">Q{i+1}: {q.text}</div>
                  {['text', 'number', 'email', 'date', 'time'].includes(q.type) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(q.answers || []).slice(0, 5).map((a, idx) => <div key={idx} style={{ padding: '10px 14px', background: 'var(--white)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--slate-100)' }}>{a}</div>)}
                      {(q.answers || []).length > 5 && <div style={{ fontSize: '12px', color: 'var(--slate-400)' }}>+{(q.answers || []).length - 5} жауап</div>}
                    </div>
                  ) : q.options ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        {q.options.map((o, idx) => {
                          const total = q.options.reduce((s, opt) => s + opt.count, 0) || 1
                          return (
                            <div className="bar-row" key={idx}>
                              <div className="bar-label">{o.label}</div>
                              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round(o.count/total*100)}%`, background: 'var(--indigo)' }}/></div>
                              <div className="bar-pct">{Math.round(o.count/total*100)}%</div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="chart-wrap" style={{ height: '120px', marginTop: '8px' }}><canvas id={`chart-${i}`}></canvas></div>
                    </div>
                  ) : (q.type === 'rating' || q.type === 'scale') ? (
                    <><div className="chart-wrap"><canvas id={`chart-${i}`}></canvas></div><div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 800, color: 'var(--indigo)' }}>Орт. баға: {q.average || '—'}</div></>
                  ) : null}
                </div>
              ))}

              <div className="analytics-comments" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid var(--slate-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: '8px' }}>💬 Пікірлер</h3>
                  <span style={{ fontSize: '14px', color: 'var(--slate-400)', fontWeight: 500 }}>{analyticsComments.length} пікір</span>
                </div>
                {analyticsComments.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)', fontSize: '14px', background: 'var(--slate-50)', borderRadius: '12px' }}>📭 Әзірге пікірлер жоқ</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                    {analyticsComments.map((c, idx) => {
                      const ago = timeAgo(c.createdAt)
                      const nameStr = c.author_name || 'Аноним'
                      const init = nameStr.slice(0, 2).toUpperCase()
                      const color = colorFor(nameStr)
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '12px', padding: '16px', background: 'var(--white)', border: '1.5px solid var(--slate-200)', borderRadius: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>{init}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate)' }}>{nameStr}</span>
                              <span style={{ fontSize: '13px', color: 'var(--slate-400)' }}>{ago}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--slate-600)', lineHeight: 1.6 }}>{c.text}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={exportCSV}
                  title="CSV форматында жүктеу"
                  style={{ gap: '6px' }}
                >
                  📄 CSV
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={exportExcel}
                  title="Excel форматында жүктеу"
                  style={{ gap: '6px', color: 'var(--green-d)', borderColor: 'var(--green)' }}
                >
                  📊 Excel
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={exportPDF}
                  title="PDF форматында баспаға шығару"
                  style={{ gap: '6px', color: 'var(--rose-d)', borderColor: 'var(--rose)' }}
                >
                  🖨️ PDF
                </button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeAnalytics}>Жабу</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.type === 'ok' && '✅ '}{toast.type === 'e' && '❌ '}{toast.msg}</div>
    </div>
  )
}

export default DashboardPage