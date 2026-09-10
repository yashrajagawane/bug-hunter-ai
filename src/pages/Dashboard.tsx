import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, Target, Zap, ChevronRight, Award, Brain, Code } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { seedCasesIfEmpty } from '../lib/seed';
import type { Case, Attempt } from '../lib/types';

/**
 * Derives a rank title from level.
 * Replaces the hardcoded "Rookie Debugger" string.
 */
function getRankTitle(level: number): string {
  if (level >= 50) return 'Grand Master Detective';
  if (level >= 30) return 'Master Detective';
  if (level >= 20) return 'Expert Investigator';
  if (level >= 10) return 'Senior Analyst';
  if (level >= 5)  return 'Junior Detective';
  return 'Rookie Debugger';
}

const fetchCases = async (): Promise<Case[]> => {
  const querySnapshot = await getDocs(collection(db, 'cases'));
  if (querySnapshot.empty) return [];
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
};

const fetchLatestAttempt = async (userId: string): Promise<Attempt | null> => {
  try {
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId),
      where('completed', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Attempt;
  } catch {
    return null;
  }
};

const fetchDailyProgress = async (userId: string): Promise<number> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId),
      where('completed', '==', true),
    );
    const snap = await getDocs(q);
    // Count only attempts created today
    const todayCount = snap.docs.filter(d => {
      const data = d.data();
      const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return ts >= today;
    }).length;
    return Math.min(todayCount, 3); // Cap at daily mission target of 3
  } catch {
    return 0;
  }
};

