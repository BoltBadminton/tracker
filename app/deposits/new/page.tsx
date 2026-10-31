'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function NewDepositPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('500');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('members').select('id, name').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setMembers(data);
        setMemberId(data[0].id);
      }
    });
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !amount) return;

    setSaving(true);
    const { error } = await supabase.from('deposits').insert([
      { member_id: memberId, amount: parseFloat(amount), payment_mode: paymentMode, note }
    ]);
    setSaving(false);

    if (error) {
      alert(error.message);
    } else {
      router.push('/members');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 flex-1 w-full">
      <h1 className="text-xl font-bold mb-4">Record Deposit</h1>
      <form onSubmit={handleDeposit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Member</label>
          <select 
            value={memberId} 
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg bg-white"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
          <div className="flex gap-4 mt-2">
            {['UPI', 'Cash', 'Bank'].map((mode) => (
              <label key={mode} className="flex items-center gap-1.5 text-sm">
                <input 
                  type="radio" 
                  name="paymentMode" 
                  value={mode} 
                  checked={paymentMode === mode} 
                  onChange={() => setPaymentMode(mode)} 
                />
                {mode}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Note / Transaction ID</label>
          <input 
            type="text" 
            value={note} 
            placeholder="e.g. GPay UPI Ref"
            onChange={(e) => setNote(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg" 
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 mt-6"
        >
          {saving ? 'Adding...' : 'Confirm Deposit'}
        </button>
      </form>
    </div>
  );
}
