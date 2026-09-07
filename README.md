# 🕵️‍♂️ AI Debug Detective

**AI Debug Detective** is a full-stack, gamified educational platform designed to help developers level up their debugging skills. Step into the shoes of a code detective to investigate, diagnose, and fix broken code across multiple languages. Equipped with a real-time AI mentor and a live execution sandbox, you can solve cases, earn XP, and climb the ranks.

---

## ✨ Features

- **Live Code Execution Sandbox**: Write and execute real Python, Java, JavaScript, or C++ code securely in the browser using the Piston API integration.
- **AI-Powered Detective Toolkit**: 
  - **Streaming Chat**: Ask the "Detective AI" (powered by Gemini 3.1 Flash) questions about the codebase.
  - **Context-Aware Hints**: Purchase hints using earned coins. The AI reads your current code and the latest terminal output to give you personalized, non-spoiler guidance.
  - **Automated Evaluation**: Submit your final fix to the AI for grading. It evaluates correctness, time/space complexity, and test passes.
- **Professional IDE Experience**: Integrated `@monaco-editor/react` with a seamless togglable Diff View to compare your fix side-by-side with the original broken code.
- **Gamification Progression**: Earn XP, collect coins, build daily streaks, and increase your Detective Rank (Level) stored securely in Firebase Firestore.
- **Industry-Standard Architecture**: Built with robust state management (Zustand & TanStack React Query), schema validation (Zod), and sleek animations (Framer Motion).

---

## 🛠️ Tech Stack

**Frontend**
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS, Framer Motion (Animations), Sonner (Toasts)
- **State Management**: Zustand (Auth/Local State), TanStack React Query (Server State)
- **Editor**: Monaco Editor (`@monaco-editor/react`)

**Backend**
- **Server**: Express.js (Node.js) with Vite Middleware
- **AI Integration**: Google Gemini API (`@google/genai`) using Server-Sent Events (SSE) for real-time streaming
- **Execution Engine**: Piston API (Remote code execution)
- **Validation**: Zod (Schema parsing)

**Infrastructure & Database**
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication (Google OAuth)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Firebase Project (with Firestore and Authentication enabled)
- A Google Gemini API Key

### Environment Variables
Create a `.env` file in the root directory and add the following variables:

```env
# Gemini API Key (Server-side only)
GEMINI_API_KEY=your_gemini_api_key

# Firebase Configuration (Client-side)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### Installation & Running

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```
   *Note: This project uses a custom Express server (`server.ts`) that runs Vite in middleware mode. The server starts on `http://localhost:3000`.*

3. **Database Seeding**
   Upon first login, the application will automatically seed your Firestore database with beginner cases if the `cases` collection is empty.

---

## 📁 Project Structure

```text
├── server.ts                 # Express backend (AI Streaming, Code Execution API)
├── src/
│   ├── components/           # Reusable React components (Auth, Layouts)
│   ├── lib/                  # Firebase setup, Database seeding logic
│   ├── pages/                # Main views (Landing, Dashboard, Investigation, Profile)
│   ├── store/                # Zustand stores (Auth state)
│   ├── App.tsx               # App routing and React Query/Error Boundary providers
│   └── main.tsx              # React DOM entry point
├── firestore.rules           # Firestore security and validation rules
├── package.json              # Dependencies and scripts
└── README.md                 # You are here!
```

---

## 🧠 How the AI Works

The backend utilizes `gemini-3.1-flash` to act as an educational mentor. 
- **System Prompting**: The AI is strictly instructed to act as a mentor, never directly giving the answer, but guiding the user based on pedagogical principles.
- **Context Injection**: When a user asks for a hint or chats with the AI, the frontend sends the *current editor code* and the *most recent terminal output*. This allows the AI to say, "I see you got a NullPointerException on line 12..." making it feel like a real pairing session.
- **Streaming**: Responses use `generateContentStream` and Server-Sent Events to type out the response instantly on the frontend, eliminating loading screens.

## 🔒 Security

- **Client-Side**: Firebase Authentication handles secure user sessions.
- **Database**: `firestore.rules` enforces Role-Based Access Control (RBAC) and validates data shapes before writes.
- **Execution**: User code is never executed directly on the host server. It is proxied to the secure, sandboxed Piston execution API.
- **Secrets**: The Gemini API key remains strictly on the Node.js server and is never shipped to the browser.
