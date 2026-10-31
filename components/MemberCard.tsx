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
  const [deleting, setDeleting] = useState(false);

  const isNegative = member.current_balance < 0;
  const isLow = member.current_balance >= 0 && member.current_balance < 100;
  const dueAmount = Math.abs(member.current_balance);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return alert('Name cannot be empty');

    const targetBalance = parseFloat(editBalance);
    if (isNaN(targetBalance)) return alert('Please enter a valid balance number');

    setSaving(true);

    try {
      // 1. Update player name & phone
      const { error: memberError } = await supabase
        .from('members')
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
        })
        .eq('id', member.member_id);

      if (memberError) throw memberError;

      // 2. If balance changed, log adjustment in deposits
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
      <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs flex justify-between items-center">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900">{member.name}</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditName(member.name);
                  setEditPhone(member.phone || '');
                  setEditBalance(Number(member.current_balance).toFixed(2));
                  setIsEditing(true);
                }}
                className="text-gray-400 hover:text-gray-700 text-xs p-0.5 cursor-pointer"
                title="Edit Player Details"
              >
                ✏️
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">{member.phone || 'No phone'}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <p
              className={`text-base font-bold ${
                isNegative ? 'text-red-600' : isLow ? 'text-amber-500' : 'text-emerald-600'
              }`}
            >
              ₹{Number(member.current_balance).toFixed(2)}
            </p>
            <span className="text-[10px] uppercase font-semibold text-gray-400">
              {isNegative ? 'Due' : isLow ? 'Low' : 'Available'}
            </span>
          </div>

          {isAdmin && isNegative && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowQr(true)}
                className="bg-gray-900 text-white p-1.5 rounded-lg text-xs hover:bg-black font-semibold cursor-pointer"
                title="Show QR"
              >
                QR
              </button>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  title="WhatsApp Reminder"
                >
                  💬
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Player Details Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-4">Player Details</h3>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Current Balance (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg text-gray-900 font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Enter positive for deposit (e.g. <code>250</code>), negative for dues (e.g. <code>-207</code>).
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="w-1/2 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="w-full py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Removing...' : '🗑️ Delete Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
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