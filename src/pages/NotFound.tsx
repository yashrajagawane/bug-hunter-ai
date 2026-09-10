import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Terminal } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 text-center px-6 max-w-lg"
      >
        {/* Terminal icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.2)]">
            <Terminal size={40} className="text-red-400" />
          </div>
        </div>

        {/* Glitchy 404 */}
        <div className="font-mono font-black text-[96px] leading-none text-white/5 select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          404
        </div>

        <div className="font-mono text-red-400 text-[10px] uppercase tracking-widest mb-2">
          Error 404 — Case File Not Found
        </div>
        <h1 className="text-4xl font-extrabold text-white uppercase tracking-tighter italic mb-4">
          Dead End
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          The evidence trail went cold. This page doesn't exist or was moved. Return to headquarters and pick up a real case.
        </p>

        {/* Fake terminal output */}
        <div className="bg-black/60 border border-white/[0.05] rounded-xl p-4 font-mono text-xs text-left mb-8 shadow-inner">
          <span className="text-slate-500">$ </span>
          <span className="text-green-400">locate</span>
          <span className="text-slate-300"> {window.location.pathname}</span>
          <br />
          <span className="text-red-400">FATAL: </span>
          <span className="text-slate-400">No such file or directory</span>
          <br />
          <span className="text-slate-500">$ </span>
          <span className="text-cyan-400 animate-pulse">_</span>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="group inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl shadow-[0_5px_20px_rgba(8,145,178,0.4)] transition-all hover:scale-105 active:scale-95"
        >
          <Home size={16} />
          Return to HQ
        </button>
      </motion.div>
    </div>
  );
}
