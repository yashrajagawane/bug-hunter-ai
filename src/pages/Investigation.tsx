import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, Sparkles, Terminal, Play, CheckCircle2, BookOpen, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getIdToken } from 'firebase/auth';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

/** Returns auth headers with a fresh Firebase ID token for API calls. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await getIdToken(user);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}


/**
 * Maps language names to Monaco Editor language identifiers.
 * Fixes C6: Monaco expects "cpp" not "c++"
 */
function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
    'c++': 'cpp',
    'javascript': 'javascript',
    'python': 'python',
    'java': 'java',
  };
  return map[language.toLowerCase()] || language.toLowerCase();
}

/**
 * Helper to stream SSE responses and update chat history immutably.
 * Fixes M2: creates new objects instead of mutating in-place.
 */
async function processSSEStream(
  res: Response,
  onChunk: (completeText: string) => void
): Promise<string> {
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let completeResponse = '';

  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              completeResponse += data.text;
              onChunk(completeResponse);
            }
          } catch (e) {
            // Skip malformed SSE lines
          }
        }
      }
    }
  }
  return completeResponse;
}

/** localStorage key for auto-saving code per case */
const CODE_STORAGE_KEY = (caseId: string) => `bug-hunter-code-${caseId}`;

export function Investigation() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { profile, setProfile } = useAuthStore();
  
  const [code, setCode] = useState('');
  const [codeInitialized, setCodeInitialized] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('System ready. Awaiting input...\n');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showCasePanel, setShowCasePanel] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: Ctrl+Enter = run code, Ctrl+S = trigger save toast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toast.success('Code saved to browser', { icon: '💾', duration: 1500 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, currentCase, isExecuting]);


  // Fix M1: queryFn no longer sets React state as a side effect
  const { data: currentCase, isLoading: isCaseLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const docRef = doc(db, 'cases', caseId || '');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as any;
      }
      throw new Error("Case not found");
    },
    enabled: !!caseId
  });

  // Fix M1: Initialize code from query result or localStorage (Fix L6)
  useEffect(() => {
    if (currentCase && !codeInitialized) {
      // Check localStorage for saved code
      const savedCode = localStorage.getItem(CODE_STORAGE_KEY(currentCase.id));
      setCode(savedCode || currentCase.brokenCode);
      setCodeInitialized(true);
    }
  }, [currentCase, codeInitialized]);

  // Fix L6: Auto-save code to localStorage on change
  useEffect(() => {
    if (codeInitialized && caseId && code) {
      localStorage.setItem(CODE_STORAGE_KEY(caseId), code);
    }
  }, [code, caseId, codeInitialized]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiLoading]);

  // Fix M2: Immutable chat history update helper
  const updateLastAiMessage = useCallback((text: string) => {
    setChatHistory(prev => {
      const newHist = [...prev];
      const lastIdx = newHist.length - 1;
      if (lastIdx >= 0 && newHist[lastIdx].role === 'ai') {
        // Create a NEW object instead of mutating in-place
        newHist[lastIdx] = { ...newHist[lastIdx], text };
      }
      return newHist;
    });
  }, []);

  const handleRunCode = async () => {
    if (!currentCase) return;
    setIsExecuting(true);
    setConsoleOutput('Compiling and executing code in sandbox...\n');
    
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          language: currentCase.language,
          code: code
        })
      });
      
      const result = await res.json();
      if (result.compile && result.compile.output) {
        setConsoleOutput(prev => prev + `[COMPILE ERROR]\n${result.compile.output}\n`);
      } else if (result.run) {
        setConsoleOutput(`[EXECUTION RESULT]\n${result.run.output}\n`);
      } else {
        setConsoleOutput(`[ERROR] execution failed.\n`);
      }
    } catch (e: any) {
      setConsoleOutput(`[SYSTEM ERROR] Failed to connect to sandbox: ${e.message}\n`);
      toast.error("Sandbox connection failed.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAskHint = async (level: number) => {
    if (!profile || !auth.currentUser) return;
    
    // Progressive hint cost: Nudge=10, Clue=25, Reveal=50
    const hintCosts: Record<number, number> = { 1: 10, 2: 25, 3: 50 };
    const cost = hintCosts[level] || 10;

    if (profile.coins < cost) {
      toast.error(`Not enough coins! You need ${cost} coins for this hint.`);
      return;
    }
    
    const newCoins = profile.coins - cost;
    const userRef = doc(db, 'users', auth.currentUser.uid);

    setIsAiLoading(true);
    
    try {
      // Deduct coins
      await updateDoc(userRef, { coins: newCoins });
      // Sync Zustand store so UI updates immediately
      setProfile({ ...profile, coins: newCoins });
      setHintsUsed(prev => prev + 1);
      toast('Hint purchased', { icon: '🪙', description: `-${cost} Coins` });

      const res = await fetch('/api/ai/hint/stream', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          code,
          bugType: currentCase?.difficulty || 'Unknown',
          level,
          terminalOutput: consoleOutput
        })
      });

      if (!res.ok) throw new Error('API Error');

      setChatHistory(prev => [...prev, { role: 'user', text: "Can you give me a hint on what I'm doing wrong?" }, { role: 'ai', text: '' }]);
      await processSSEStream(res, updateLastAiMessage);
    } catch (error) {
      // Fix C4: Rollback coins on failure
      try {
        await updateDoc(userRef, { coins: profile.coins }); // restore original
        setProfile({ ...profile }); // restore original profile
      } catch (rollbackError) {
        console.error('Coin rollback failed:', rollbackError);
      }
      toast.error('Failed to get hint. Coins refunded.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiLoading) return;
    
    const message = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          message,
          code,
          terminalOutput: consoleOutput
        })
      });

      if (!res.ok) throw new Error('API Error');

      setChatHistory(prev => [...prev, { role: 'ai', text: '' }]);
      await processSSEStream(res, updateLastAiMessage);
    } catch (error) {
       setChatHistory(prev => [...prev, { role: 'ai', text: 'Connection failed. Cannot process query.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!currentCase || !auth.currentUser) return;
    const loadToast = toast.loading('Evaluating Submission...');
    
    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          originalCode: currentCase.brokenCode,
          submittedCode: code,
          expectedBehavior: currentCase.expectedBehavior,
          terminalOutput: consoleOutput
        })
      });
      
      const data = await res.json();
      const isCorrect: boolean = data.solutionCorrect;
      const score: number = data.score;

      // Always record the attempt in Firestore (win or lose)
      try {
        await addDoc(collection(db, 'attempts'), {
          userId: auth.currentUser.uid,
          caseId: currentCase.id,
          submittedCode: code,
          score,
          hintsUsed,
          completed: isCorrect,
          createdAt: serverTimestamp(),
        });
      } catch (attemptError) {
        // Non-critical: log but don't surface to user
        console.error('Failed to record attempt:', attemptError);
      }
      
      if (isCorrect) {
        toast.dismiss(loadToast);
        toast.success(`Case Solved! Score: ${score}/100`, { duration: 5000 });
        setConsoleOutput(prev => prev + `\n\n[DETECTIVE AI VERDICT]\nScore: ${score}/100\n${data.feedback}\n`);
        
        // Fix C5: Award XP/Coins AND sync Zustand profile state
        if (profile) {
          const newXp = profile.xp + currentCase.xpReward;
          const newCoins = profile.coins + currentCase.coinReward;
          const newCasesSolved = profile.casesSolved + 1;

          // ── Level-up logic: level = floor(xp / 1000) + 1, capped at 100 ──
          const newLevel = Math.min(Math.floor(newXp / 1000) + 1, 100);
          const didLevelUp = newLevel > profile.level;

          // ── Streak logic: increment if last solve was yesterday or today ──
          const todayKey = new Date().toDateString();
          const lastSolveKey = localStorage.getItem(`last-solve-${profile.uid}`);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = yesterday.toDateString();
          const newStreak = lastSolveKey === todayKey
            ? profile.streak                          // already solved today
            : lastSolveKey === yesterdayKey
            ? profile.streak + 1                     // extending streak
            : 1;                                     // streak reset
          localStorage.setItem(`last-solve-${profile.uid}`, todayKey);

          const updatedProfile = {
            ...profile,
            xp: newXp,
            coins: newCoins,
            casesSolved: newCasesSolved,
            level: newLevel,
            streak: newStreak,
          };
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            xp: newXp,
            coins: newCoins,
            casesSolved: newCasesSolved,
            level: newLevel,
            streak: newStreak,
          });
          setProfile(updatedProfile);

          if (didLevelUp) {
            toast.success(`⬆️ Level Up! You are now Level ${newLevel}!`, { duration: 6000 });
          }
          if (newStreak > 1 && newStreak !== profile.streak) {
            toast(`🔥 ${newStreak} day streak!`, { duration: 4000 });
          }
        }

        // Clear saved code from localStorage on successful solve
        if (caseId) {
          localStorage.removeItem(CODE_STORAGE_KEY(caseId));
        }
      } else {
        toast.dismiss(loadToast);
        toast.error(`Fix incomplete. Score: ${score}/100`);
        setConsoleOutput(prev => prev + `\n\n[DETECTIVE AI VERDICT]\nScore: ${score}/100\n${data.feedback}\n`);
      }
    } catch (e: any) {
      toast.dismiss(loadToast);
      toast.error('Evaluation Failed.');
      setConsoleOutput(`[SYSTEM ERROR] Evaluation failed: ${e.message}\n`);
    }
  };

  // Fix C6: Compute Monaco language once
  const monacoLanguage = currentCase ? getMonacoLanguage(currentCase.language) : 'plaintext';

  if (isCaseLoading || !currentCase) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-cyan-400 font-mono text-sm uppercase tracking-widest animate-pulse">Loading Case File...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-slate-300 font-sans overflow-hidden relative">
      {/* Ambient background orbs for glassmorphism */}
      <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="h-14 border-b border-white/[0.05] bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase font-bold">
            <span className="text-cyan-400">CASE #{currentCase.id.toUpperCase()}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">{currentCase.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button
             onClick={() => setShowCasePanel(p => !p)}
             title="Toggle Case Brief Panel"
             className={`p-1.5 rounded text-[10px] font-bold transition-all border ${showCasePanel ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-white/[0.05] text-slate-400 border-white/10 hover:bg-white/[0.1]'}`}
           >
             {showCasePanel ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
           </button>
           <button
             onClick={() => setShowAiPanel(p => !p)}
             title="Toggle AI Assistant Panel"
             className={`p-1.5 rounded text-[10px] font-bold transition-all border ${showAiPanel ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-white/[0.05] text-slate-400 border-white/10 hover:bg-white/[0.1]'}`}
           >
             <MessageSquare size={14} />
           </button>
           <button onClick={() => setIsDiffMode(!isDiffMode)} className={`px-4 py-1.5 text-[10px] font-bold rounded uppercase tracking-widest transition-all ${isDiffMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/[0.05] text-slate-300 border border-white/10 hover:bg-white/[0.1]'}`}>
             {isDiffMode ? 'Exit Diff' : 'Diff View'}
           </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Panel - Case Info (collapsible) */}
        {showCasePanel && (
        <motion.div
          initial={{ width: 320, opacity: 1 }}
          animate={{ width: showCasePanel ? 320 : 0, opacity: showCasePanel ? 1 : 0 }}
          className="w-80 border-r border-white/[0.05] bg-white/[0.02] backdrop-blur-xl flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-xl"
        >
          <div className="p-4 border-b border-white/[0.05]">
            <div className="mb-4">
              <span className="text-[10px] font-mono text-cyan-400 block mb-1 uppercase tracking-widest">CASE BRIEF</span>
              <h2 className="text-xl font-extrabold text-white leading-tight uppercase tracking-tighter italic">{currentCase.title}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Severity</div>
                <div className="text-red-400 font-bold text-xs uppercase px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded inline-block">{currentCase.difficulty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Language</div>
                <div className="text-blue-400 font-bold text-xs uppercase px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded inline-block">{currentCase.language}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Reward</div>
                <div className="text-cyan-400 font-mono text-sm font-bold">+{currentCase.xpReward} XP</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">Incident Report</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic">'{currentCase.story}'</p>
            </div>
            
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] shadow-inner">
              <h4 className="text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Expected Behavior</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{currentCase.expectedBehavior}</p>
            </div>
            
            <div>
              <h3 className="text-[10px] uppercase font-bold text-red-400 mb-2 tracking-widest">Actual Behavior</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{currentCase.actualBehavior}</p>
            </div>
          </div>
        </motion.div>
        )}

        {/* Center Panel - Code Editor & Console */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/60 relative">
          <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-xl border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Sandbox Environment</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-slate-200 text-[10px] font-bold rounded uppercase transition-all" onClick={() => { setCode(currentCase.brokenCode); if (caseId) localStorage.removeItem(CODE_STORAGE_KEY(caseId)); }}>Reset</button>
              <button disabled={isExecuting} className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-[10px] font-bold rounded uppercase transition-all flex items-center gap-1 disabled:opacity-50 shadow-[0_0_10px_rgba(34,211,238,0.4)]" onClick={handleRunCode} title="Ctrl+Enter">
                <Play size={10} /> {isExecuting ? 'Executing...' : 'Run  ⌃↵'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative bg-black/40 backdrop-blur-sm">
            {isDiffMode ? (
               <DiffEditor
                 height="100%"
                 language={monacoLanguage}
                 original={currentCase.brokenCode}
                 modified={code}
                 theme="vs-dark"
                 options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}
               />
            ) : (
               <Editor
                 height="100%"
                 language={monacoLanguage}
                 value={code}
                 theme="vs-dark"
                 onChange={(value) => setCode(value || '')}
                 options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", formatOnPaste: true }}
               />
            )}
          </div>
          
          {/* Console / Test Results */}
          <div className="h-40 border-t border-white/[0.05] bg-black/80 backdrop-blur-xl flex flex-col shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
            <div className="flex items-center px-4 py-1 border-b border-white/[0.05] bg-white/[0.02]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Terminal size={10} className="inline mr-1"/> Debug Terminal</span>
            </div>
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto whitespace-pre-wrap text-slate-400">
              {consoleOutput}
            </div>
          </div>
        </div>

        {/* Right Panel - AI Assistant (collapsible) */}
        {showAiPanel && (
        <div className="w-80 border-l border-white/[0.05] bg-white/[0.02] backdrop-blur-xl flex flex-col shrink-0 p-6 shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="mb-4">
             <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-purple-400"/> Detective Toolkit
             </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 custom-scrollbar mb-4">
            {chatHistory.map((msg, idx) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`p-4 rounded-xl border backdrop-blur-md shadow-sm ${msg.role === 'ai' ? 'border-cyan-500/30 bg-cyan-500/10' : 'bg-black/40 border-white/[0.05] ml-4'}`}>
                {msg.role === 'ai' && <h4 className="text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-widest italic drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Detective AI</h4>}
                {msg.role === 'ai' ? (
                  <div className="text-xs text-slate-200 leading-relaxed font-sans prose prose-invert prose-xs max-w-none [&_code]:bg-black/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-cyan-300 [&_pre]:bg-black/60 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">{msg.text}</p>
                )}
              </motion.div>
            ))}
            {isAiLoading && chatHistory[chatHistory.length - 1]?.role !== 'ai' && (
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 animate-pulse backdrop-blur-md">
                <h4 className="text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-widest italic drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Detective AI</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Analyzing code stream...</p>
              </div>
            )}
            <div ref={chatEndRef} />
            
            <div className="mt-auto space-y-2 pt-4">
              <div className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-2">Progressive Hints</div>
              {([
                { level: 1, label: 'Nudge',   desc: 'Conceptual direction', cost: 10,  color: 'hover:border-cyan-500/50 hover:text-cyan-400' },
                { level: 2, label: 'Clue',    desc: 'Specific area',        cost: 25,  color: 'hover:border-yellow-500/50 hover:text-yellow-400' },
                { level: 3, label: 'Reveal',  desc: 'Near-solution guide',  cost: 50,  color: 'hover:border-red-500/50 hover:text-red-400' },
              ] as const).map(h => (
                <button
                  key={h.level}
                  onClick={() => handleAskHint(h.level)}
                  disabled={isAiLoading || (profile?.coins ?? 0) < h.cost}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.05] bg-black/40 ${h.color} transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:inherit transition-colors">{h.label}</div>
                    <div className="text-[10px] text-slate-500">{h.desc}</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-yellow-500 shrink-0 ml-2">{h.cost}🪙</span>
                </button>
              ))}
              <div className="text-[9px] text-slate-600 text-center pt-1">{hintsUsed} hint{hintsUsed !== 1 ? 's' : ''} used this session</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/[0.05] mb-6">
            <form onSubmit={handleChatSubmit} className="relative">
              <input 
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask Detective AI..." 
                className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-black/80 transition-all backdrop-blur-md"
                disabled={isAiLoading}
              />
            </form>
          </div>

          <button onClick={handleSubmitFinal} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-tighter rounded-xl shadow-[0_10px_20px_rgba(8,145,178,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
             <CheckCircle2 size={18} /> Final Submission
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
