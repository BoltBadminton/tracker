'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewMemberPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Player name is required');

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Insert player into members table
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert([{
          name: name.trim(),
          phone: phone.trim() || null,
          role: 'player',
          is_active: true
        }])
        .select()
        .single();

      if (memberError) throw memberError;

      // 2. If opening deposit entered, record it automatically
      const depositVal = parseFloat(initialDeposit);
      if (!isNaN(depositVal) && depositVal > 0 && member) {
        const { error: depositError } = await supabase
          .from('deposits')
          .insert([{
            member_id: member.id,
            amount: depositVal,
            payment_mode: 'Initial Opening Balance',
            note: 'Initial balance from sheet'
          }]);
        if (depositError) throw depositError;
      }

      router.push('/members');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 flex-1 w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🏸 Add New Player</h1>
        <Link href="/members" className="text-xs text-gray-500 hover:underline">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{errorMsg}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Player Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Prasanna bro"
            className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210 (for WhatsApp reminders)"
            className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Initial Deposit / Advance (₹) (Optional)
          </label>
          <input
            type="number"
            step="any"
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(e.target.value)}
            placeholder="e.g. 1728"
            className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-white"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Leave blank if starting at ₹0.00 balance.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 mt-6"
        >
          {submitting ? 'Adding Player...' : '+ Save Player'}
        </button>
      </form>
    </div>
  );
}