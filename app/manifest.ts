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
