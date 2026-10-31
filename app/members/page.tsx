import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getCurrentUserRole } from '@/lib/auth';
import { DownloadReportButton } from '@/components/DownloadReportButton';
import { LogoutButton } from '@/components/LogoutButton';
import { MemberListClient } from '@/components/MemberListClient';

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
          Loading player balances...
        </div>
      }
    >
      <MembersContent />
    </Suspense>
  );
}

async function MembersContent() {
  await connection();

  const supabase = await createClient();
  const role = await getCurrentUserRole();
  const isAdmin = role === 'admin';
  //const isAdmin = false; // Forced player view for preview

  const { data: members } = await supabase
    .from('member_balances')
    .select('*')
    .order('current_balance', { ascending: true });

  const totalDues = members
    ? members
        .filter((m) => Number(m.current_balance) < 0)
        .reduce((sum, m) => sum + Math.abs(Number(m.current_balance)), 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-900">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative">
              <Image
                src="/bolt-logo.png"
                alt="Bolt Club Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-black tracking-tight text-slate-900 leading-none">
                BOLT BADMINTON
              </p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Est. 2025</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 ${
                isAdmin
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {role || 'Player'} View
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-5">
        {/* Total Group Dues Card */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] mb-5">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold mb-1">
            <span>Total Players: {members?.length || 0}</span>
            <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Live Balances
            </span>
          </div>

          <div className="flex justify-between items-end mt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Total Unsettled Dues
              </p>
              <p className="text-3xl font-black text-rose-600 tracking-tight">
                ₹{totalDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DownloadReportButton members={members || []} />
          </div>
        </div>

        {/* Section Heading & Action Buttons */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Player Overview
          </h2>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href="/members/new"
                className="bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
              >
                + Player
              </Link>
              <Link
                href="/deposits/new"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
              >
                + Deposit
              </Link>
            </div>
          )}
        </div>

        {/* Searchable Member List */}
        <MemberListClient members={members || []} isAdmin={isAdmin} />
      </main>

      {/* Floating Action Button */}
      {isAdmin && (
        <div className="fixed bottom-6 inset-x-0 max-w-md mx-auto px-4 flex justify-end pointer-events-none z-30">
          <Link
            href="/session/new"
            className="pointer-events-auto flex items-center gap-2 bg-slate-900 hover:bg-black text-white border-2 border-slate-900 px-5 py-3 rounded-full font-black text-sm shadow-xl active:scale-95 transition cursor-pointer"
          >
            <span className="text-lg leading-none">+</span>
            <span>Record Session</span>
          </Link>
        </div>
      )}
    </div>
  );
}