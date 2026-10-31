'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Account created! Logging you in...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.refresh();
      router.push('/members');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111315] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Subtle Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm z-10">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 relative mb-3 drop-shadow-[0_8px_20px_rgba(217,163,94,0.25)]">
            <Image
              src="/bolt-logo.png"
              alt="Bolt Badminton Club"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            BOLT <span className="text-[#C8A26A]">BADMINTON</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isSignUp ? 'Create your player account' : 'Sign in to access your ledger'}
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[#1A1D20]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {errorMsg && (
            <div className="mb-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full h-11 px-3.5 bg-[#111315] border border-gray-700/80 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C8A26A] focus:ring-1 focus:ring-[#C8A26A] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 bg-[#111315] border border-gray-700/80 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C8A26A] focus:ring-1 focus:ring-[#C8A26A] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-[#C8A26A] to-[#E3C392] hover:opacity-95 active:scale-[0.99] text-[#111315] font-extrabold rounded-xl text-sm shadow-lg shadow-[#C8A26A]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
              className="text-xs text-gray-400 hover:text-white transition"
            >
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <span className="text-[#C8A26A] font-semibold underline underline-offset-4">
                    Sign in
                  </span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <span className="text-[#C8A26A] font-semibold underline underline-offset-4">
                    Sign up
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 text-center mt-6">
          Bolt Badminton Club • Est. 2025
        </p>
      </div>
    </div>
  );
}