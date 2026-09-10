import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Award, Target, Zap, Brain, Code, Calendar } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useQuery } from '@tanstack/react-query';
import type { Attempt } from '../lib/types';

/** Derives a rank title from level — shared logic with Dashboard */
function getRankTitle(level: number): string {
  if (level >= 50) return 'Grand Master Detective';
  if (level >= 30) return 'Master Detective';
  if (level >= 20) return 'Expert Investigator';
  if (level >= 10) return 'Senior Analyst';
  if (level >= 5)  return 'Junior Detective';
  return 'Rookie Debugger';
}

/** Formats a timestamp to a human-readable relative string */
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

/** Builds heatmap data from real attempt dates */
function buildHeatmapData(attempts: Attempt[]): { date: Date; level: number }[] {
  // Build a map: dateKey -> count of completions
  const countMap = new Map<string, number>();
  for (const attempt of attempts) {
    if (!attempt.completed) continue;
    const d = new Date(attempt.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  const days = 365;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const totalDays = days + (6 - dayOfWeek);
  const result: { date: Date; level: number }[] = [];

  for (let i = totalDays; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const count = countMap.get(key) || 0;
    // Map count to level 0–4
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    result.push({ date, level });
  }
  return result;
}

function ActivityHeatmap({ attempts }: { attempts: Attempt[] }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const data = buildHeatmapData(attempts);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  const getLevelColor = (level: number) => {
    switch(level) {
      case 1: return 'bg-cyan-900/40 border-cyan-500/20';
      case 2: return 'bg-cyan-700/60 border-cyan-400/40';
      case 3: return 'bg-cyan-500/80 border-cyan-300/60 shadow-[0_0_8px_rgba(34,211,238,0.3)]';
      case 4: return 'bg-cyan-400 border-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.6)]';
      default: return 'bg-white/[0.02] border-white/5';
    }
  };

  const weeks: { date: Date; level: number }[][] = [];
  let currentWeek: { date: Date; level: number }[] = [];
  data.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const activeDays = data.filter(d => d.level > 0).length;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] mb-6">
       <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
       
       <div className="flex items-center justify-between mb-6">
         <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2">
            <Calendar size={14} className="text-cyan-400" />
            Contribution Heatmap
         </h3>
         <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-sm">{activeDays}</span> active days this year
         </div>
       </div>

       <div ref={scrollRef} className="overflow-x-auto pb-4 flex [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/[0.02] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 transition-all">
         <div className="flex gap-1.5 min-w-max">
           {weeks.map((week, wi) => (
             <div key={wi} className="flex flex-col gap-1.5">
               {week.map((day, di) => (
                 <div 
                   key={di} 
                   className={`w-3.5 h-3.5 rounded-[3px] border ${getLevelColor(day.level)} transition-all duration-300 hover:scale-125 hover:border-white/50 cursor-crosshair hover:z-10 relative`}
                   title={`${day.date.toDateString()}: ${day.level > 0 ? day.level : 'No'} case(s)`}
                 />
               ))}
             </div>
           ))}
         </div>
       </div>

       <div className="mt-2 flex items-center justify-end gap-2 text-[9px] uppercase tracking-widest font-bold text-slate-500">
         <span>Less</span>
         {[0,1,2,3,4].map(l => <div key={l} className={`w-3 h-3 rounded-[2px] border ${getLevelColor(l)}`} />)}
         <span>More</span>
       </div>
    </div>
  );
}

