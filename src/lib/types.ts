// Shared TypeScript types for the AI Debug Detective project.
// Import from here instead of using `any` across the codebase.

/** Difficulty levels for cases */
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

/** Supported programming languages */
export type SupportedLanguage = 'JavaScript' | 'Python' | 'Java' | 'C++';

/** A debugging case document from the Firestore `cases` collection */
export interface Case {
  id: string;
  title: string;
  story: string;
  difficulty: Difficulty;
  language: SupportedLanguage;
  brokenCode: string;
  expectedBehavior: string;
  actualBehavior: string;
  xpReward: number;
  coinReward: number;
  timeLimit?: number;
  worldId?: string;
}

/** An attempt document from the Firestore `attempts` collection */
export interface Attempt {
  id: string;
  userId: string;
  caseId: string;
  submittedCode: string;
  score: number;
  hintsUsed: number;
  completed: boolean;
  createdAt: string; // ISO string (converted from Firestore Timestamp)
}

/** Result from the AI evaluation endpoint */
export interface EvaluationResult {
  score: number;
  solutionCorrect: boolean;
  testsPassed: number;
  testsFailed: number;
  feedback: string;
  timeComplexity: string;
  spaceComplexity: string;
}

/** Result from the code execution endpoint */
export interface ExecutionResult {
  run?: {
    output: string;
    stderr?: string;
    code?: number;
  };
  compile?: {
    output: string;
    stderr?: string;
    code?: number;
  };
  message?: string;
}

/** A single chat message in the AI assistant panel */
export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

/** Request payload for the hint API */
export interface HintRequest {
  code: string;
  bugType: string;
  level: 1 | 2 | 3;
  terminalOutput?: string;
}

/** Request payload for the chat API */
export interface ChatRequest {
  code: string;
  message: string;
  terminalOutput?: string;
}

/** Request payload for the evaluate API */
export interface EvaluateRequest {
  originalCode: string;
  submittedCode: string;
  expectedBehavior: string;
  terminalOutput?: string;
}

/** Request payload for the execute API */
export interface ExecuteRequest {
  language: string;
  code: string;
}
