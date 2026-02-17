import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ShoppingBag } from 'lucide-react';

export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-primary-600">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">{t('common.siteName')}</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-gray-500">
              {t('footer.description')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('footer.navigation')}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/rejoindre" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('common.join')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('common.faq')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('common.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('footer.legal')}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/mentions-legales" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('legal.legalNotice')}
                </Link>
              </li>
              <li>
                <Link href="/cgu" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('legal.salesTerms')}
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-gray-500 transition hover:text-gray-700">
                  {t('legal.cookies')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-center text-xs text-gray-400">
            {t('footer.affiliateDisclaimer')}
          </p>
          <p className="mt-2 text-center text-xs text-gray-400">
            &copy; {year} {t('common.siteName')}. {t('footer.allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
