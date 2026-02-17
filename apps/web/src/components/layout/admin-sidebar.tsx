'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Globe,
  DoorOpen,
  Users,
  ArrowLeftRight,
  CreditCard,
  Zap,
  Settings,
  ShoppingBag,
  Menu,
  X,
  Shield,
  AlertTriangle,
  ScrollText,
  Mail,
} from 'lucide-react';

const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/programmes', icon: Globe, label: 'Programmes' },
  { href: '/admin/portails', icon: DoorOpen, label: 'Portails' },
  { href: '/admin/ambassadeurs', icon: Users, label: 'Ambassadeurs' },
  { href: '/admin/conversions', icon: ArrowLeftRight, label: 'Conversions' },
  { href: '/admin/paiements', icon: CreditCard, label: 'Paiements' },
  { href: '/admin/boosts', icon: Zap, label: 'Boosts' },
  { href: '/admin/fraude', icon: Shield, label: 'Fraude' },
  { href: '/admin/litiges', icon: AlertTriangle, label: 'Litiges' },
  { href: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { href: '/admin/emails', icon: Mail, label: 'Emails' },
  { href: '/admin/parametres', icon: Settings, label: 'Paramètres' },
];

export function AdminSidebar() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo + Admin badge */}
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-primary-600">
          <ShoppingBag className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold gradient-text">{t('siteName')}</span>
        <span className="ml-1 rounded bg-primary-100 px-1.5 py-0.5 text-xs font-semibold text-primary-700">
          Admin
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin' || pathname === '/fr/admin' || pathname === '/en/admin'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
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
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-200 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
          Retour au site
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu admin"
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