export function Dashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const userId = user?.uid || '';

  const { data: cases = [], isLoading, refetch } = useQuery({
    queryKey: ['cases'],
    queryFn: fetchCases,
  });

  const { data: latestAttempt } = useQuery({
    queryKey: ['latest-attempt', userId],
    queryFn: () => fetchLatestAttempt(userId),
    enabled: !!userId,
  });

  const { data: dailyProgress = 0 } = useQuery({
    queryKey: ['daily-progress', userId],
    queryFn: () => fetchDailyProgress(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    const initData = async () => {
      await seedCasesIfEmpty();
      refetch();
    };
    initData();
  }, [refetch]);

  const handleLogout = () => {
    auth.signOut().then(() => navigate('/'));
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  const rankTitle = getRankTitle(profile?.level || 1);
  const dailyTarget = 3;
  const dailyPct = Math.round((dailyProgress / dailyTarget) * 100);

  // Find the active case object from the latest incomplete attempt
  const activeCase = latestAttempt
    ? cases.find((c) => c.id === latestAttempt.caseId)
    : null;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans overflow-x-hidden relative">
      {/* Ambient background orbs for glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative flex items-center justify-between px-6 py-3 border-b border-white/[0.05] bg-black/40 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded flex items-center justify-center text-black font-bold shadow-[0_0_10px_rgba(34,211,238,0.4)]">D</div>
          <span className="text-xl font-extrabold tracking-tighter glow-cyan italic uppercase text-white">Detective_HQ</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-widest">Rank</div>
              <div className="text-xs font-mono font-bold text-slate-200">LVL {profile?.level || 1} · {profile?.username?.toUpperCase()}</div>
            </div>
            <button onClick={() => navigate('/leaderboard')} title="Leaderboard" className="h-9 w-9 rounded-lg border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-center hover:bg-yellow-500/20 transition-all">
              <span className="text-base">🏆</span>
            </button>
            <button onClick={() => navigate('/profile')} className="h-10 w-10 rounded-full border-2 border-cyan-500/50 bg-black flex items-center justify-center overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all">
               <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center font-bold text-white">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
               </div>
            </button>
          </div>
          <div className="flex gap-4 border-l border-white/10 pl-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">XP</span>
              <span className="font-mono text-cyan-400 font-bold">{profile?.xp || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Coins</span>
              <span className="font-mono text-yellow-400 font-bold">{profile?.coins || 0}</span>
            </div>
            <button onClick={handleLogout} className="ml-4 text-slate-500 hover:text-red-400 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Player Card & Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-16 h-16 rounded-full border-2 border-cyan-500/50 bg-black flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <div className="w-full h-full bg-gradient-to-br from-cyan-400/20 to-purple-600/20 flex items-center justify-center font-bold text-2xl text-white">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">{profile?.username || 'Detective'}</h2>
                {/* Dynamic rank title */}
                <div className="text-[10px] font-mono text-cyan-400 mt-1 uppercase tracking-widest flex items-center gap-1">
                  <Target size={12} /> {rankTitle}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>LVL {profile?.level || 1}</span>
                  <span className="font-mono text-cyan-400">{profile?.xp || 0} / {(profile?.level || 1) * 1000} XP</span>
                </div>
                <div className="h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((profile?.xp || 0) / ((profile?.level || 1) * 1000)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
                <div className="bg-black/40 rounded-xl border border-white/[0.05] p-3 text-center backdrop-blur-md">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-center gap-1">
                    <Award size={10} className="text-cyan-400" /> Solved
                  </div>
                  <div className="font-mono text-white text-base">{profile?.casesSolved || 0}</div>
                </div>
                <div className="bg-black/40 rounded-xl border border-white/[0.05] p-3 text-center backdrop-blur-md">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-center gap-1">
                    <Zap size={10} className="text-purple-400" /> Streak
                  </div>
                  <div className="font-mono text-white text-base">{profile?.streak || 0}</div>
                </div>
                <div className="bg-black/40 rounded-xl border border-white/[0.05] p-3 text-center backdrop-blur-md">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-center gap-1">
                    <Target size={10} className="text-yellow-400" /> Coins
                  </div>
                  <div className="font-mono text-white text-base">{profile?.coins || 0}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Daily Mission — now driven by real Firestore data */}
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
            <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest flex items-center gap-2">
              <Brain size={14} className="text-purple-400" />
              Daily Mission
            </h3>
            <p className="text-slate-200 text-sm mb-4 font-medium">Fix {dailyTarget} bugs today.</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest">+300 XP • +100 Coins</span>
              <span className="text-xs font-mono text-slate-400">{dailyProgress}/{dailyTarget}</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dailyPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)] ${dailyPct >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
              />
            </div>
            {dailyPct >= 100 && (
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">✓ Mission Complete!</p>
            )}
          </div>
        </motion.div>

        {/* Middle/Right Column: Cases & Active Investigation */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Investigation — dynamic from Firestore */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-cyan-500/20 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            
            <div className="relative z-10">
              <div className="text-cyan-400 font-mono text-[10px] font-bold tracking-widest uppercase mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                {activeCase ? 'ACTIVE INVESTIGATION' : 'START INVESTIGATING'}
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-4 uppercase tracking-tighter italic">
                {activeCase ? activeCase.title : cases[0]?.title || 'No cases yet'}
              </h2>
              {activeCase ? (
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase mb-8">
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono tracking-widest backdrop-blur-md">
                    Severity: {activeCase.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono tracking-widest backdrop-blur-md">
                    Lang: {activeCase.language}
                  </span>
                </div>
              ) : (
                <p className="text-slate-400 text-sm mb-8">Pick a case from the list below to begin your investigation.</p>
              )}
              <button 
                onClick={() => navigate(`/case/${activeCase?.id || cases[0]?.id || 'case-001'}`)}
                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded font-extrabold hover:from-cyan-500 hover:to-cyan-400 transition-all text-sm uppercase tracking-widest shadow-[0_5px_15px_rgba(8,145,178,0.4)]"
              >
                {activeCase ? 'Continue Investigation' : 'Begin First Case'}
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Code size={240} className="translate-x-1/4 translate-y-1/4 text-cyan-400" />
            </div>
          </motion.div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Case Files</h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cases.length} available</span>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-xl p-6 animate-pulse flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                      <div className="h-5 w-48 bg-white/10 rounded"></div>
                    </div>
                    <div className="h-5 w-16 bg-white/5 rounded"></div>
                  </div>
                ))}
              </div>
            ) : cases.length > 0 ? (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {cases.map((c: Case) => (
                  <motion.div variants={item} key={c.id} className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 flex items-center justify-between hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-pointer group shadow-sm" onClick={() => navigate(`/case/${c.id}`)}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400/80 group-hover:text-cyan-400 transition-colors">{c.language}</div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          c.difficulty === 'Beginner' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                          c.difficulty === 'Intermediate' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                          c.difficulty === 'Advanced' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                          'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>{c.difficulty}</span>
                      </div>
                      <h4 className="text-slate-200 font-extrabold uppercase tracking-tight group-hover:text-white transition-colors">{c.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                      <span className="text-[10px] text-yellow-400/80 group-hover:text-yellow-400 font-mono font-bold tracking-widest uppercase transition-colors">+{c.xpReward} XP</span>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] border-dashed rounded-xl p-8 text-center text-slate-500 text-sm font-medium">
                  Loading cases or no cases found.
                </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
