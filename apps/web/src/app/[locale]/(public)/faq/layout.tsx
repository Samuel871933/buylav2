import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Questions fréquentes sur Buyla : commissions, cashback, paiements, parrainage et plus.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
