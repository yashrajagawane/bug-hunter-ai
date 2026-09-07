import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Hint Endpoint
  app.post("/api/ai/hint", async (req, res) => {
    try {
      const { code, bugType, level } = req.body;
      
      const prompt = `You are Detective AI, an expert debugging mentor. 
The student is trying to fix a ${bugType}.
Provide a hint at level ${level} (1=small clue, 2=stronger clue, 3=expert clue).
Do not reveal the actual correct code, just guide them.
Current code:
\`\`\`
${code}
\`\`\``;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an educational debugging mentor. Keep hints concise, encouraging, and focused on helping the student find the bug themselves.",
        }
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Evaluation Endpoint
  app.post("/api/ai/evaluate", async (req, res) => {
    try {
      const { originalCode, submittedCode, expectedBehavior } = req.body;
      
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

Evaluate if the solution is correct, efficient, and fixes the bug.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Score from 0 to 100" },
              solutionCorrect: { type: Type.BOOLEAN },
              testsPassed: { type: Type.NUMBER },
              testsFailed: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              timeComplexity: { type: Type.STRING },
              spaceComplexity: { type: Type.STRING },
            },
            required: ["score", "solutionCorrect", "testsPassed", "testsFailed", "feedback", "timeComplexity", "spaceComplexity"]
          }
        }
      });
      
      res.json(JSON.parse(response.text!));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Chat Endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, code } = req.body;
      
      const prompt = `Context Code:
\`\`\`
${code}
\`\`\`
Student Question: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are Detective AI. Answer the student's question about the code without directly giving away the solution. Be helpful and professional.",
        }
      });
      
      res.json({ text: response.text });
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
