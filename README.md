# Smart Expense

Smart Expense is a full-stack expense tracking app with:

- an Express + TypeScript + MongoDB backend
- a Next.js frontend
- JWT auth with refresh tokens
- transaction categorization using category rules
- bias insights based on spending behavior
- admin tools for users and category-rule management

## Features

- Register, login, refresh, and logout
- Create, edit, delete, and filter transactions
- Auto-categorize transactions using keyword rules
- Generate spending insights by category, merchant, and time bucket
- Dashboard summaries and lightweight charts
- Admin user management
- Admin category-rule management
- User currency preference support
- Learn category rules from transaction corrections

## Tech Stack

- Backend: Express, TypeScript, Mongoose, JWT, bcrypt
- Frontend: Next.js, React, TypeScript
- Database: MongoDB

## Project Structure

```text
smart-expense-backend/
├─ src/                 # Express backend
├─ frontend/            # Next.js frontend
├─ scripts/             # Root dev helpers
├─ dist/                # Backend build output
└─ README.md
```

## Environment Variables

Create a root `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_here
PORT=5000
APP_TIMEZONE=Asia/Dubai
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Notes:

- If your backend runs on a different port, update `NEXT_PUBLIC_API_BASE_URL` to match.
- `APP_TIMEZONE` is used for timezone-aware trend summaries. If omitted, the backend falls back to server timezone logic.

## Installation

Install backend dependencies from the repo root:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Running The App

Run both backend and frontend together from the root:

```bash
npm run dev
```

This starts:

- backend API on `http://localhost:5000` if `PORT=5000`
- frontend on `http://localhost:3000`

You can also run them separately:

Backend only:

```bash
npm run dev:backend
```

Frontend only:

```bash
cd frontend
npm run dev
```

## Backend Scripts

- `npm run dev` - starts backend and frontend together
- `npm run dev:backend` - starts only the backend
- `npm run dev:frontend` - starts only the frontend from the root
- `npm run build` - builds the backend TypeScript code
- `npm start` - runs the built backend from `dist`

## Main API Areas

- `/api/auth`
  - register, login, refresh, logout, update currency
- `/api/transactions`
  - create, list, filter, update, delete, summary
- `/api/insights`
  - fetch and generate insights
- `/api/admin`
  - manage users and category rules

Health check:

- `GET /health`

## Category Rule System

The app starts with seed data, but the rule system is no longer seed-only.

You can:

- create and edit rules from the admin section
- adjust whether rules are active
- let users teach the system new merchant keywords by correcting transactions

This means the rule engine can improve over time based on real user behavior.

## Currency Support

Users can select their preferred display currency in the frontend header.

Currently supported:

- `USD`
- `INR`
- `AED`
- `EUR`
- `GBP`

Amounts are stored as numbers and formatted in the frontend based on the user preference.

## Suggested First Steps After Cloning

1. Add your `.env`
2. Add `frontend/.env.local`
3. Start MongoDB
4. Run `npm install`
5. Run `cd frontend && npm install`
6. Run `npm run dev`

## GitHub Push Checklist

Before pushing, make sure you are **not** committing:

- `.env`
- `frontend/.env.local`
- `node_modules`
- `dist`
- `frontend/.next`

These are already covered by ignore rules in this repo.
