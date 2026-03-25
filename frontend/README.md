# Smart Expense Frontend

Separate Next.js frontend for the existing `smart-expense-backend` API.

## Why a separate folder

Keeping the frontend in `frontend/` is the cleanest setup here:

- The backend remains focused on Express, MongoDB, and API concerns.
- The frontend can use Next.js conventions without colliding with backend build output.
- You can later split deployment cleanly if you want separate frontend and backend hosting.

## Expected backend API

This app is wired to these routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/insights`
- `POST /api/insights/generate`
- `GET /api/admin/users`

## Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Run

```bash
cd frontend
npm install
npm run dev
```

Run the backend separately from the repo root.
