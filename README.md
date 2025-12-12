Hackathon 2025 Backend (NestJS)
==============================

NestJS backend for Hackathon 2025, providing:

- Session-based authentication (cookie session)
- WeatherAPI.com integration
- Gemini AI disaster risk simulation
- PostgreSQL with TypeORM
- LAN-accessible backend for team collaboration

---

Tech Stack
----------

- Node.js 18+
- NestJS
- TypeORM
- PostgreSQL
- WeatherAPI.com
- Google Gemini (LLM)
- express-session

---

Requirements
------------

- Node.js 18 or newer
- npm
- PostgreSQL (local or Docker)

---

Environment Setup
-----------------

1. Create environment file

cp .env.example .env

2. Configure .env

NODE_ENV=development
PORT=3000

SESSION_SECRET=change-me

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=hackathon_db

WEATHER_API_KEY=your_weatherapi_key_here
GEMINI_API_KEY=your_gemini_api_key_here

---

Install Dependencies
--------------------

npm install

---

Run in Development Mode
-----------------------

npm run start:dev

API base URL:

http://localhost:3000/api

---

Access Backend from LAN (For Teammates)
---------------------------------------

1. Bind server to all interfaces

await app.listen(process.env.PORT || 3000, '0.0.0.0');

2. Find your LAN IP (Windows)

ipconfig

Look for IPv4 address like 192.168.x.x

3. Teammates can access backend via:

http://YOUR_LAN_IP:3000/api

Example:

http://192.168.1.50:3000/api

---

CORS and Session Notes (IMPORTANT)
---------------------------------

This backend uses session-based authentication:

- CORS must allow credentials
- Frontend requests must include cookies
- Do NOT use origin "*" with credentials

Recommended CORS config:

app.enableCors({
  origin: true,
  credentials: true
});

Session cookie config for LAN HTTP:

sameSite = lax
secure = false

---

Frontend Cookie Requirements
----------------------------

Fetch example:

fetch('http://YOUR_LAN_IP:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username, password })
});

Axios example:

axios.post(
  'http://YOUR_LAN_IP:3000/api/auth/login',
  { username, password },
  { withCredentials: true }
);

---

API Endpoints
-------------

Auth:
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me
- POST /api/auth/logout

Disaster Prediction:
- POST /api/disaster/predict

Example request body:

{ "locationName": "Ho Chi Minh City", "lang": "vi" }

---

Swagger (Optional)
------------------

If Swagger is enabled:

http://localhost:3000/api-docs
