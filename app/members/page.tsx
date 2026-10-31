import { Suspense } from 'react';
import { createClient } from '@/lib/supabaseServer';
import { getCurrentUserRole } from '@/lib/auth';
import { MemberCard } from '@/components/MemberCard';
import { DownloadReportButton } from '@/components/DownloadReportButton';
import Link from 'next/link';

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto p-4 text-center text-gray-500 text-sm">
          Loading group balances...
        </div>
      }
    >
      <MembersContent />
    </Suspense>
  );
}

async function MembersContent() {
  const supabase = await createClient();
  const role = await getCurrentUserRole();
  const isAdmin = role === 'admin';

  const { data: members } = await supabase
    .from('member_balances')
    .select('*')
    .order('current_balance', { ascending: true });

  return (
    <div className="max-w-md mx-auto p-4 pb-24 flex-1 w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold">🏸 Group Balances</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
              {role} View
            </span>
            <DownloadReportButton members={members || []} />
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/members/new"
              className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-black"
            >
              + Add Player
            </Link>
            <Link
              href="/deposits/new"
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              + Deposit
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {members?.map((m) => (
          <MemberCard key={m.member_id} member={m} isAdmin={isAdmin} />
        ))}
      </div>

      {isAdmin && (
        <div className="fixed bottom-6 right-6">
          <Link
            href="/session/new"
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-full font-bold shadow-lg hover:bg-emerald-700"
          >
            <span>+</span> Record Session
          </Link>
        </div>
      )}
    </div>
  );
}