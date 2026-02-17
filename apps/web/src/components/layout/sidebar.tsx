'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Link2,
  ShoppingCart,
  Users,
  Wallet,
  Trophy,
  MessageCircle,
  Share2,
  UserCircle,
  ShoppingBag,
  Coins,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/mes-liens', icon: Link2, label: 'Mes liens' },
  { href: '/mes-ventes', icon: ShoppingCart, label: 'Mes ventes' },
  { href: '/mes-filleuls', icon: Users, label: 'Mes filleuls' },
  { href: '/mes-gains', icon: Wallet, label: 'Mes gains' },
  { href: '/mon-cashback', icon: Coins, label: 'Mon cashback' },
  { href: '/classement', icon: Trophy, label: 'Classement' },
  { href: '/communaute', icon: MessageCircle, label: 'Communauté' },
  { href: '/partager', icon: Share2, label: 'Partager' },
  { href: '/profil', icon: UserCircle, label: 'Profil' },
];

export function Sidebar() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-primary-600">
          <ShoppingBag className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold gradient-text">{t('siteName')}</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <NextLink
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className={clsx('h-5 w-5', isActive ? 'text-primary-500' : 'text-gray-400')} />
              {item.label}
            </NextLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-200 p-4">
        <NextLink
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
          {t('home')}
        </NextLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
