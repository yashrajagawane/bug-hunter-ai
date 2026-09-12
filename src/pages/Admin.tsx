import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Plus, Trash2, RefreshCw, ShieldAlert, Save, Wand2, Loader2 } from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getIdToken } from 'firebase/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { Case } from '../lib/types';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
const LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++'] as const;

const EMPTY_FORM = {
  title: '',
  story: '',
  difficulty: 'Beginner' as typeof DIFFICULTIES[number],
  language: 'JavaScript' as typeof LANGUAGES[number],
  brokenCode: '',
  expectedBehavior: '',
  actualBehavior: '',
  xpReward: 500,
  coinReward: 100,
  timeLimit: 600,
  worldId: 'world-1',
};

export function Admin() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTopic, setAiTopic]     = useState('');
  const [aiLang, setAiLang]       = useState<typeof LANGUAGES[number]>('JavaScript');
  const [aiDiff, setAiDiff]       = useState<typeof DIFFICULTIES[number]>('Intermediate');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [serverTime, setServerTime] = useState<string | null>(null);

  // Health check on mount
  React.useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { setServerStatus('online'); setServerTime(d.timestamp); })
      .catch(() => setServerStatus('offline'));
  }, []);

  const handleGenerateWithAI = async () => {
    if (!auth.currentUser) return;
    setAiGenerating(true);
    try {
      const token = await getIdToken(auth.currentUser);
      const res = await fetch('/api/ai/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: aiLang, difficulty: aiDiff, topic: aiTopic }),
      });
      if (!res.ok) throw new Error(await res.text());
      const generated = await res.json();
      // Pre-fill the manual form and open it for review before saving
      setForm({
        title:            generated.title            || '',
        story:            generated.story            || '',
        brokenCode:       generated.brokenCode       || '',
        expectedBehavior: generated.expectedBehavior || '',
        actualBehavior:   generated.actualBehavior   || '',
        difficulty:       aiDiff,
        language:         aiLang,
        xpReward:         generated.xpReward         ?? 500,
        coinReward:       generated.coinReward        ?? 100,
        timeLimit:        generated.timeLimit         ?? 600,
        worldId:          generated.worldId           || 'world-ai',
      });
      setShowForm(true);
      toast.success('AI generated a case! Review and save it below.');
    } catch (e: any) {
      toast.error(`AI generation failed: ${e.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // Guard: only admins can access this page
  if (!profile?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-slate-300 font-sans">
        <div className="text-center space-y-4">
          <ShieldAlert size={48} className="text-red-400 mx-auto" />
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-tighter">Access Denied</h1>
          <p className="text-slate-500 text-sm">You must be an admin to view this page.</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 transition-all uppercase tracking-widest">
            Return to HQ
          </button>
        </div>
      </div>
    );
  }

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ['admin-cases'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'cases'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Case));
    },
  });

  const createCase = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const id = `case-${String(Date.now()).slice(-6)}`;
      await addDoc(collection(db, 'cases'), {
        ...data,
        id,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      toast.success('Case created!');
      queryClient.invalidateQueries({ queryKey: ['admin-cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const deleteCase = useMutation({
    mutationFn: async (caseId: string) => {
      await deleteDoc(doc(db, 'cases', caseId));
    },
    onSuccess: () => {
      toast.success('Case deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin-cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const field = (key: keyof typeof EMPTY_FORM, label: string, multiline = false) => (
    <div>
      <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">{label}</label>
      {multiline ? (
        <textarea
          rows={5}
          value={String(form[key])}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all resize-none"
        />
      ) : (
        <input
          type={typeof form[key] === 'number' ? 'number' : 'text'}
          value={form[key] as string | number}
          onChange={e => setForm(f => ({ ...f, [key]: typeof form[key] === 'number' ? Number(e.target.value) : e.target.value }))}
          className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans relative overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative flex items-center justify-between px-6 py-3 border-b border-white/[0.05] bg-black/40 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ShieldAlert size={16} className="text-purple-400" />
            <span className="text-xl font-extrabold tracking-tighter italic uppercase text-white">Admin Panel</span>
            {/* Server health badge */}
            <div
              title={serverTime ? `Server time: ${new Date(serverTime).toLocaleTimeString()}` : 'Checking...'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${
                serverStatus === 'online'   ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                serverStatus === 'offline'  ? 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse' :
                                             'text-slate-500 bg-white/[0.03] border-white/[0.05]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                serverStatus === 'online'  ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' :
                serverStatus === 'offline' ? 'bg-red-400' : 'bg-slate-500'
              }`} />
              {serverStatus === 'checking' ? '...' : serverStatus}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)]"
        >
          <Plus size={14} /> New Case
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* AI Case Generator */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-purple-500/20 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 size={16} className="text-purple-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-tighter text-white">Generate Case with Gemini AI</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Language</label>
                <select value={aiLang} onChange={e => setAiLang(e.target.value as any)} className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all">
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Difficulty</label>
                <select value={aiDiff} onChange={e => setAiDiff(e.target.value as any)} className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all">
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Topic hint (optional)</label>
                <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g. async race condition" className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all" />
              </div>
            </div>
            <button
              onClick={handleGenerateWithAI}
              disabled={aiGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl disabled:opacity-60 hover:from-purple-500 hover:to-purple-400 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              {aiGenerating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Wand2 size={14} /> Generate Case</>}
            </button>
          </div>
        </motion.div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <h2 className="text-sm font-extrabold uppercase tracking-tighter text-white mb-6">Create New Case</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {field('title', 'Title')}
              {field('worldId', 'World ID')}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as any }))}
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-all"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Language</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value as any }))}
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-all"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {field('xpReward', 'XP Reward')}
              {field('coinReward', 'Coin Reward')}
              {field('timeLimit', 'Time Limit (sec)')}
            </div>
            <div className="space-y-4 mb-6">
              {field('story', 'Story / Incident Report', true)}
              {field('brokenCode', 'Broken Code', true)}
              {field('expectedBehavior', 'Expected Behavior', true)}
              {field('actualBehavior', 'Actual Behavior', true)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => createCase.mutate(form)}
                disabled={createCase.isPending || !form.title || !form.brokenCode}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl disabled:opacity-50 hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-[0_0_15px_rgba(8,145,178,0.3)]"
              >
                <Save size={14} /> {createCase.isPending ? 'Saving...' : 'Save Case'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Cases Table */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
            <h2 className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              All Cases <span className="text-white ml-2 font-mono">{cases.length}</span>
            </h2>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-cases'] })} className="text-slate-500 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading cases...</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {cases.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="font-mono text-[10px] text-slate-500 shrink-0 w-20">{c.id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white uppercase tracking-tight truncate">{c.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-cyan-400 bg-cyan-500/10 border-cyan-500/20">{c.language}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        c.difficulty === 'Beginner' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                        c.difficulty === 'Intermediate' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                        c.difficulty === 'Advanced' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                        'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>{c.difficulty}</span>
                      <span className="text-[9px] font-mono text-yellow-400/70">+{c.xpReward} XP</span>
                      <span className="text-[9px] font-mono text-slate-500">⏱ {Math.floor((c.timeLimit || 600) / 60)}m</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete "${c.title}"?`)) deleteCase.mutate(c.id); }}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
