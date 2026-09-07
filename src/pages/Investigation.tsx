import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Terminal, ShieldAlert, CheckCircle, XCircle, Play, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// Temporary mock data until DB is fully seeded
const MOCK_CASE = {
  id: 'demo',
  title: 'The Broken Transaction Loop',
  severity: 'CRITICAL',
  language: 'java',
  bugType: 'Array Index Error',
  description: 'Customers are reporting incorrect transaction totals. Some transactions seem to be missing or causing the application to crash completely.',
  symptoms: [
    'java.lang.ArrayIndexOutOfBoundsException randomly appears in logs',
    'Totals are miscalculated'
  ],
  expectedBehavior: 'Return the exact sum of all transaction values in the array.',
  actualBehavior: 'Application crashes when accessing the final element, or calculates an incorrect sum.',
  brokenCode: `public class TransactionProcessor {
    public int calculateTotal(int[] transactions) {
        int total = 0;
        
        for(int i = 0; i <= transactions.length; i++) {
            total += transactions[i];
        }
        
        return total;
    }
}`,
  difficulty: 'Beginner',
  xpReward: 500,
  timeRemaining: '15:00'
};

export function Investigation() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(MOCK_CASE.brokenCode);
  const [activeTab, setActiveTab] = useState<'case' | 'ai'>('case');
  const [consoleOutput, setConsoleOutput] = useState<string>('System ready. Awaiting code execution...\n');
  const [chatHistory, setChatHistory] = useState<{role: 'ai'|'user', text: string}[]>([{role: 'ai', text: "Hello Detective. I'm ready to assist with this case. What would you like to do?"}]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  const handleRunCode = () => {
    setConsoleOutput(prev => prev + '> Compiling...\n> Running tests...\n');
    setTimeout(() => {
      if (code.includes('i < transactions.length')) {
        setConsoleOutput(prev => prev + '> Tests PASSED [5/5]\n> Bug appears to be resolved!\n');
      } else {
        setConsoleOutput(prev => prev + '> java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5\n> Tests FAILED [0/5]\n');
      }
    }, 1000);
  };

  const handleAskHint = async (level: number) => {
    setActiveTab('ai');
    const msg = `Requesting Hint Level ${level}...`;
    setChatHistory(prev => [...prev, {role: 'user', text: msg}]);
    setIsAiLoading(true);
    
    try {
      const res = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, bugType: MOCK_CASE.bugType, level })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, {role: 'ai', text: data.text}]);
    } catch (e) {
      setChatHistory(prev => [...prev, {role: 'ai', text: "Connection error."}]);
    }
    setIsAiLoading(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const msg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, {role: 'user', text: msg}]);
    setIsAiLoading(true);
    
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, message: msg })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, {role: 'ai', text: data.text}]);
    } catch (e) {
      setChatHistory(prev => [...prev, {role: 'ai', text: "Connection error."}]);
    }
    setIsAiLoading(false);
  };

  const handleSubmitFinal = async () => {
    setConsoleOutput(prev => prev + '> Submitting for final evaluation...\n');
    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalCode: MOCK_CASE.brokenCode,
          submittedCode: code,
          expectedBehavior: MOCK_CASE.expectedBehavior
        })
      });
      const data = await res.json();
      setEvaluation(data);
      setConsoleOutput(prev => prev + `> Evaluation received. Score: ${data.score}/100\n`);
    } catch (e) {
      setConsoleOutput(prev => prev + '> Error submitting evaluation.\n');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-slate-200 font-sans overflow-hidden">
      
      {/* Top Navbar */}
      <nav className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase font-bold">
            <span className="text-cyan-400">CASE #{caseId?.toUpperCase()}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">{MOCK_CASE.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            {MOCK_CASE.timeRemaining}
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel - Case Info */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/20 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-slate-800">
            <div className="mb-4">
              <span className="text-[10px] font-mono text-cyan-400 block mb-1 uppercase tracking-widest">CASE BRIEF</span>
              <h2 className="text-xl font-extrabold text-white leading-tight uppercase tracking-tighter italic">{MOCK_CASE.title}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Severity</div>
                <div className="text-red-400 font-bold text-xs uppercase px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded inline-block">{MOCK_CASE.severity}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Language</div>
                <div className="text-blue-400 font-bold text-xs uppercase px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded inline-block">{MOCK_CASE.language}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Bug Type</div>
                <div className="text-slate-200 text-sm font-medium">{MOCK_CASE.bugType}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Reward</div>
                <div className="text-cyan-400 font-mono text-sm font-bold">+{MOCK_CASE.xpReward} XP</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">Incident Report</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic">'{MOCK_CASE.description}'</p>
            </div>
            
            <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
              <h4 className="text-[10px] uppercase font-bold text-cyan-400 mb-2 tracking-widest">Symptoms</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                {MOCK_CASE.symptoms.map((s, i) => <li key={i} className="flex gap-2"><span>•</span> {s}</li>)}
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] uppercase font-bold text-purple-400 mb-2 tracking-widest">Expected Behavior</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{MOCK_CASE.expectedBehavior}</p>
            </div>
            
            <div>
              <h3 className="text-[10px] uppercase font-bold text-red-400 mb-2 tracking-widest">Actual Behavior</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{MOCK_CASE.actualBehavior}</p>
            </div>
          </div>
        </div>

        {/* Center Panel - Code Editor & Console */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">TransactionProcessor.java</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded uppercase transition-colors" onClick={() => setCode(MOCK_CASE.brokenCode)}>Reset</button>
              <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded uppercase transition-colors flex items-center gap-1" onClick={handleRunCode}>
                <Play size={10} /> Run Code
              </button>
            </div>
          </div>
          <div className="flex-1 relative bg-[#0a0f1d]">
            <Editor
              height="100%"
              language={MOCK_CASE.language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'all',
              }}
            />
          </div>
          
          {/* Console / Test Results */}
          <div className="h-40 border-t border-slate-800 bg-black/40 flex flex-col shrink-0">
            <div className="flex items-center px-4 py-1 border-b border-slate-800 bg-slate-900/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Terminal size={10} className="inline mr-1"/> Debug Terminal</span>
            </div>
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto whitespace-pre-wrap text-slate-400">
              {consoleOutput}
            </div>
          </div>
        </div>

        {/* Right Panel - AI Assistant */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/40 flex flex-col shrink-0 p-6">
          <div className="mb-4">
             <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-purple-400"/> Detective Toolkit
             </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 custom-scrollbar mb-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${msg.role === 'ai' ? 'border-purple-500/30 bg-purple-500/5' : 'bg-slate-800 border-slate-700 ml-4'}`}>
                {msg.role === 'ai' && <h4 className="text-[10px] uppercase font-bold text-purple-400 mb-2 tracking-widest italic">Detective AI</h4>}
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{msg.text}</p>
              </div>
            ))}
            {isAiLoading && (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 animate-pulse">
                <h4 className="text-[10px] uppercase font-bold text-purple-400 mb-2 tracking-widest italic">Detective AI</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Analyzing code...</p>
              </div>
            )}
            
            <div className="mt-auto space-y-3 pt-4">
              <button onClick={() => handleAskHint(1)} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800 hover:border-cyan-500 transition-colors text-left group">
                <div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-400">Detective AI Hint</div>
                  <div className="text-[10px] text-slate-500">Cost: 10 Coins</div>
                </div>
                <Sparkles className="w-5 h-5 text-slate-500 group-hover:text-cyan-400" />
              </button>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-800 mb-6">
            <form onSubmit={handleChatSubmit} className="relative">
              <input 
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask Detective AI..." 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                disabled={isAiLoading}
              />
            </form>
          </div>

          <button onClick={handleSubmitFinal} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm uppercase tracking-tighter rounded-xl shadow-[0_10px_20px_rgba(8,145,178,0.3)] transition-all transform active:scale-95">
             Final Submission
          </button>
        </div>
      </div>
    </div>
  );
}
