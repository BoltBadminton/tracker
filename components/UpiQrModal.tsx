'use client';

import { QRCodeSVG } from 'qrcode.react';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  amount: number;
  upiId?: string;
  payeeName?: string;
}

export default function UpiQrModal({
  isOpen,
  onClose,
  memberName,
  amount,
  upiId = 'sam.prabhu143@pingpay',
  payeeName = 'Nani',
}: UpiQrModalProps) {
  if (!isOpen) return null;

  const formattedAmount = amount.toFixed(2);
  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Badminton dues - ${memberName}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold"
        >
          ✕
        </button>
        <h3 className="text-base font-bold text-gray-900 mt-1">Scan & Pay</h3>
        <p className="text-xs text-gray-500 mt-0.5">Dues for {memberName}</p>
        <div className="my-3 py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg inline-block">
          <span className="text-2xl font-black text-emerald-700">₹{formattedAmount}</span>
        </div>
        <div className="p-3 bg-white border border-gray-200 rounded-xl inline-flex mx-auto">
          <QRCodeSVG value={upiPayload} size={180} level="M" />
        </div>
        <p className="text-[11px] text-gray-400 mt-3 font-medium">Scan with PhonePe, GPay, Paytm</p>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <span className="truncate max-w-[170px] font-mono">{upiId}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(upiId);
              alert('UPI ID copied!');
            }}
            className="text-emerald-600 font-semibold text-[11px] hover:underline"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}