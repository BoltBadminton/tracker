interface ReminderParams {
  phone: string;
  memberName: string;
  dueAmount: number;
  organizerUpiId?: string;
  organizerName?: string;
}

export function generateWhatsAppReminderUrl({
  phone,
  memberName,
  dueAmount,
  organizerUpiId = 'sam.prabhu143@pingpay',
  organizerName = 'Nani',
}: ReminderParams): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const message = `Hi ${memberName},\n\nYour current badminton dues are *₹${dueAmount.toFixed(2)}*.\n\nPlease clear the balance via UPI to:\nUPI ID: *${organizerUpiId}* (${organizerName})\n\nThank you! 🏸`;

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}