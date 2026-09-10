# 🕵️ AI Debug Detective

A gamified debugging platform where detectives solve real code bugs with AI assistance. Built with React 19, Firebase, Express, and the Gemini API.

---

## ✨ Features

- **12+ Debugging Cases** across JavaScript, Python, Java, and C++
- **AI Detective Assistant** — streaming Gemini-powered chat & contextual hints
- **3-Tier Progressive Hints** — Nudge (10🪙) / Clue (25🪙) / Reveal (50🪙)
- **Code Execution** — Piston API with Gemini fallback simulator
- **Diff View** — Side-by-side original vs. your fix
- **Countdown Timer** — Time-limited cases with auto-submit on expiry
- **Leaderboard** — Real-time rankings by XP, Cases Solved, Streak
- **Achievement System** — 14 achievements across 4 rarity tiers
- **Auto Level-Up** — XP thresholds trigger level advancement with toast
- **Daily Streak Tracking** — Consecutive day solve tracking
- **Case Deduplication** — XP awarded only on first-time solve
- **Admin Panel** — CRUD case management + Gemini AI case generation
- **Search & Filter** — Live search + difficulty filter on Dashboard

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS v4, Framer Motion |
| State | Zustand, TanStack React Query |
| Editor | Monaco Editor, react-markdown |
| Backend | Express, tsx (dev), esbuild (prod) |
| AI | Google Gemini API (`@google/genai`) |
| Code Execution | Piston API + Gemini fallback simulator |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google Sign-In) |
| Validation | Zod (server), TypeScript strict (client) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project with Firestore + Google Auth enabled
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ai-debug-detective.git
cd ai-debug-detective
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Gemini AI (required)
GEMINI_API_KEY=your_gemini_api_key

# Firebase Admin SDK (server-side token verification)
FIREBASE_PROJECT_ID=your_project_id

# App URL for CORS (production)
APP_URL=https://your-app.example.com

# Firebase Client (Vite frontend)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Firebase Setup

1. Enable **Google Sign-In** in Firebase Console → Authentication → Sign-in providers
2. Enable **Firestore** in native mode
3. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### 4. Run Development Server

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

---

## 🗂 Project Structure

```
src/
├── components/
│   └── AuthProvider.tsx       # Firebase auth listener + Zustand sync
├── lib/
│   ├── achievements.ts        # 14 achievement definitions + unlock helpers
│   ├── firebase.ts            # Firebase client initialisation
│   ├── seed.ts                # 12 seed cases (auto-loads on first visit)
│   ├── types.ts               # Shared TypeScript interfaces
│   └── utils.ts               # Shared helpers (getRankTitle, timeAgo, etc.)
├── pages/
│   ├── Admin.tsx              # Admin-only case management + AI generator
│   ├── Dashboard.tsx          # Case browser with search/filter, player card
│   ├── Investigation.tsx      # Main investigation workspace
│   ├── Leaderboard.tsx        # Real-time global rankings
│   ├── LandingPage.tsx        # Marketing landing page
│   ├── NotFound.tsx           # 404 page
│   └── Profile.tsx            # User profile, heatmap, achievements
└── store/
    └── authStore.ts           # Zustand global auth + profile store

server.ts                      # Express backend (AI endpoints, code execution)
firestore.rules                # Firestore security rules
firestore.indexes.json         # Composite indexes for leaderboard queries
```

---

## 🔒 Security

- All `/api/*` routes require a valid Firebase ID token (`Authorization: Bearer <token>`)
- Rate limited: 20 AI requests/min, 30 code executions/min per IP
- CORS restricted to `APP_URL` in production
- Firestore rules enforce: numeric bounds, ownership, admin-only case writes
- XP awarded only once per case (Firestore-checked deduplication)

---

## 🛠 Admin Setup

To make a user an admin, manually set `isAdmin: true` on their Firestore user document:

```
Firestore → users → {uid} → isAdmin: true
```

Admins get access to `/admin` which provides:
- List, delete, and manually create cases
- AI-generated case creation via Gemini (language + difficulty + optional topic hint)

---

## 📦 Build for Production

```bash
npm run build
npm start
```

---

## 📄 License

MIT
