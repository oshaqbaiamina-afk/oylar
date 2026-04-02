# 🗣️ Oylar — Онлайн сауалнама платформасы

> Қазақстандық бизнес пен студенттерге арналған онлайн сауалнама жүйесі.  
> Сауалнама жасаңыз, жауап жинаңыз, нәтижені нақты уақытта талдаңыз.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)

---

## 📋 Мазмұны

- [Жоба туралы](#-жоба-туралы)
- [Мүмкіндіктер](#-мүмкіндіктер)
- [Технологиялар](#-технологиялар)
- [Дерекқор схемасы](#-дерекқор-схемасы)
- [Орнату](#-орнату)
- [API эндпоинттер](#-api-эндпоинттер)
- [Жоба құрылымы](#-жоба-құрылымы)
- [Тестілеу](#-тестілеу)
- [Автор](#-автор)

---

## 📌 Жоба туралы

**Oylar** — пайдаланушыларға онлайн сауалнама жасауға, бөлісуге және нәтижелерді талдауға мүмкіндік беретін толық стекті веб-қосымша. Жоба ПМ04 пәні бойынша курстық жоба ретінде жасалды.

**Негізгі мақсат:** Қазақша интерфейсі бар қарапайым және функционалды сауалнама платформасы.

---

## ✨ Мүмкіндіктер

| Мүмкіндік | Сипаттама |
|-----------|-----------|
| 🔐 Аутентификация | Тіркелу, кіру, JWT токен, профиль |
| 📊 Сауалнама конструкторы | Radio, checkbox, text, rating сұрақ түрлері |
| 📈 Нәтижелер аналитикасы | Диаграммалар, статистика, жауаптар тарихы |
| 💬 Пікірлер жүйесі | Сауалнамаларға пікір қалдыру, жою |
| 🔗 Сілтеме арқылы бөлісу | API сілтемесін енгізіп тікелей опросқа өту |
| 🌐 Жалпыға қолжетімді | Тіркелмеген пайдаланушылар да жауап бере алады |
| 📱 Адаптивті дизайн | Телефон, планшет, компьютер |

---

## 🛠 Технологиялар

### Frontend (client/)
- **React 18** — функционалды компоненттер, hooks
- **React Router v6** — клиент жақты маршрутизация
- **Vite 5** — жылдам build және dev сервер
- **CSS Variables** — дизайн токендары (indigo, amber, rose, green)

### Backend (server/)
- **Node.js + Express 5** — REST API сервері
- **PostgreSQL** — реляциялық дерекқор
- **JWT (jsonwebtoken)** — аутентификация токені
- **bcryptjs** — құпия сөзді шифрлау
- **multer** — файл жүктеу

### Тестілеу
- **Mocha + Node assert** — API интеграциялық тесттері

---

## 🗄 Дерекқор схемасы

```
Users
├── id (serial PK)
├── name (varchar 255)
├── email (varchar 255, unique)
├── password (varchar 255, bcrypt)
├── bio (text)
├── createdAt, updatedAt

Surveys
├── id (serial PK)
├── title (varchar 255)
├── description (text)
├── questions (json)        ← [{text, type, options}]
├── isPublished (boolean)
├── imageUrl (text)
├── userId (FK → Users)
├── createdAt, updatedAt

Responses
├── id (serial PK)
├── answers (json)          ← [{questionIndex, answer}]
├── surveyId (FK → Surveys)
├── userId (FK → Users, nullable)
├── createdAt, updatedAt

Comments
├── id (serial PK)
├── text (text)
├── surveyId (FK → Surveys)
├── userId (FK → Users)
├── createdAt, updatedAt
```

---

## 🚀 Орнату

### Талаптар
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Репозиторийді клондау

```bash
git clone https://github.com/username/oylar.git
cd oylar
```

### 2. Дерекқорды дайындау

```sql
-- PostgreSQL-де жаңа дерекқор жасаңыз
CREATE DATABASE oylar;

-- Кестелерді жасаңыз
CREATE TABLE "Users" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Surveys" (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  questions JSON DEFAULT '[]',
  "userId" INTEGER REFERENCES "Users"(id),
  "isPublished" BOOLEAN DEFAULT TRUE,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Responses" (
  id SERIAL PRIMARY KEY,
  answers JSON NOT NULL,
  "surveyId" INTEGER REFERENCES "Surveys"(id),
  "userId" INTEGER REFERENCES "Users"(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Comments" (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  "surveyId" INTEGER REFERENCES "Surveys"(id),
  "userId" INTEGER REFERENCES "Users"(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Backend орнату

```bash
cd server
npm install
```

`server/.env` файлын жасаңыз:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=oylar
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_key_min_32_chars
PORT=9999
```

Серверді іске қосыңыз:

```bash
# Өндіріс режимі
npm start

# Әзірлеу режимі (автоперезапуск)
npm run dev
```

Сервер `http://localhost:9999` мекенжайында іске қосылады.

### 4. Frontend орнату

```bash
cd client
npm install
npm run dev
```

Қосымша `http://localhost:5173` мекенжайында ашылады.

### 5. Build (өндіріске дайындау)

```bash
cd client
npm run build
# Нәтиже: client/dist/ қалтасында
```

---

## 📡 API эндпоинттер

Base URL: `http://localhost:9999/api`

> 🔒 — Авторизация қажет (Bearer токен)

### Аутентификация

| Метод | Эндпоинт | Сипаттама |
|-------|----------|-----------|
| POST | `/auth/register` | Жаңа пайдаланушы тіркеу |
| POST | `/auth/login` | Жүйеге кіру |
| GET | `/auth/me` | 🔒 Ағымдағы пайдаланушы |
| PUT | `/auth/profile` | 🔒 Профильді жаңарту |
| POST | `/auth/change-password` | 🔒 Құпия сөзді өзгерту |
| DELETE | `/auth/delete` | 🔒 Аккаунтты жою |

**Тіркелу мысалы:**
```bash
curl -X POST http://localhost:9999/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Асқар","email":"askar@mail.kz","password":"Secret123"}'
```

**Жауап:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Асқар", "email": "askar@mail.kz" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Сауалнамалар

| Метод | Эндпоинт | Сипаттама |
|-------|----------|-----------|
| GET | `/surveys` | Барлық белсенді сауалнамалар |
| GET | `/surveys/my` | 🔒 Менің сауалнамаларым |
| GET | `/surveys/stats` | Платформа статистикасы |
| GET | `/surveys/:id` | Бір сауалнама |
| GET | `/surveys/:id/results` | 🔒 Сауалнама нәтижелері |
| POST | `/surveys` | 🔒 Жаңа сауалнама жасау |
| PUT | `/surveys/:id` | 🔒 Сауалнаманы жаңарту |
| DELETE | `/surveys/:id` | 🔒 Сауалнаманы жою |

**Сауалнама жасау мысалы:**
```bash
curl -X POST http://localhost:9999/api/surveys \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Тест сауалнамасы",
    "questions": [
      {"text": "Сұрақ?", "type": "radio", "options": ["Иә", "Жоқ"]},
      {"text": "Бағаңыз?", "type": "rating"}
    ],
    "is_active": true
  }'
```

### Жауаптар

| Метод | Эндпоинт | Сипаттама |
|-------|----------|-----------|
| POST | `/responses` | Жауап жіберу (авторизациясыз да болады) |
| GET | `/responses/:surveyId` | 🔒 Барлық жауаптар |
| GET | `/responses/:surveyId/stats` | 🔒 Жауаптар статистикасы |

### Пікірлер

| Метод | Эндпоинт | Сипаттама |
|-------|----------|-----------|
| GET | `/comments/:surveyId` | Пікірлер тізімі |
| POST | `/comments` | 🔒 Пікір қалдыру |
| PUT | `/comments/:id` | 🔒 Пікірді өзгерту |
| DELETE | `/comments/:id` | 🔒 Пікірді жою |

---

## 📁 Жоба құрылымы

```
oylar/
├── client/                     # React фронтенд
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Навигация панелі
│   │   │   └── ProtectedRoute.jsx  # Қорғалған маршрут
│   │   ├── pages/
│   │   │   ├── PublicPage.jsx  # Басты бет (лендинг)
│   │   │   ├── LoginPage.jsx   # Кіру беті
│   │   │   ├── RegisterPage.jsx # Тіркелу беті
│   │   │   ├── MainPage.jsx    # Сауалнамалар тізімі
│   │   │   └── DashboardPage.jsx # Пайдаланушы кабинеті
│   │   ├── utils/
│   │   │   ├── api.js          # Барлық API шақырулары
│   │   │   └── auth.js         # Аутентификация утилиталары
│   │   ├── styles/
│   │   │   └── globals.css     # Глобалды стильдер
│   │   ├── App.jsx             # Маршрутизация
│   │   └── main.jsx            # Кіру нүктесі
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js бэкенд
│   ├── routes/
│   │   ├── auth.js             # /api/auth/* маршруттары
│   │   ├── surveys.js          # /api/surveys/* маршруттары
│   │   ├── responses.js        # /api/responses/* маршруттары
│   │   └── comments.js         # /api/comments/* маршруттары
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT тексеру
│   │   └── errorHandler.js     # Қателерді өңдеу
│   ├── db/
│   │   └── index.js            # PostgreSQL пул
│   ├── uploads/                # Жүктелген файлдар
│   ├── index.js                # Сервер кіру нүктесі
│   ├── package.json
│   └── .env                    # Конфигурация (git-те жоқ!)
│
├── tests/                      # Тесттер
│   ├── oylar.test.mjs          # Mocha интеграциялық тесттер
│   └── package.json
│
└── README.md
```

---

## 🧪 Тестілеу

Жоба Mocha интеграциялық тесттерімен жабылған — барлық негізгі API маршруттары тексерілген.

```bash
# Алдымен сервер жұмыс істеп тұруы керек!
cd server && npm run dev

# Тесттерді іске қосу
cd tests && npm install && npm test
```

**Тест жабылуы:**

| Модуль | Тест саны | Жабылуы |
|--------|-----------|---------|
| Health Check | 1 | ✅ |
| Аутентификация | 7 | ✅ |
| Сауалнамалар | 8 | ✅ |
| Жауаптар | 2 | ✅ |
| Пікірлер | 4 | ✅ |
| Профиль | 2 | ✅ |
| Тазалау | 2 | ✅ |
| **Барлығы** | **26** | ✅ |

---

## 👤 Автор

**Ошақбай Әмина**  
ПМ04 — Web-сайтты жобалау және үздіксіз жұмыс істеуін қамтамасыз ету  
Курстық жоба, 2026 ж.

---

## 📄 Лицензия

MIT License — оқу мақсатында еркін пайдалануға болады.
