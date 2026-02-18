'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import { Menu, X, ShoppingBag, LayoutDashboard, LogOut, User } from 'lucide-react';
import clsx from 'clsx';

interface StoredUser {
  id: string;
  firstname?: string;
  lastname?: string;
  email: string;
  role: 'ambassador' | 'buyer' | 'admin';
}

export function Navbar() {
  const t = useTranslations('common');
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('buyla_token');
    const userRaw = localStorage.getItem('buyla_user');

    if (token && userRaw) {
      try {
        setUser(JSON.parse(userRaw));
      } catch {
        // Corrupt data, ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('buyla_token');
    localStorage.removeItem('buyla_user');
    setUser(null);
    router.push('/connexion');
  };

  const dashboardHref = user?.role === 'admin' ? '/admin' : '/dashboard';
  const dashboardLabel = user?.role === 'admin' ? 'Administration' : 'Mon espace';
  const displayName = user ? (user.firstname || user.email.split('@')[0]) : '';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-primary-600">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">{t('siteName')}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/rejoindre" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
            {t('join')}
          </Link>
          <Link href="/faq" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
            {t('faq')}
          </Link>
          <Link href="/contact" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
            {t('contact')}
          </Link>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                {dashboardLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                {t('login')}
              </Link>
              <Link
                href="/inscription"
                className="gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                {t('register')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={clsx(
          'overflow-hidden border-t border-gray-200 bg-white transition-all duration-300 md:hidden',
          mobileOpen ? 'max-h-96' : 'max-h-0 border-t-0',
        )}
      >
        <div className="space-y-1 px-4 py-3">
          <Link href="/rejoindre" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('join')}
          </Link>
          <Link href="/faq" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('faq')}
          </Link>
          <Link href="/contact" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('contact')}
          </Link>
          <hr className="my-2" />
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{displayName}</span>
              </div>
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <LayoutDashboard className="h-4 w-4" />
                {dashboardLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/connexion" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {t('login')}
              </Link>
              <Link
                href="/inscription"
                className="gradient-primary mt-2 block rounded-lg px-3 py-2 text-center text-sm font-semibold text-white"
              >
                {t('register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