export function Profile() {
  const { profile, user } = useAuthStore();
  const navigate = useNavigate();
  const userId = user?.uid || '';

  const { data: attempts = [] } = useQuery<Attempt[]>({
    queryKey: ['user-attempts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const q = query(
        collection(db, 'attempts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        // Convert Firestore Timestamp to ISO string
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : String(data.createdAt);
        return { id: d.id, ...data, createdAt } as Attempt;
      });
    },
    enabled: !!userId,
  });

  const rankTitle = getRankTitle(profile?.level || 1);
  const recentCompleted = attempts.filter(a => a.completed).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans relative overflow-x-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative flex items-center justify-between px-6 py-3 border-b border-white/[0.05] bg-black/40 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tighter glow-cyan italic uppercase text-white">Detective Profile</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left: Identity Card */}
          <div className="w-full lg:w-1/3 space-y-6 relative z-10 shrink-0">
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-6 text-center flex flex-col items-center shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
               <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
               <div className="w-24 h-24 rounded-full border-2 border-cyan-500/50 bg-black flex items-center justify-center overflow-hidden mb-4 shadow-[0_0_20px_rgba(34,211,238,0.4)] shrink-0">
                 <div className="w-full h-full bg-gradient-to-br from-cyan-400/20 to-purple-600/20 flex items-center justify-center font-bold text-4xl text-white">
                    {profile?.username?.charAt(0).toUpperCase()}
                 </div>
              </div>
              <h1 className="text-2xl font-extrabold text-white uppercase tracking-tighter break-words w-full leading-tight">{profile?.username}</h1>
              {/* Dynamic rank title */}
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">{rankTitle}</div>
              
              <div className="w-full mt-6 text-left">
                <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 gap-2">
                  <span className="whitespace-nowrap">Level {profile?.level || 1}</span>
                  <span className="font-mono text-cyan-400 whitespace-nowrap text-right">{profile?.xp || 0} / {(profile?.level || 1) * 1000} XP</span>
                </div>
                <div className="h-2 bg-black/60 border border-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
                    style={{ width: `${Math.min(((profile?.xp || 0) / ((profile?.level || 1) * 1000)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
               <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
               <h3 className="text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest">Career Stats</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                     <div className="flex items-center gap-2 text-slate-300">
                        <Award size={16} className="text-cyan-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Cases Solved</span>
                     </div>
                     <span className="font-mono text-white">{profile?.casesSolved || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                     <div className="flex items-center gap-2 text-slate-300">
                        <Zap size={16} className="text-purple-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Current Streak</span>
                     </div>
                     <span className="font-mono text-white">{profile?.streak || 0} Days</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                     <div className="flex items-center gap-2 text-slate-300">
                        <Target size={16} className="text-yellow-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Total Coins</span>
                     </div>
                     <span className="font-mono text-white">{profile?.coins || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2 text-slate-300">
                        <Brain size={16} className="text-green-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Attempts</span>
                     </div>
                     <span className="font-mono text-white">{attempts.length}</span>
                  </div>
               </div>
            </div>
          </div>
          
          {/* Right: Heatmap + Recent Activity */}
          <div className="flex-1 w-full relative z-10">
            {/* Real heatmap from Firestore attempts */}
            <ActivityHeatmap attempts={attempts} />

            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-white uppercase tracking-tighter italic border-b border-white/10 pb-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Recent Activity</h2>
            
              <div className="space-y-4">
                {recentCompleted.length > 0 ? (
                  recentCompleted.map((attempt) => (
                    <div key={attempt.id} className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Code size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{timeAgo(new Date(attempt.createdAt))}</div>
                        <div className="text-sm font-bold text-white uppercase tracking-tight truncate">
                          Solved Case: <span className="text-cyan-400">{attempt.caseId.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <div className="text-xs font-mono font-bold text-cyan-400">Score: {attempt.score}/100</div>
                        {attempt.hintsUsed > 0 && (
                          <div className="text-[10px] font-mono text-slate-500">{attempt.hintsUsed} hint{attempt.hintsUsed > 1 ? 's' : ''} used</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] border-dashed rounded-xl p-8 text-center text-slate-500">
                      <p className="text-xs font-bold uppercase tracking-widest">No solved cases yet</p>
                      <p className="text-xs text-slate-600 mt-1">Complete your first investigation to see activity here.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
