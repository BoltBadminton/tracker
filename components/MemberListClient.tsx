'use client';

import { useState, useMemo } from 'react';
import MemberCard from './MemberCard';

interface Member {
  member_id: string;
  name: string;
  phone: string | null;
  current_balance: number;
}

interface MemberListClientProps {
  members: Member[];
  isAdmin: boolean;
}

export function MemberListClient({ members, isAdmin }: MemberListClientProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'advance'>('all');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase().trim();
      const nameMatch = m.name?.toLowerCase().includes(q);
      const phoneMatch = m.phone ? m.phone.includes(q) : false;
      const matchesSearch = !q || nameMatch || phoneMatch;

      const balance = Number(m.current_balance) || 0;
      if (!matchesSearch) return false;

      if (filter === 'due') return balance < 0;
      if (filter === 'advance') return balance > 0;
      return true;
    });
  }, [members, search, filter]);

  return (
    <div className="space-y-3">
      {/* Search Input & Quick Filter Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search player by name or phone..."
            className="w-full h-11 pl-4 pr-10 bg-white border-2 border-slate-900 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-slate-900 transition ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            All ({members.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-slate-900 transition ${
              filter === 'due'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-rose-600 hover:bg-rose-50'
            }`}
          >
            With Dues ({members.filter((m) => Number(m.current_balance) < 0).length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('advance')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-slate-900 transition ${
              filter === 'advance'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Advance ({members.filter((m) => Number(m.current_balance) > 0).length})
          </button>
        </div>
      </div>

      {/* Filtered Member Cards */}
      <div className="space-y-3 pt-1">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((m) => (
            <MemberCard key={m.member_id} member={m} isAdmin={isAdmin} />
          ))
        ) : (
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 text-center text-slate-500 text-xs font-semibold">
            No players found matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}