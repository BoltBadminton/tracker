'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      type="button"
      className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-2 border-slate-900 px-2.5 py-1 rounded-xl text-[11px] font-bold transition shadow-xs cursor-pointer active:scale-95"
      title="Sign out of your account"
    >
      <span>🚪</span>
      <span>Logout</span>
    </button>
  );
}