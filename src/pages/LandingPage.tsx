import React, { useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Bug, ChevronRight, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans selection:bg-cyan-500/30 relative overflow-x-hidden">
      {/* Ambient background orbs for glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <nav className="border-b border-white/[0.05] bg-black/40 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className='w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded flex items-center justify-center text-black font-bold shadow-[0_0_10px_rgba(34,211,238,0.4)]'>D</div>
            <span className="text-xl font-extrabold tracking-tighter glow-cyan italic text-white">AI DEBUG DETECTIVE</span>
            <span className='ml-4 px-2 py-0.5 rounded border border-cyan-500/50 text-[10px] text-cyan-400 uppercase font-mono tracking-widest hidden sm:inline-block'>Case Mode: Alpha</span>
          </div>
          <button 
            onClick={handleLogin}
            className="px-5 py-2 text-sm font-bold text-white bg-cyan-600/20 border border-cyan-500/50 rounded hover:bg-cyan-500/30 transition-all duration-200 uppercase tracking-widest"
          >
            Agent Login
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-purple-500/30 text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4 bg-purple-500/10">
            <Terminal size={14} />
            System initialized. Awaiting detective...
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-tight italic">
            EVERY BUG HAS A STORY.<br />
            <span className="glow-cyan text-cyan-400">
              BECOME THE DETECTIVE.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
            Investigate broken code, solve programming mysteries, and become a debugging expert with AI-powered mentorship.
          </p>
          
          <div className="flex items-center gap-4 pt-8">
            <button 
              onClick={handleLogin}
              className="group flex items-center gap-2 px-8 py-4 bg-cyan-600 text-white rounded font-extrabold text-lg uppercase tracking-widest hover:bg-cyan-500 transition-all duration-300 shadow-[0_10px_20px_rgba(8,145,178,0.3)] transform hover:-translate-y-1"
            >
              Start Investigation
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] text-slate-200 rounded font-bold text-lg uppercase tracking-widest hover:border-cyan-500 hover:text-cyan-400 hover:bg-white/[0.05] transition-all duration-300">
              Explore Cases
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-32">
          <FeatureCard 
            icon={<Cpu size={24} className="text-purple-400" />}
            title="REAL-WORLD MYSTERIES"
            description="Fix actual production bugs ranging from simple syntax errors to complex deadlocks and race conditions."
          />
          <FeatureCard 
            icon={<ShieldAlert size={24} className="text-cyan-400" />}
            title="AI INTERROGATION"
            description="Interrogate 'Detective AI' for progressive hints without spoiling the entire solution."
          />
          <FeatureCard 
            icon={<Terminal size={24} className="text-yellow-400" />}
            title="RPG PROGRESSION"
            description="Earn XP, climb the detective ranks, unlock achievements, and defeat boss-level bugs."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-cyan-500/50 hover:bg-white/[0.04] transition-all group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center mb-6 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-extrabold text-white mb-3 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
