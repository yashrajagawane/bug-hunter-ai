import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, Sparkles, Terminal, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion } from 'framer-motion';

export function Investigation() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('System ready. Awaiting input...\n');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: currentCase, isLoading: isCaseLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const docRef = doc(db, 'cases', caseId || '');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCode(data.brokenCode);
        return { id: docSnap.id, ...data };
      }
      throw new Error("Case not found");
    },
    enabled: !!caseId
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiLoading]);

  const handleRunCode = async () => {
    if (!currentCase) return;
    setIsExecuting(true);
    setConsoleOutput('Compiling and executing code in sandbox...\n');
    
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (!profile) return;
    
    if (profile.coins < 10) {
      toast.error('Not enough coins for a hint!');
      return;
    }
    
    // Deduct coins optimistically
    const userRef = doc(db, 'users', auth.currentUser!.uid);
    await updateDoc(userRef, { coins: profile.coins - 10 });
    toast('Hint purchased', { icon: '🪙', description: '-10 Coins' });
    
    setIsAiLoading(true);
    
    try {
      const res = await fetch('/api/ai/hint/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          bugType: currentCase?.difficulty || 'Unknown',
          level,
          terminalOutput: consoleOutput
        })
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let completeResponse = '';

      setChatHistory(prev => [...prev, { role: 'user', text: "Can you give me a hint on what I'm doing wrong?" }, { role: 'ai', text: '' }]);

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
                  setChatHistory(prev => {
                    const newHist = [...prev];
                    newHist[newHist.length - 1].text = completeResponse;
                    return newHist;
                  });
                }
              } catch (e) {
                console.error("Parse error", e);
              }
            }
          }
        }
      }
    } catch (error) {
      toast.error('Failed to get hint. Systems offline.');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          code,
          terminalOutput: consoleOutput
        })
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let completeResponse = '';
      
      setChatHistory(prev => [...prev, { role: 'ai', text: '' }]);

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
                  setChatHistory(prev => {
                    const newHist = [...prev];
                    newHist[newHist.length - 1].text = completeResponse;
                    return newHist;
                  });
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (error) {
       setChatHistory(prev => [...prev, { role: 'ai', text: 'Connection failed. Cannot process query.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!currentCase) return;
    const loadToast = toast.loading('Evaluating Submission...');
    
    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalCode: currentCase.brokenCode,
          submittedCode: code,
          expectedBehavior: currentCase.expectedBehavior,
          terminalOutput: consoleOutput
        })
      });
      
      const data = await res.json();
      
      if (data.solutionCorrect) {
        toast.dismiss(loadToast);
        toast.success(`Case Solved! Score: ${data.score}/100`, { duration: 5000 });
        setConsoleOutput(prev => prev + `\n\n[DETECTIVE AI VERDICT]\nScore: ${data.score}/100\n${data.feedback}\n`);
        
        // Award XP and Coins
        if (profile) {
          const userRef = doc(db, 'users', auth.currentUser!.uid);
          await updateDoc(userRef, { 
            xp: profile.xp + currentCase.xpReward,
            coins: profile.coins + currentCase.coinReward,
            casesSolved: profile.casesSolved + 1
          });
        }
      } else {
         toast.dismiss(loadToast);
         toast.error(`Fix incomplete. Score: ${data.score}/100`);
         setConsoleOutput(prev => prev + `\n\n[DETECTIVE AI VERDICT]\nScore: ${data.score}/100\n${data.feedback}\n`);
      }
    } catch (e: any) {
      toast.dismiss(loadToast);
      toast.error('Evaluation Failed.');
      setConsoleOutput(`[SYSTEM ERROR] Evaluation failed: ${e.message}\n`);
    }
  };

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
        <div className="flex items-center gap-4">
           <button onClick={() => setIsDiffMode(!isDiffMode)} className={`px-4 py-1.5 text-[10px] font-bold rounded uppercase tracking-widest transition-all ${isDiffMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/[0.05] text-slate-300 border border-white/10 hover:bg-white/[0.1]'}`}>
             {isDiffMode ? 'Exit Diff View' : 'Diff View'}
           </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Panel - Case Info */}
        <div className="w-80 border-r border-white/[0.05] bg-white/[0.02] backdrop-blur-xl flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-xl">
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
        </div>

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
              <button className="px-3 py-1 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-slate-200 text-[10px] font-bold rounded uppercase transition-all" onClick={() => setCode(currentCase.brokenCode)}>Reset</button>
              <button disabled={isExecuting} className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-[10px] font-bold rounded uppercase transition-all flex items-center gap-1 disabled:opacity-50 shadow-[0_0_10px_rgba(34,211,238,0.4)]" onClick={handleRunCode}>
                <Play size={10} /> {isExecuting ? 'Executing...' : 'Run Code'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative bg-black/40 backdrop-blur-sm">
            {isDiffMode ? (
               <DiffEditor
                 height="100%"
                 language={currentCase.language.toLowerCase()}
                 original={currentCase.brokenCode}
                 modified={code}
                 theme="vs-dark"
                 options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}
               />
            ) : (
               <Editor
                 height="100%"
                 language={currentCase.language.toLowerCase()}
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

        {/* Right Panel - AI Assistant */}
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
                <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">{msg.text}</p>
              </motion.div>
            ))}
            {isAiLoading && chatHistory[chatHistory.length - 1]?.role !== 'ai' && (
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 animate-pulse backdrop-blur-md">
                <h4 className="text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-widest italic drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Detective AI</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Analyzing code stream...</p>
              </div>
            )}
            <div ref={chatEndRef} />
            
            <div className="mt-auto space-y-3 pt-4">
              <button onClick={() => handleAskHint(1)} disabled={isAiLoading} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/[0.05] bg-black/40 hover:bg-white/[0.05] hover:border-cyan-500/50 transition-all text-left group disabled:opacity-50 backdrop-blur-md">
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">Request AI Hint</div>
                  <div className="text-[10px] text-slate-400 group-hover:text-slate-300">Cost: 10 Coins</div>
                </div>
                <Sparkles className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>
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
      </div>
    </div>
  );
}
