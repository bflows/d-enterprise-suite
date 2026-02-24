# D Enterprise Suite

Enterprise management application for companies, employees, and role-based access. Full-stack monorepo with a Next.js frontend and Express API backed by PostgreSQL.

---

## Tech Stack

| Layer    | Technologies |
| -------- | ------------ |
| **Frontend** | Next.js 16, React 19, TypeScript, Redux Toolkit, Tailwind CSS |
| **Backend**  | Express 5, TypeScript, Prisma 7, PostgreSQL |
| **Auth**     | JWT (access + refresh), httpOnly cookies, bcrypt |

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** (local or hosted; connection string required)
- **npm** (included with Node.js)

---

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd d-enterprise-suite
```

Install dependencies for both apps:

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Environment variables

**Backend** (`backend/.env`):

Create `backend/.env` with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=..."
PORT=5000

JWT_ACCESS_SECRET="<long-random-string>"
JWT_REFRESH_SECRET="<different-long-random-string>"
REFRESH_EXPIRY_DAYS=14

# Allowed origin for CORS (frontend URL)
FRONTEND_URL="http://localhost:3000"
```

**Frontend** (`frontend/.env.local`):

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

Use your actual backend URL in production.

### 3. Database

From the repo root:

```bash
cd backend
npx prisma generate
npx prisma db push
# Or, for migrations: npx prisma migrate dev
cd ..
```

### 4. Run development servers

**Terminal 1 – API:**

```bash
cd backend && npm run dev
```

**Terminal 2 – Frontend:**

```bash
cd frontend && npm run dev
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)  
- **API:** [http://localhost:5000](http://localhost:5000) (or whatever `PORT` is in `backend/.env`)

---

## Project Structure

```
d-enterprise-suite/
├── backend/                 # Express API
│   ├── prisma/
│   │   └── schema.prisma    # DB models & migrations
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── lib/
│       └── server.ts
├── frontend/                # Next.js app
│   ├── app/                 # App Router pages & layouts
│   ├── components/
│   ├── features/            # Redux slices & auth
│   └── lib/                 # API client, auth helpers
└── README.md
```

---

## Scripts

| Location   | Command       | Description              |
| --------- | ------------- | ------------------------ |
| `backend` | `npm run dev` | API with hot reload       |
| `backend` | `npm start`   | Production API            |
| `backend` | `npx prisma generate` | Regenerate Prisma client |
| `backend` | `npx prisma db push`  | Sync schema to DB (dev)  |
| `frontend`| `npm run dev` | Next.js dev server       |
| `frontend`| `npm run build` | Production build       |
| `frontend`| `npm start`   | Production Next.js       |
| `frontend`| `npm run lint`| ESLint                   |

---

## Environment Variables Reference

| Variable             | App     | Required | Description |
| -------------------- | ------- | -------- | ----------- |
| `DATABASE_URL`       | Backend | Yes      | PostgreSQL connection string |
| `PORT`               | Backend | No       | API port (default `5000`) |
| `JWT_ACCESS_SECRET`  | Backend | Yes      | Secret for access tokens   |
| `JWT_REFRESH_SECRET` | Backend | Yes      | Secret for refresh tokens  |
| `REFRESH_EXPIRY_DAYS`| Backend | No       | Refresh token TTL in days (default `14`) |
| `FRONTEND_URL`       | Backend | No       | CORS origin (default `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL`| Frontend| No       | API base URL (default `http://localhost:5000`) |

Do not commit real secrets. Use a secret manager or team-shared env templates for private deployment.

---

## License

Proprietary — internal use only. All rights reserved.
