import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez l\'équipe Buyla. Une question, une suggestion ? Nous sommes à votre écoute.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
