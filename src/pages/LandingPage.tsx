import React, { useEffect } from 'react';
import { getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Terminal, ShieldAlert, Cpu, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
      const code = error instanceof Error && 'code' in error
        ? String((error as Error & { code?: string }).code)
        : '';

      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, googleAuthProvider);
        return;
      }

      setLoginError(code ? `Login failed (${code}). Check Firebase Authentication settings.` : 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login failed:", error);
      const code = error instanceof Error && 'code' in error
        ? String((error as Error & { code?: string }).code)
        : '';
      setLoginError(code ? `Login failed (${code}). Check Firebase Authentication settings.` : 'Login failed. Please try again.');
      setIsLoggingIn(false);
    });
  }, []);

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
            disabled={isLoggingIn}
            className="px-5 py-2 text-sm font-bold text-white bg-cyan-600/20 border border-cyan-500/50 rounded hover:bg-cyan-500/30 transition-all duration-200 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoggingIn && <Loader2 size={14} className="animate-spin" />}
            Agent Login
          </button>
          {loginError && (
            <p role="alert" className="mt-3 max-w-md text-sm text-red-400">{loginError}</p>
          )}
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
              disabled={isLoggingIn}
              className="group flex items-center gap-2 px-8 py-4 bg-cyan-600 text-white rounded font-extrabold text-lg uppercase tracking-widest hover:bg-cyan-500 transition-all duration-300 shadow-[0_10px_20px_rgba(8,145,178,0.3)] transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoggingIn
                ? <><Loader2 size={20} className="animate-spin" /> Authenticating...</>
                : <><span>Start Investigation</span><ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
              }
            </button>
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-8 py-4 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] text-slate-200 rounded font-bold text-lg uppercase tracking-widest hover:border-cyan-500 hover:text-cyan-400 hover:bg-white/[0.05] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Explore Cases
            </button>
          </div>
        </div>

        {/* Stats strip — social proof */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-20 py-6 border-y border-white/[0.05]">
          {[
            { icon: '🕵️', value: 12, label: 'Cases' },
            { icon: '⚡', value: 4, label: 'Languages' },
            { icon: '🏆', value: 14, label: 'Achievements' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 text-center">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tighter">{stat.value}+</div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
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
