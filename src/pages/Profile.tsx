import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Award, Target, Zap, Brain, Code } from 'lucide-react';

export function Profile() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans relative overflow-x-hidden">
      {/* Ambient background orbs for glassmorphism */}
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
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          <div className="w-full md:w-1/3 space-y-6 relative z-10">
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-8 text-center flex flex-col items-center shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
               <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
               <div className="w-24 h-24 rounded-full border-2 border-cyan-500/50 bg-black flex items-center justify-center overflow-hidden mb-4 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                 <div className="w-full h-full bg-gradient-to-br from-cyan-400/20 to-purple-600/20 flex items-center justify-center font-bold text-4xl text-white">
                    {profile?.username?.charAt(0).toUpperCase()}
                 </div>
              </div>
              <h1 className="text-2xl font-extrabold text-white uppercase tracking-tighter">{profile?.username}</h1>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Rookie Debugger</div>
              
              <div className="w-full mt-6 text-left">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Level {profile?.level || 1}</span>
                  <span className="font-mono text-cyan-400">{profile?.xp} / {(profile?.level || 1) * 1000} XP</span>
                </div>
                <div className="h-2 bg-black/60 border border-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
                    style={{ width: `${((profile?.xp || 0) / ((profile?.level || 1) * 1000)) * 100}%` }}
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
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2 text-slate-300">
                        <Brain size={16} className="text-yellow-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Total Coins</span>
                     </div>
                     <span className="font-mono text-white">{profile?.coins || 0}</span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-6 relative z-10">
            <h2 className="text-xl font-extrabold text-white uppercase tracking-tighter italic border-b border-white/10 pb-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Recent Activity</h2>
            
            <div className="space-y-4">
               <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                     <Code size={20} />
                  </div>
                  <div>
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">2 days ago</div>
                     <div className="text-sm font-bold text-white uppercase tracking-tight">Solved Case #043: Deadlock in Production</div>
                  </div>
                  <div className="ml-auto text-xs font-mono font-bold text-cyan-400">+500 XP</div>
               </div>
               
               <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                     <Target size={20} />
                  </div>
                  <div>
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">3 days ago</div>
                     <div className="text-sm font-bold text-white uppercase tracking-tight">Completed Daily Mission</div>
                  </div>
                  <div className="ml-auto text-xs font-mono font-bold text-cyan-400">+300 XP</div>
               </div>
               
               <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] border-dashed rounded-xl p-8 text-center text-slate-500">
                  <p className="text-xs font-bold uppercase tracking-widest">No more recent activity</p>
               </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
