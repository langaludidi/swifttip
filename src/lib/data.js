export const SAMPLE = {
  employer: 'The Grand Hotel — Bar',
  company: 'The Grand Group (Pty) Ltd',
  self: {
    name: 'Sipho Dlamini',
    color: 'red',
    role: 'Bartender',
    balance: 347.50,
    month: 95,
    week: 65,
    lifetime: 1240,
    tipsCount: 4,
    rating: 4.8,
    bank: 'Capitec ****3421',
    slug: 'sipho-dlamini',
  },
  workers: [
    { name: 'Sipho Dlamini', color: 'red', role: 'Bartender', rating: 4.8, tips: 47, total: 95, pct: 66, slug: 'sipho-dlamini' },
    { name: 'Thandi Nkosi', color: 'purple', role: 'Waitress', rating: 4.6, tips: 31, total: 48, pct: 34, slug: 'thandi-nkosi' },
  ],
  recent: [
    { who: 'Tip from customer', when: '2h ago', amt: 20, type: 'tip' },
    { who: 'Tip from customer', when: '5h ago', amt: 15, type: 'tip' },
    { who: 'Tip from customer', when: 'Yesterday', amt: 30, type: 'tip' },
    { who: 'Tip from customer', when: '2 days ago', amt: 30, type: 'tip' },
    { who: 'Payout to Capitec ****3421', when: '12 Jun 2026', amt: -200, type: 'payout' },
  ],
};

export function formatRands(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

export function formatRandsShort(cents) {
  const r = cents / 100;
  return `R${r % 1 === 0 ? r.toFixed(0) : r.toFixed(2)}`;
}
