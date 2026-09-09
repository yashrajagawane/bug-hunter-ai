import 'dotenv/config';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// ─────────────────────────────────────────────
// Firebase Admin SDK — for server-side token verification
// ─────────────────────────────────────────────
if (getApps().length === 0) {
  // In production, GOOGLE_APPLICATION_CREDENTIALS env var or service account key is used.
  // In dev (running alongside Vite), we use the project ID from env to init without credentials
  // so the Admin SDK can still verify tokens via Google's public certs.
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  });
}
const adminAuth = getAuth();

// ─────────────────────────────────────────────
// Gemini AI Client
// ─────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// ─────────────────────────────────────────────
// Retry Helper
// ─────────────────────────────────────────────
async function callGeminiWithRetry(modelName: string, contents: any, config?: any, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
    } catch (error: any) {
      if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand") || error?.status === "UNAVAILABLE") {
        if (i < retries - 1) {
          console.warn(`Gemini API 503, retrying in ${Math.pow(2, i)}s...`);
          await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Gemini API call failed after all retries');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ─────────────────────────────────────────────
  // Global Middleware
  // ─────────────────────────────────────────────

  // CORS — only allow the app's own origin in production
  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '100kb' }));

  // ─────────────────────────────────────────────
  // Rate Limiters
  // ─────────────────────────────────────────────

  // Strict limit for AI endpoints (expensive Gemini calls)
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,             // 20 AI requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait before trying again.' },
  });

  // Moderate limit for code execution
  const executeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,             // 30 executions per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many execution requests. Please slow down.' },
  });

  // ─────────────────────────────────────────────
  // Auth Middleware — verifies Firebase ID token
  // ─────────────────────────────────────────────
  async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: missing token' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    }
  }

  // ─────────────────────────────────────────────
  // Zod Schemas for Request Validation
  // ─────────────────────────────────────────────
  const HintSchema = z.object({
    code: z.string().min(1).max(10000),
    bugType: z.string().min(1).max(100),
    level: z.number().int().min(1).max(3),
    terminalOutput: z.string().max(5000).optional()
  });

  const ChatSchema = z.object({
    code: z.string().min(1).max(10000),
    message: z.string().min(1).max(2000),
    terminalOutput: z.string().max(5000).optional()
  });

  const EvaluateSchema = z.object({
    originalCode: z.string().min(1).max(10000),
    submittedCode: z.string().min(1).max(10000),
    expectedBehavior: z.string().min(1).max(5000),
    terminalOutput: z.string().max(5000).optional()
  });

  const ExecuteSchema = z.object({
    language: z.string().min(1).max(20),
    code: z.string().min(1).max(10000)
  });

  // ─────────────────────────────────────────────
  // Health Check
  // ─────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─────────────────────────────────────────────
  // 1. Code Execution Endpoint (Piston API Proxy with Gemini Fallback)
  // ─────────────────────────────────────────────
  app.post("/api/execute", requireAuth, executeLimiter, async (req, res) => {
    try {
      const { language, code } = ExecuteSchema.parse(req.body);
      
      const versionMap: Record<string, string> = {
        'javascript': '18.15.0',
        'python': '3.10.0',
        'java': '15.0.2',
        'cpp': '10.2.0'
      };

      const extensionMap: Record<string, string> = {
        'javascript': 'js',
        'python': 'py',
        'java': 'java',
        'cpp': 'cpp',
      };

      const pistonLang = language.toLowerCase() === 'c++' ? 'cpp' : language.toLowerCase();
      const fileExt = extensionMap[pistonLang] || pistonLang;

      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonLang,
          version: versionMap[pistonLang] || '*',
          files: [{ name: `main.${fileExt}`, content: code }]
        })
      });
      
      const data = await response.json();
      
      // If Piston is blocked/whitelisted, fallback to Gemini simulating the output
      if (data.message && data.message.includes("whitelist")) {
        console.log("Piston API blocked, falling back to Gemini Code Simulator...");
        
        const simulationPrompt = `You are a strict terminal compiler and executor. 
I am going to provide you with ${language} code.
If there are syntax errors, output the realistic compiler/interpreter error.
If there are runtime errors, output the realistic runtime error trace.
If the code runs successfully, output ONLY the exact standard output (stdout) that would be printed to the terminal.
Do not add any markdown, explanations, or conversational text. ONLY output the terminal text.

Code to execute:
\`\`\`
${code}
\`\`\`
`;
        
        const simRes = await callGeminiWithRetry("gemini-3.6-flash", simulationPrompt);
        const simOutput = simRes.text || "No output";
        
        return res.json({
          run: { output: simOutput }
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Execution error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ─────────────────────────────────────────────
  // 2. AI Streaming Hint Endpoint
  // ─────────────────────────────────────────────
  app.post("/api/ai/hint/stream", requireAuth, aiLimiter, async (req, res) => {
    try {
      const { code, bugType, level, terminalOutput } = HintSchema.parse(req.body);
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Abort streaming if client disconnects
      let clientDisconnected = false;
      req.on('close', () => { clientDisconnected = true; });

      const prompt = `You are Detective AI, an expert debugging mentor. 
The student is trying to fix a ${bugType}.
Provide a hint at level ${level} (1=small clue, 2=stronger clue, 3=expert clue).
Do not reveal the actual correct code, just guide them.
Current code:
\`\`\`
${code}
\`\`\`
${terminalOutput ? `Terminal Output Context:\n\`\`\`\n${terminalOutput}\n\`\`\`` : ''}`;

      const stream = await ai.models.generateContentStream({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an educational debugging mentor. Keep hints concise, encouraging, and focused on helping the student find the bug themselves. Format with Markdown.",
        }
      });

      for await (const chunk of stream) {
        if (clientDisconnected) break;
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error(error);
      if (!res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      }
      res.end();
    }
  });

  // ─────────────────────────────────────────────
  // 3. AI Streaming Chat Endpoint
  // ─────────────────────────────────────────────
  app.post("/api/ai/chat/stream", requireAuth, aiLimiter, async (req, res) => {
    try {
      const { message, code, terminalOutput } = ChatSchema.parse(req.body);
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let clientDisconnected = false;
      req.on('close', () => { clientDisconnected = true; });

      const prompt = `Context Code:
\`\`\`
${code}
\`\`\`
${terminalOutput ? `Terminal Output Context:\n\`\`\`\n${terminalOutput}\n\`\`\`` : ''}

Student Question: ${message}`;

      const stream = await ai.models.generateContentStream({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are Detective AI. Answer the student's question about the code without directly giving away the solution. Be helpful, professional, and use a detective persona. Format with Markdown.",
        }
      });

      for await (const chunk of stream) {
        if (clientDisconnected) break;
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error(error);
      if (!res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      }
      res.end();
    }
  });

  // ─────────────────────────────────────────────
  // 4. AI Evaluation Endpoint
  // ─────────────────────────────────────────────
  app.post("/api/ai/evaluate", requireAuth, aiLimiter, async (req, res) => {
    try {
      const { originalCode, submittedCode, expectedBehavior, terminalOutput } = EvaluateSchema.parse(req.body);
      
      const prompt = `Evaluate the student's bug fix.
Original Code:
\`\`\`
${originalCode}
\`\`\`

Submitted Code:
\`\`\`
${submittedCode}
\`\`\`

Expected Behavior:
${expectedBehavior}

${terminalOutput ? `Actual Terminal Execution Result:\n\`\`\`\n${terminalOutput}\n\`\`\`` : 'No execution output provided.'}

Evaluate if the solution is correct, efficient, and fixes the bug based on the code changes and terminal output.`;

      const response = await callGeminiWithRetry(
        "gemini-3.6-flash",
        prompt,
        {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Score from 0 to 100" },
              solutionCorrect: { type: Type.BOOLEAN },
              testsPassed: { type: Type.NUMBER },
              testsFailed: { type: Type.NUMBER },
              feedback: { type: Type.STRING, description: "Markdown formatted feedback" },
              timeComplexity: { type: Type.STRING },
              spaceComplexity: { type: Type.STRING },
            },
            required: ["score", "solutionCorrect", "testsPassed", "testsFailed", "feedback", "timeComplexity", "spaceComplexity"]
          }
        }
      );
      
      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from AI evaluation');
      }
      try {
        res.json(JSON.parse(responseText));
      } catch (parseError) {
        console.error('Failed to parse AI response:', responseText);
        throw new Error('Invalid AI evaluation response format');
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ─────────────────────────────────────────────
  // Vite middleware / Static serving
  // ─────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
