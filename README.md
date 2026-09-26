<div align="center">

# 🐛 Bug Hunter AI

### A gamified debugging platform where developers solve real code bugs with AI assistance.

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-brightgreen?style=for-the-badge)](https://bug-hunter-ai-m1n1.onrender.com)
[![GitHub Repo](https://img.shields.io/badge/GitHub-bug--hunter--ai-181717?style=for-the-badge&logo=github)](https://github.com/yashrajagawane/bug-hunter-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [How It Works](#-how-it-works)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Firestore Data Model](#-firestore-data-model)
- [Achievement System](#-achievement-system)
- [Security](#-security)
- [Admin Panel](#-admin-panel)
- [Scripts Reference](#-scripts-reference)
- [Production Deployment](#-production-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 Overview

**Bug Hunter AI** transforms debugging into an immersive detective experience. Instead of staring at broken code alone, you step into the role of a detective — receiving a "case file" containing a buggy program, a problem description, and a set of clues.

You investigate, hypothesize, and fix the bug within a time limit. If you're stuck, you can call on your **AI Detective Assistant** (powered by Google Gemini) for contextual hints — at the cost of coins. Your fixes are verified, XP is awarded, achievements unlock, and your rank climbs the global leaderboard.

Built for developers who want to sharpen their debugging instincts in a competitive, AI-augmented environment.

---

## 🎬 How It Works

```
1. Browse Cases     →   Pick a bug to investigate (filter by language / difficulty)
2. Open Case File   →   Read the description, examine the broken code
3. Investigate      →   Use the Monaco editor to write your fix
4. Run & Verify     →   Execute code via Piston API; see output instantly
5. Request Hints    →   Ask the AI Detective for nudges, clues, or reveals (costs coins)
6. Submit Fix       →   Diff view shows your changes; case is marked solved
7. Earn XP & Rank   →   First-time solves award XP; achievements unlock automatically
```

---

## ✨ Features

### 🎮 Core Gameplay

| Feature | Description |
|---|---|
| **12+ Debugging Cases** | Pre-seeded cases across JS, Python, Java, C++ |
| **Monaco Code Editor** | VS Code-grade editing experience in the browser |
| **Live Code Execution** | Piston API runs your code; Gemini acts as fallback simulator |
| **Diff Viewer** | Side-by-side original vs. fixed code comparison |
| **Countdown Timer** | Each case has a time limit; auto-submits on expiry |
| **Case Deduplication** | XP awarded only on the **first** successful solve per case |

---

### 🤖 AI Detective Assistant

Powered by **Google Gemini** with streaming responses. The assistant understands the case context and gives targeted guidance — not generic advice.

**3-Tier Progressive Hint System:**

| Tier | Name | Cost | What You Get |
|---|---|---|---|
| 1️⃣ | 💡 Nudge | 10 🪙 | A subtle direction — "look at the loop condition" |
| 2️⃣ | 🔍 Clue | 25 🪙 | More specific — identifies the problematic block |
| 3️⃣ | 🗝️ Reveal | 50 🪙 | Near-complete explanation of the bug and fix approach |

Hints are contextual — the AI reads the actual buggy code, not a generic template.

---

### 🏆 Progression & Gamification

#### XP & Leveling
- XP awarded on first-time solves (no farming)
- Auto level-up when XP crosses thresholds
- Toast notification on level advancement
- Rank titles unlock as you level up (e.g. Rookie → Detective → Senior Investigator)

#### Daily Streaks
- Tracks consecutive days with at least one solve
- Streak resets at midnight if no solve that day
- Displayed on profile and leaderboard

#### Real-Time Leaderboard
- Global rankings refreshed in real time via Firestore listeners
- Sorted by: **XP** | **Cases Solved** | **Streak**
- Shows avatar, username, rank title, and stats

#### Achievement System
- **14 achievements** across 4 rarity tiers: Common → Uncommon → Rare → Legendary
- Unlock conditions are checked automatically on every solve
- Displayed as collectible badges on your profile
- See full list → [Achievement System](#-achievement-system)

---

### 🛠️ Admin Features

- **Case Management** — Create, edit, delete cases via the `/admin` panel
- **AI Case Generator** — Describe a topic + pick language + difficulty → Gemini generates a full case (description, buggy code, solution, hints)
- **Live Search + Filter** — Search by title/description; filter by difficulty on Dashboard

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript (strict) | Type safety across components |
| Vite | Build tool & dev server |
| TailwindCSS v4 | Utility-first styling |
| Framer Motion | Animations & transitions |
| Monaco Editor | VS Code-like code editor |
| react-markdown | Renders AI markdown responses |
| Zustand | Global auth & profile state |
| TanStack React Query | Server state, caching, background refetches |

### Backend

| Technology | Purpose |
|---|---|
| Express | REST API server |
| tsx | TypeScript execution in development |
| esbuild | Production bundling |
| Zod | Request body validation & schema enforcement |

### AI & Execution

| Technology | Purpose |
|---|---|
| Google Gemini API (`@google/genai`) | Streaming chat, hints, case generation |
| Piston API | Sandboxed multi-language code execution |
| Gemini fallback | Simulates execution when Piston is unavailable |

### Infrastructure

| Technology | Purpose |
|---|---|
| Firebase Firestore | Real-time NoSQL database |
| Firebase Authentication | Google Sign-In & ID token verification |
| Firebase Admin SDK | Server-side token verification |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│  React 19 + TypeScript + Vite                           │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐     │
│  │ Zustand  │  │ TanStack │  │   Monaco Editor    │     │
│  │  Store   │  │  Query   │  │  + react-markdown  │     │
│  └──────────┘  └──────────┘  └────────────────────┘     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Bearer token)
┌────────────────────────▼────────────────────────────────┐
│                   EXPRESS SERVER                        │
│                                                         │
│  /api/chat         → Gemini streaming chat              │
│  /api/hint         → Gemini contextual hints            │
│  /api/execute      → Piston API (+ Gemini fallback)     │
│  /api/admin/cases  → Case CRUD                          │
│  /api/admin/generate → Gemini case generation           │
└────────┬──────────────────────────┬─────────────────────┘
         │                          │
┌────────▼────────┐      ┌──────────▼───────────┐
│  Google Gemini  │      │  Firebase Firestore  │
│  API            │      │  + Firebase Auth     │
└─────────────────┘      └──────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org)
- **Firebase project** with Firestore + Google Auth enabled — [Console](https://console.firebase.google.com)
- **Gemini API key** — [Google AI Studio](https://aistudio.google.com)
- **Firebase CLI** — `npm install -g firebase-tools`

---

### Step 1 — Clone & Install

```bash
git clone https://github.com/yashrajagawane/bug-hunter-ai.git
cd bug-hunter-ai
npm install
```

---

### Step 2 — Configure Environment

```bash
cp .env.example .env
```

Fill in `.env` — see full reference below → [Environment Variables](#-environment-variables)

---

### Step 3 — Firebase Setup

```bash
# Login to Firebase CLI
firebase login

# Link to your Firebase project
firebase use --add

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy composite indexes (required for leaderboard queries)
firebase deploy --only firestore:indexes
```

> See [Firebase Setup](#-firebase-setup) for detailed console steps.

---

### Step 4 — Start Development

```bash
npm run dev
```

App runs at → `http://localhost:3000`

The backend Express server and Vite dev server start concurrently.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Gemini API key from Google AI Studio |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID (server-side token verification) |
| `APP_URL` | ✅ (prod) | Your production domain — used for CORS |
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase client config |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase client config |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase client config |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase client config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase client config |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase client config |

```env
# ── AI ─────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ── Firebase Admin (server) ────────────────────────────
FIREBASE_PROJECT_ID=your_project_id

# ── CORS (production only) ─────────────────────────────
APP_URL=https://your-app.example.com

# ── Firebase Client (Vite frontend) ───────────────────
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> ⚠️ `VITE_*` variables are embedded in the client bundle at build time. Never put secrets in `VITE_*` variables.

---

## 🔥 Firebase Setup

### Authentication

1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Add your domain to **Authorized domains**

### Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Native mode**
3. Select a region close to your users

### Security Rules

Rules are in `firestore.rules`. Key constraints enforced:
- Users can only write to their own document
- XP updates are validated (numeric, non-negative)
- Case writes are admin-only
- Leaderboard reads are public; writes are server-only

```bash
firebase deploy --only firestore:rules
```

### Indexes

Composite indexes power the leaderboard's multi-field sort queries:

```bash
firebase deploy --only firestore:indexes
```

---

## 🗂 Project Structure

```
bug-hunter-ai/
│
├── src/
│   │
│   ├── components/
│   │   └── AuthProvider.tsx        # Firebase auth state listener; syncs to Zustand on login/logout
│   │
│   ├── lib/
│   │   ├── achievements.ts         # All 14 achievement definitions + unlock condition checkers
│   │   ├── firebase.ts             # Firebase app + Firestore + Auth client initialisation
│   │   ├── seed.ts                 # 12 built-in seed cases; auto-loads into Firestore on first visit
│   │   ├── types.ts                # All shared TypeScript interfaces (Case, User, Achievement, etc.)
│   │   └── utils.ts                # Pure helpers: getRankTitle(), timeAgo(), formatXP(), etc.
│   │
│   ├── pages/
│   │   ├── Admin.tsx               # Admin-only: case list, manual create/delete, AI case generator
│   │   ├── Dashboard.tsx           # Case browser: player card, live search, difficulty filter
│   │   ├── Investigation.tsx       # Core gameplay: editor, timer, hints, execution, diff, submit
│   │   ├── Leaderboard.tsx         # Real-time global rankings with Firestore snapshot listener
│   │   ├── LandingPage.tsx         # Marketing/entry page for unauthenticated users
│   │   ├── NotFound.tsx            # 404 fallback
│   │   └── Profile.tsx             # User stats, solve heatmap, achievement badge grid
│   │
│   └── store/
│       └── authStore.ts            # Zustand store: auth state, user profile, coins, XP
│
├── server.ts                       # Express server — all /api/* routes
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Composite index definitions for leaderboard
├── .env.example                    # Environment variable template
├── vite.config.ts                  # Vite config (proxy, aliases)
├── tailwind.config.ts              # TailwindCSS config
└── tsconfig.json                   # TypeScript config (strict)
```

---

## 📡 API Reference

All routes require `Authorization: Bearer <firebase_id_token>` unless noted.

### AI & Hints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Streaming Gemini detective assistant chat |
| `POST` | `/api/hint` | Returns a contextual hint for the given case + tier |

**`POST /api/hint` — Request Body:**
```json
{
  "caseId": "string",
  "buggyCode": "string",
  "language": "javascript",
  "tier": 1
}
```

**`POST /api/hint` — Response:**
```json
{
  "hint": "Check the termination condition in your for loop..."
}
```

---

### Code Execution

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/execute` | Runs code via Piston API; falls back to Gemini simulation |

**Request Body:**
```json
{
  "language": "python",
  "code": "print('hello')",
  "stdin": ""
}
```

**Response:**
```json
{
  "stdout": "hello\n",
  "stderr": "",
  "exitCode": 0
}
```

---

### Admin (requires `isAdmin: true`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/cases` | List all cases |
| `POST` | `/api/admin/cases` | Create a new case manually |
| `DELETE` | `/api/admin/cases/:id` | Delete a case by ID |
| `POST` | `/api/admin/generate` | Generate a case via Gemini AI |

**`POST /api/admin/generate` — Request Body:**
```json
{
  "language": "javascript",
  "difficulty": "medium",
  "topic": "async/await"
}
```

---

## 🗄 Firestore Data Model

### `users/{uid}`
```
{
  uid: string
  displayName: string
  email: string
  photoURL: string
  xp: number
  level: number
  coins: number
  casesSolved: string[]          // array of solved caseIds
  streak: number
  lastSolveDate: Timestamp
  achievements: string[]         // array of achievement IDs
  isAdmin: boolean               // default: false
  createdAt: Timestamp
}
```

### `cases/{caseId}`
```
{
  id: string
  title: string
  description: string
  language: "javascript" | "python" | "java" | "cpp"
  difficulty: "easy" | "medium" | "hard"
  buggyCode: string
  solution: string
  hints: {
    nudge: string
    clue: string
    reveal: string
  }
  xpReward: number
  timeLimit: number              // seconds
  createdAt: Timestamp
}
```

### `leaderboard/{uid}` (denormalized for query performance)
```
{
  uid: string
  displayName: string
  photoURL: string
  xp: number
  casesSolved: number
  streak: number
  level: number
  rankTitle: string
}
```

---

## 🏅 Achievement System

14 achievements across 4 rarity tiers. Unlocked automatically on solve.

| Rarity | Color | Achievements |
|---|---|---|
| ⚪ Common | Grey | First Bug, Coin Collector, Case Browser |
| 🟢 Uncommon | Green | Streak Starter (3 days), Polyglot (3 languages), Speed Solver |
| 🔵 Rare | Blue | 10 Cases Solved, Hint Miser (0 hints), Week Streak (7 days) |
| 🟣 Legendary | Purple | 25 Cases Solved, Month Streak (30 days), Coin Hoarder, Bug Master, All Languages |

Achievement definitions live in `src/lib/achievements.ts`. Each entry exports:
- `id` — unique key stored in `users.achievements[]`
- `title` & `description` — display text
- `rarity` — one of `common | uncommon | rare | legendary`
- `check(user, solveContext)` — pure function; returns `true` when earned

---

## 🔒 Security

### Authentication
- Every `/api/*` request must include a valid Firebase ID token in the `Authorization` header
- Server verifies the token using Firebase Admin SDK before processing any request
- Admin routes additionally check `isAdmin: true` on the Firestore user document

### Rate Limiting
| Endpoint Group | Limit |
|---|---|
| AI endpoints (`/api/chat`, `/api/hint`) | 20 requests / minute / IP |
| Code execution (`/api/execute`) | 30 requests / minute / IP |

### CORS
- In development: open (allows `localhost`)
- In production: restricted to `APP_URL` only

### Firestore Rules Summary
- Users can read/write only their own document
- XP and coin values are validated as non-negative numbers
- Cases are publicly readable, but only admin-authenticated server can write
- Leaderboard is publicly readable; server-only writes

### XP Integrity
- Deduplication is enforced via `users.casesSolved[]` array
- Server checks before awarding XP — client cannot trigger duplicate awards

---

## 🛡 Admin Panel

### Granting Admin Access

Manually set `isAdmin: true` on the user's Firestore document:

```
Firebase Console → Firestore → users → {uid} → Edit → isAdmin: true
```

Or via Firebase Admin SDK:
```javascript
await admin.firestore().collection('users').doc(uid).update({ isAdmin: true });
```

### Admin Capabilities

Once granted, `/admin` unlocks:

| Action | Description |
|---|---|
| View all cases | Paginated list with language + difficulty badges |
| Create case manually | Full form: title, description, code, solution, hints, XP reward |
| Delete case | Permanent deletion from Firestore |
| Generate via AI | Input language + difficulty + optional topic → Gemini outputs a complete case |

---

## 📜 Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start Vite + Express concurrently in development |
| `npm run build` | Type-check + Vite build + esbuild server bundle |
| `npm start` | Run production build |
| `npm run lint` | ESLint across `src/` and `server.ts` |
| `npm run typecheck` | `tsc --noEmit` — type-check without emitting |

---

## 🚢 Production Deployment

Live demo: [bug-hunter-ai-m1n1.onrender.com](https://bug-hunter-ai-m1n1.onrender.com)

### Build

```bash
npm run build
```

This produces:
- `dist/` — Vite-built frontend assets
- `dist/server.js` — esbuild-bundled Express server

### Start

```bash
npm start
```

### Environment Checklist

- [ ] `GEMINI_API_KEY` set
- [ ] All `VITE_FIREBASE_*` variables set
- [ ] `FIREBASE_PROJECT_ID` set
- [ ] `APP_URL` set to your production domain
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed
- [ ] Production domain added to Firebase Auth → Authorized Domains

### Recommended Hosting

| Layer | Option |
|---|---|
| Frontend | Vercel, Netlify, Firebase Hosting |
| Backend | Railway, Render, Fly.io, Cloud Run |
| Database | Firebase Firestore (already cloud-hosted) |

> If deploying frontend and backend separately, set `APP_URL` to the frontend domain and proxy `/api/*` from the frontend host to the backend host.

---

## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# 1. Fork the repo
# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Commit your changes
git commit -m "feat: describe your change"

# 4. Push to your fork
git push origin feature/your-feature-name

# 5. Open a Pull Request
```

### Guidelines
- Follow existing TypeScript strict patterns
- Add Zod validation for any new API endpoints
- Keep Firestore security rules updated for new collections
- Test admin routes with `isAdmin: true` on your dev account

---

## 📄 License

[MIT](LICENSE) © [Yashraj Agawane](https://github.com/yashrajagawane)

---

<div align="center">

Built with ❤️ using React, Firebase, and Google Gemini

⭐ **Star this repo** if you found it useful!

</div>
