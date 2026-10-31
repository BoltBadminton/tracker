#!/bin/bash

# 1. Install packages
npm install @supabase/ssr @supabase/supabase-js qrcode.react

# 2. Make directories
mkdir -p lib components app/members app/session/new app/deposits/new app/login

# 3. Create lib/supabaseClient.ts
cat << 'EOF' > lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
EOF

# 4. Create lib/supabaseServer.ts
cat << 'EOF' > lib/supabaseServer.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled in middleware
          }
        },
      },
    }
  );
}
EOF

# 5. Create lib/auth.ts
cat << 'EOF' > lib/auth.ts
import { createClient } from '@/lib/supabaseServer';

export async function getCurrentUserRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  return member?.role || 'player';
}
EOF

# 6. Create lib/whatsapp.ts
cat << 'EOF' > lib/whatsapp.ts
interface ReminderParams {
  phone: string;
  memberName: string;
  dueAmount: number;
  organizerUpiId: string;
  organizerName: string;
}

export function generateWhatsAppReminderUrl({
  phone,
  memberName,
  dueAmount,
  organizerUpiId,
  organizerName,
}: ReminderParams): string {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const formattedAmount = dueAmount.toFixed(2);
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(organizerUpiId)}&pn=${encodeURIComponent(
    organizerName
  )}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Badminton dues - ${memberName}`)}`;

  const message = `Hey ${memberName}! 🏸\n\nYour badminton club pending balance is *₹${formattedAmount}*.\n\nClear using this UPI link:\n${upiIntentUrl}\n\nOr UPI to: *${organizerUpiId}*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
EOF

# 7. Create components/UpiQrModal.tsx
cat << 'EOF' > components/UpiQrModal.tsx
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
  upiId = 'smashclub@okhdfcbank',
  payeeName = 'Smash Badminton Club',
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
        <p className="text-[11px] text-gray-400 mt-3 font-medium">Scan with GPay, PhonePe, Paytm</p>
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
EOF

# 8. Create components/MemberCard.tsx
cat << 'EOF' > components/MemberCard.tsx
'use client';

import { useState } from 'react';
import UpiQrModal from './UpiQrModal';
import { generateWhatsAppReminderUrl } from '@/lib/whatsapp';

interface MemberProps {
  member: {
    member_id: string;
    name: string;
    phone: string | null;
    current_balance: number;
  };
  isAdmin: boolean;
}

export function MemberCard({ member, isAdmin }: MemberProps) {
  const [showQr, setShowQr] = useState(false);
  const isNegative = member.current_balance < 0;
  const isLow = member.current_balance >= 0 && member.current_balance < 100;
  const dueAmount = Math.abs(member.current_balance);

  const whatsappUrl =
    isNegative && member.phone
      ? generateWhatsAppReminderUrl({
          phone: member.phone,
          memberName: member.name,
          dueAmount,
          organizerUpiId: 'smashclub@okhdfcbank',
          organizerName: 'Smash Club',
        })
      : null;

  return (
    <>
      <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs flex justify-between items-center">
        <div>
          <p className="font-semibold text-gray-900">{member.name}</p>
          <p className="text-xs text-gray-500">{member.phone || 'No phone'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <p className={`text-base font-bold ${isNegative ? 'text-red-600' : isLow ? 'text-amber-500' : 'text-emerald-600'}`}>
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
                className="bg-gray-900 text-white p-1.5 rounded-lg text-xs hover:bg-black"
                title="Show QR"
              >
                QR
              </button>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold"
                >
                  💬
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <UpiQrModal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        memberName={member.name}
        amount={dueAmount}
      />
    </>
  );
}
EOF

# 9. Create middleware.ts in root
cat << 'EOF' > middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/members', request.url));
  }

  const adminRoutes = ['/session/new', '/deposits/new'];
  if (user && adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (member?.role !== 'admin') {
      return NextResponse.redirect(new URL('/members', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
EOF

# 10. Create app/layout.tsx & app/manifest.ts
cat << 'EOF' > app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Badminton Club Expense Tracker',
    short_name: 'SmashLedger',
    description: 'Track shuttle shares and member game balances',
    start_url: '/members',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
  };
}
EOF

cat << 'EOF' > app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Badminton Club Tracker',
  description: 'Manage deposits and court/shuttle cost shares',
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <main className="max-w-md mx-auto min-h-screen flex flex-col bg-white border-x border-gray-100 shadow-sm">
          {children}
        </main>
      </body>
    </html>
  );
}
EOF

# 11. Create app/login/page.tsx
cat << 'EOF' > app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Account created! Logging you in...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.refresh();
      router.push('/members');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12">
      <div className="text-center">
        <span className="text-4xl">🏸</span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Smash Club Tracker</h2>
        <p className="mt-1 text-sm text-gray-500">{isSignUp ? 'Create your account' : 'Sign in to access your ledger'}</p>
      </div>
      <div className="mt-8">
        <form onSubmit={handleAuth} className="space-y-4">
          {errorMsg && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{errorMsg}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="player@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 text-sm disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
            className="text-xs text-emerald-600 hover:underline font-medium"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
EOF

# 12. Create app/members/page.tsx
cat << 'EOF' > app/members/page.tsx
import { createClient } from '@/lib/supabaseServer';
import { getCurrentUserRole } from '@/lib/auth';
import { MemberCard } from '@/components/MemberCard';
import Link from 'next/link';

export const revalidate = 0;

export default async function MembersPage() {
  const supabase = await createClient();
  const role = await getCurrentUserRole();
  const isAdmin = role === 'admin';

  const { data: members } = await supabase
    .from('member_balances')
    .select('*')
    .order('current_balance', { ascending: true });

  return (
    <div className="max-w-md mx-auto p-4 pb-24 flex-1 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">🏸 Group Balances</h1>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {role} View
          </span>
        </div>
        {isAdmin && (
          <Link href="/deposits/new" className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            + Add Deposit
          </Link>
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
EOF

# 13. Create app/session/new/page.tsx
cat << 'EOF' > app/session/new/page.tsx
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
EOF

# 14. Create app/deposits/new/page.tsx
cat << 'EOF' > app/deposits/new/page.tsx
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
EOF

# 15. Root redirect
cat << 'EOF' > app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/members');
}
EOF

echo "All project files created successfully!"