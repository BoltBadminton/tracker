'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function NewSessionPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [courtFee, setCourtFee] = useState<number>(600);
  const [shuttlesUsed, setShuttlesUsed] = useState<number>(3);
  const [shuttlePrice, setShuttlePrice] = useState<number>(150);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('members').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setMembers(data);
    });
  }, []);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const totalCost = Number(courtFee) + Number(shuttlesUsed) * Number(shuttlePrice);
  const perPersonShare = selectedIds.length > 0 ? (totalCost / selectedIds.length).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return alert('Select at least one player');

    setSubmitting(true);
    const { error } = await supabase.rpc('record_badminton_session', {
      p_session_date: new Date().toISOString().split('T')[0],
      p_court_fee: courtFee,
      p_shuttles_used: shuttlesUsed,
      p_shuttle_unit_price: shuttlePrice,
      p_attendee_ids: selectedIds,
    });

    setSubmitting(false);
    if (error) {
      alert(error.message);
    } else {
      router.push('/members');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 flex-1 w-full">
      <h1 className="text-xl font-bold mb-4">Record Match Session</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Court Fee (₹)</label>
          <input
            type="number"
            value={courtFee}
            onChange={(e) => setCourtFee(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Shuttles Used</label>
            <input
              type="number"
              value={shuttlesUsed}
              onChange={(e) => setShuttlesUsed(Number(e.target.value))}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price / Shuttle (₹)</label>
            <input
              type="number"
              value={shuttlePrice}
              onChange={(e) => setShuttlePrice(Number(e.target.value))}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Attendees ({selectedIds.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const selected = selectedIds.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    selected ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="flex justify-between text-sm text-emerald-950">
            <span>Total Cost:</span>
            <span className="font-bold">₹{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base text-emerald-950 mt-1 pt-1 border-t border-emerald-200">
            <span>Split per Player:</span>
            <span className="font-extrabold text-emerald-700">₹{perPersonShare}</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Deduct & Save Session'}
        </button>
      </form>
    </div>
  );
}
