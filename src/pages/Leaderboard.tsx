import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Trophy, Zap, Award, Target } from 'lucide-react';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getRankTitle } from '../lib/utils';

interface LeaderboardEntry {
  uid: string;
  username: string;
  xp: number;
  level: number;
  casesSolved: number;
  streak: number;
}

const MEDAL_COLORS = [
  'text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  'text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.4)]',
  'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]',
];

const TABS = ['XP', 'Cases Solved', 'Streak'] as const;
type Tab = typeof TABS[number];

const fetchLeaderboard = async (tab: Tab): Promise<LeaderboardEntry[]> => {
  const fieldMap: Record<Tab, string> = {
    'XP': 'xp',
    'Cases Solved': 'casesSolved',
    'Streak': 'streak',
  };
  const q = query(
    collection(db, 'users'),
    orderBy(fieldMap[tab], 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as LeaderboardEntry));
};

export function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<Tab>('XP');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: () => fetchLeaderboard(activeTab),
    staleTime: 1000 * 60 * 2, // 2 min cache
  });

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const item = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } };

  const fieldMap: Record<Tab, keyof LeaderboardEntry> = {
    'XP': 'xp',
    'Cases Solved': 'casesSolved',
    'Streak': 'streak',
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans relative overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative flex items-center justify-between px-6 py-3 border-b border-white/[0.05] bg-black/40 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <span className="text-xl font-extrabold tracking-tighter italic uppercase text-white">Leaderboard</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/[0.02] border border-white/[0.05] rounded-xl p-1.5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {!isLoading && entries.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {[1, 0, 2].map(podiumIdx => {
              const entry = entries[podiumIdx];
              const rank = podiumIdx + 1;
              const heights = [' h-28', 'h-36', 'h-24'];
              const isMe = entry.uid === user?.uid;
              return (
                <motion.div
                  key={entry.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: podiumIdx * 0.1 }}
                  className={`flex flex-col items-center gap-2 flex-1 ${heights[podiumIdx]}`}
                >
                  <div className={`text-2xl font-black ${MEDAL_COLORS[podiumIdx]}`}>
                    {podiumIdx === 0 ? '🥇' : podiumIdx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xl text-white ${isMe ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/20 bg-white/5'}`}>
                    {entry.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-extrabold uppercase tracking-tight ${isMe ? 'text-cyan-400' : 'text-white'} truncate max-w-[80px]`}>{entry.username}</div>
                    <div className="text-[10px] font-mono text-slate-400">{entry[fieldMap[activeTab]].toLocaleString()}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {isLoading ? (
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-8 h-4 bg-white/5 rounded" />
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-1">
                    <div className="w-32 h-3 bg-white/10 rounded" />
                    <div className="w-20 h-2 bg-white/5 rounded" />
                  </div>
                  <div className="w-16 h-4 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No detectives ranked yet. Be the first!</div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show">
              {entries.map((entry, idx) => {
                const isMe = entry.uid === user?.uid;
                const medal = idx < 3 ? MEDAL_COLORS[idx] : null;
                return (
                  <motion.div
                    variants={item}
                    key={entry.uid}
                    className={`flex items-center gap-4 p-4 border-b border-white/[0.04] last:border-0 transition-colors ${isMe ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500' : 'hover:bg-white/[0.02]'}`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-mono font-bold text-sm shrink-0 ${medal || 'text-slate-500'}`}>
                      {idx + 1}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-white shrink-0 ${isMe ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
                      {entry.username?.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + rank title */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-extrabold uppercase tracking-tight truncate ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                        {entry.username} {isMe && <span className="text-[9px] normal-case font-normal text-cyan-600">(you)</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                        Lvl {entry.level} · {getRankTitle(entry.level)}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Cases</div>
                        <div className="text-xs font-mono text-slate-300">{entry.casesSolved}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Streak</div>
                        <div className="text-xs font-mono text-slate-300">{entry.streak}d</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">{activeTab}</div>
                        <div className={`font-mono font-bold text-sm ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                          {entry[fieldMap[activeTab]].toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
