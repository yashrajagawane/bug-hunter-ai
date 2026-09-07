import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LogOut, Target, Code, Award, Zap, Brain, ChevronRight } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface CasePreview {
  id: string;
  title: string;
  difficulty: string;
  language: string;
  xpReward: number;
}

export function Dashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CasePreview[]>([]);
  
  useEffect(() => {
    async function loadCases() {
      // In a real app we might have a seeded 'cases' collection
      try {
        const q = query(collection(db, 'cases'), limit(5));
        const snapshot = await getDocs(q);
        const loadedCases = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CasePreview[];
        setCases(loadedCases);
      } catch (err) {
        console.error("Failed to load cases", err);
      }
    }
    loadCases();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans">
      <nav className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center text-slate-900 font-bold">D</div>
          <span className="text-xl font-extrabold tracking-tighter glow-cyan italic uppercase">Detective_HQ</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Rank</div>
              <div className="text-xs font-mono font-bold text-slate-100">LVL {profile?.level || 1} · {profile?.username?.toUpperCase()}</div>
            </div>
            <button onClick={() => navigate('/profile')} className="h-10 w-10 rounded-full border-2 border-cyan-500/50 bg-slate-800 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors">
               <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-purple-600 opacity-80 flex items-center justify-center font-bold text-white">
                  {profile?.username?.charAt(0).toUpperCase()}
               </div>
            </button>
          </div>
          <div className="flex gap-4 border-l border-slate-700 pl-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">XP</span>
              <span className="font-mono text-cyan-400">{profile?.xp || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Coins</span>
              <span className="font-mono text-yellow-400">{profile?.coins || 0}</span>
            </div>
            <button onClick={handleLogout} className="ml-4 text-slate-500 hover:text-red-400 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Player Card & Stats */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Progress to LVL {(profile?.level || 1) + 1}</span>
                  <span className="font-mono text-cyan-400">{profile?.xp} / {(profile?.level || 1) * 1000} XP</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                    style={{ width: `${((profile?.xp || 0) / ((profile?.level || 1) * 1000)) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                <div className="bg-slate-800/40 rounded border border-slate-700 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1 flex items-center gap-1">
                    <Award size={12} /> Solved
                  </div>
                  <div className="font-mono text-white text-lg">{profile?.casesSolved || 0}</div>
                </div>
                <div className="bg-slate-800/40 rounded border border-slate-700 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-1">
                    <Zap size={12} /> Streak
                  </div>
                  <div className="font-mono text-white text-lg">{profile?.streak || 0} Days</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Daily Mission */}
          <div className="bg-slate-900/40 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
            <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest flex items-center gap-2">
              <Brain size={14} className="text-purple-400" />
              Daily Mission
            </h3>
            <p className="text-slate-300 text-sm mb-4 font-medium">Fix 3 Java bugs today.</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest">+300 XP • +100 Coins</span>
              <span className="text-xs font-mono text-slate-400">0/3</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full">
              <div className="h-full bg-purple-500 w-0 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            </div>
          </div>
        </div>

        {/* Middle/Right Column: Cases & Active Investigation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="case-gradient border border-cyan-500/30 rounded-xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-cyan-400 font-mono text-[10px] font-bold tracking-widest uppercase mb-2">ACTIVE INVESTIGATION</div>
              <h2 className="text-2xl font-extrabold text-white mb-4 uppercase tracking-tighter italic">THE MISSING TRANSACTION</h2>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase mb-8">
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono tracking-widest">Severity: Critical</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono tracking-widest">Lang: Java</span>
                <span className="text-slate-400 tracking-widest">Progress: 65%</span>
              </div>
              <button 
                onClick={() => navigate('/case/demo-1')}
                className="group flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded font-extrabold hover:bg-cyan-500 transition-all text-sm uppercase tracking-widest"
              >
                Continue Investigation
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Code size={240} className="translate-x-1/4 translate-y-1/4 text-cyan-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Case Files</h3>
              <button className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest hover:text-cyan-300">View All</button>
            </div>
            
            <div className="space-y-3">
              {cases.length > 0 ? (
                cases.map(c => (
                  <div key={c.id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex items-center justify-between hover:border-cyan-500/50 transition-colors cursor-pointer group">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1">{c.language}</div>
                      <h4 className="text-slate-200 font-extrabold uppercase tracking-tight">{c.title}</h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-yellow-400 font-mono font-bold tracking-widest uppercase">+{c.xpReward} XP</span>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-cyan-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-lg p-8 text-center text-slate-500 text-sm font-medium">
                  Loading cases or no cases found.
                  <button onClick={() => navigate('/case/demo')} className="block mx-auto mt-4 text-[10px] font-bold text-cyan-400 uppercase tracking-widest hover:underline">
                    Try Demo Case
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
