import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Devenir ambassadeur',
  description: "Rejoignez le réseau Buyla et gagnez des commissions jusqu'à 30% sur chaque vente. Cashback pour vos acheteurs, outils clés en main, paiement flexible.",
  openGraph: {
    title: 'Devenir ambassadeur — Buyla',
    description: "Partagez vos produits préférés et gagnez des commissions. Inscription gratuite.",
  },
};

export default function RejoindreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
