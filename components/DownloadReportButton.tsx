'use client';

interface MemberBalance {
  member_id: string;
  name?: string;
  phone?: string;
  current_balance: number;
  [key: string]: any;
}

export function DownloadReportButton({ members }: { members: MemberBalance[] }) {
  const handleDownload = () => {
    if (!members || members.length === 0) return;

    const headers = ['Player Name', 'Phone', 'Status', 'Current Balance (INR)'];
    const rows = members.map((m) => {
      const balance = Number(m.current_balance) || 0;
      const status = balance < 0 ? 'DUE' : balance > 0 ? 'ADVANCE' : 'NIL';
      const phone = m.phone ? `"${m.phone}"` : '"No phone"';
      const name = `"${(m.name || 'Unknown').replace(/"/g, '""')}"`;

      return [name, phone, status, balance].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Badminton_Balances_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleWhatsAppShare = async () => {
    if (!members || members.length === 0) return;

    const today = new Date().toLocaleDateString();
    let summaryText = `🏸 *Badminton Club Balances (${today})* 🏸\n\n`;

    members.forEach((m) => {
      const balance = Number(m.current_balance) || 0;
      const status = balance < 0 ? `₹${Math.abs(balance)} DUE` : balance > 0 ? `₹${balance} ADV` : 'Settled';
      summaryText += `• *${m.name || 'Player'}*: ${status}\n`;
    });

    summaryText += `\n_Generated via Latest Tracker_`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Badminton Club Report',
          text: summaryText,
        });
        return;
      } catch (err) {
        // Fallback if user cancels or native share fails
      }
    }

    const encodedText = encodeURIComponent(summaryText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDownload}
        type="button"
        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
        title="Download CSV report"
      >
        <span>📥</span> CSV
      </button>

      <button
        onClick={handleWhatsAppShare}
        type="button"
        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border border-emerald-200"
        title="Share report to WhatsApp"
      >
        <span>💬</span> WhatsApp
      </button>
    </div>
  );
}


