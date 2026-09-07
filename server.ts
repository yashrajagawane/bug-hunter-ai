import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Zod Schemas for Validation
  const HintSchema = z.object({
    code: z.string(),
    bugType: z.string(),
    level: z.number().min(1).max(3),
    terminalOutput: z.string().optional()
  });

  const ChatSchema = z.object({
    code: z.string(),
    message: z.string(),
    terminalOutput: z.string().optional()
  });

  const EvaluateSchema = z.object({
    originalCode: z.string(),
    submittedCode: z.string(),
    expectedBehavior: z.string(),
    terminalOutput: z.string().optional()
  });

  const ExecuteSchema = z.object({
    language: z.string(),
    code: z.string()
  });

  // 1. Code Execution Endpoint (Piston API Proxy)
  app.post("/api/execute", async (req, res) => {
    try {
      const { language, code } = ExecuteSchema.parse(req.body);
      
      // Map languages to Piston API versions
      const versionMap: Record<string, string> = {
        'javascript': '18.15.0',
        'python': '3.10.0',
        'java': '15.0.2',
        'cpp': '10.2.0'
      };

      const pistonLang = language.toLowerCase() === 'c++' ? 'cpp' : language.toLowerCase();

      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonLang,
          version: versionMap[pistonLang] || '*',
          files: [{ name: `main.${pistonLang}`, content: code }]
        })
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Execution error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // 2. AI Streaming Hint Endpoint
  app.post("/api/ai/hint/stream", async (req, res) => {
    try {
      const { code, bugType, level, terminalOutput } = HintSchema.parse(req.body);
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

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
        model: "gemini-3.1-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an educational debugging mentor. Keep hints concise, encouraging, and focused on helping the student find the bug themselves. Format with Markdown.",
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error(error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  // 3. AI Streaming Chat Endpoint
  app.post("/api/ai/chat/stream", async (req, res) => {
    try {
      const { message, code, terminalOutput } = ChatSchema.parse(req.body);
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const prompt = `Context Code:
\`\`\`
${code}
\`\`\`
${terminalOutput ? `Terminal Output Context:\n\`\`\`\n${terminalOutput}\n\`\`\`` : ''}

Student Question: ${message}`;

      const stream = await ai.models.generateContentStream({
        model: "gemini-3.1-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are Detective AI. Answer the student's question about the code without directly giving away the solution. Be helpful, professional, and use a detective persona. Format with Markdown.",
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error(error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  // 4. AI Evaluation Endpoint
  app.post("/api/ai/evaluate", async (req, res) => {
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
        "gemini-3.1-flash",
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
      
      res.json(JSON.parse(response.text!));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
