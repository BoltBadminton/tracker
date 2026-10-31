'use client';

import { useState } from 'react';
import UpiQrModal from './UpiQrModal';
import { generateWhatsAppReminderUrl } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface MemberProps {
  member: {
    member_id: string;
    name: string;
    phone: string | null;
    current_balance: number;
  };
  isAdmin: boolean;
}

export default function MemberCard({ member, isAdmin }: MemberProps) {
  const router = useRouter();
  const [showQr, setShowQr] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editPhone, setEditPhone] = useState(member.phone || '');
  const [editBalance, setEditBalance] = useState(Number(member.current_balance).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const balanceNumber = Number(member.current_balance) || 0;
  const isNegative = balanceNumber < 0;
  const isLow = balanceNumber >= 0 && balanceNumber < 100;
  const dueAmount = Math.abs(balanceNumber);

  const ORGANIZER_UPI_ID = 'sam.prabhu143@pingpay';
  const ORGANIZER_NAME = 'Nani';

  const whatsappUrl =
    isNegative && member.phone
      ? generateWhatsAppReminderUrl({
          phone: member.phone,
          memberName: member.name,
          dueAmount,
          organizerUpiId: ORGANIZER_UPI_ID,
          organizerName: ORGANIZER_NAME,
        })
      : null;

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  // One-click settle due: automatically inserts into deposits table
  const handleQuickSettle = async () => {
    if (dueAmount <= 0) return;

    const confirmed = window.confirm(
      `Confirm settlement of ₹${dueAmount.toFixed(2)} for ${member.name}?\n\nThis will credit their ledger and clear their due.`
    );
    if (!confirmed) return;

    setSettling(true);
    try {
      const { error } = await supabase.from('deposits').insert([
        {
          member_id: member.member_id,
          amount: dueAmount,
          payment_mode: 'UPI Settlement',
          note: `Quick one-click clearance of due ₹${dueAmount.toFixed(2)}`,
        },
      ]);

      if (error) throw error;
      router.refresh();
    } catch (err: any) {
      alert(`Failed to settle balance: ${err.message}`);
    } finally {
      setSettling(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return alert('Name cannot be empty');

    const targetBalance = parseFloat(editBalance);
    if (isNaN(targetBalance)) return alert('Please enter a valid balance number');

    setSaving(true);

    try {
      const { error: memberError } = await supabase
        .from('members')
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
        })
        .eq('id', member.member_id);

      if (memberError) throw memberError;

      const currentVal = Number(member.current_balance);
      const difference = targetBalance - currentVal;

      if (Math.abs(difference) > 0.001) {
        const { error: depositError } = await supabase.from('deposits').insert([
          {
            member_id: member.member_id,
            amount: difference,
            payment_mode: 'Admin Adjustment',
            note: `Manual balance update from ₹${currentVal.toFixed(2)} to ₹${targetBalance.toFixed(2)}`,
          },
        ]);

        if (depositError) throw depositError;
      }

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${member.name}"? This will delete the member and their ledger records.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', member.member_id);

    setDeleting(false);

    if (error) {
      alert(`Failed to delete: ${error.message}`);
    } else {
      setIsEditing(false);
      router.refresh();
    }
  };

  return (
    <>
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-md transition-all flex justify-between items-center gap-3">
        {/* Left: Avatar + Player Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 tracking-wider">
            {initials || 'P'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-slate-900 text-sm tracking-tight truncate">
                {member.name}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditName(member.name);
                    setEditPhone(member.phone || '');
                    setEditBalance(Number(member.current_balance).toFixed(2));
                    setIsEditing(true);
                  }}
                  className="text-slate-400 hover:text-slate-800 text-xs p-1 cursor-pointer transition"
                  title="Edit Player Details"
                >
                  ✏️
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
              {member.phone || 'No phone'}
            </p>
          </div>
        </div>

        {/* Right: Balance + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p
              className={`text-base font-black tabular-nums tracking-tight ${
                isNegative
                  ? 'text-rose-600'
                  : isLow
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span
              className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 ${
                isNegative
                  ? 'bg-rose-100 text-rose-700'
                  : isLow
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isNegative ? 'Due' : isLow ? 'Low' : 'Advance'}
            </span>
          </div>

          {/* Action buttons */}
          {isNegative && (
            <div className="flex items-center gap-1.5 ml-1">
              {/* One-Click Admin Settle Button */}
              {isAdmin && (
                <button
                  onClick={handleQuickSettle}
                  disabled={settling}
                  className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs active:scale-95 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  title="One-Click Settle: Mark full due as paid"
                >
                  {settling ? '...' : '✓ Clear'}
                </button>
              )}

              {/* QR Modal Button */}
              <button
                onClick={() => setShowQr(true)}
                className="w-8 h-8 rounded-xl bg-slate-900 text-white hover:bg-black flex items-center justify-center text-[10px] font-black active:scale-95 transition cursor-pointer"
                title="Pay via UPI QR"
              >
                QR
              </button>

              {/* Admin WhatsApp Reminder */}
              {isAdmin && whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs active:scale-95 transition cursor-pointer"
                  title="WhatsApp Reminder"
                >
                  💬
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Edit Player</h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Current Balance (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Positive for advance credit (e.g. <code>250</code>), negative for dues (e.g. <code>-207</code>).
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2 h-11 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="w-1/2 h-11 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="w-full py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl disabled:opacity-50 transition cursor-pointer"
              >
                {deleting ? 'Removing...' : '🗑️ Delete Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UpiQrModal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        memberName={member.name}
        amount={dueAmount}
        upiId={ORGANIZER_UPI_ID}
        payeeName={ORGANIZER_NAME}
      />
    </>
  );
}

export { MemberCard };