import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/layout/container';
import {
  Share2,
  ShoppingCart,
  Banknote,
  TrendingUp,
  Gift,
  Wrench,
  BarChart3,
  Sparkles,
  Heart,
  Headphones,
  Dumbbell,
  Monitor,
  Home,
  Utensils,
} from 'lucide-react';

const partners = [
  { icon: ShoppingCart, label: 'Amazon', color: 'bg-orange-100 text-orange-600' },
  { icon: Monitor, label: 'Fnac', color: 'bg-yellow-100 text-yellow-600' },
  { icon: Sparkles, label: 'Sephora', color: 'bg-pink-100 text-pink-600' },
  { icon: Headphones, label: 'Zalando', color: 'bg-purple-100 text-purple-600' },
  { icon: Home, label: 'Booking', color: 'bg-blue-100 text-blue-600' },
  { icon: Dumbbell, label: 'Decathlon', color: 'bg-green-100 text-green-600' },
  { icon: Heart, label: 'NutriProfits', color: 'bg-emerald-100 text-emerald-600' },
  { icon: Utensils, label: 'Naturecan', color: 'bg-teal-100 text-teal-600' },
];

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main>
      {/* Hero */}
      <section className="gradient-primary animate-gradient relative overflow-hidden px-4 py-24 text-center text-white md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Plateforme d&apos;affiliation & cashback
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90 md:text-xl">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/rejoindre"
              className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-600 shadow-lg transition hover:bg-gray-50 hover:shadow-xl"
            >
              {t('ctaJoin')}
            </Link>
            <Link
              href="/faq"
              className="rounded-xl border-2 border-white/80 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {t('ctaLearnMore')}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">{t('howItWorks')}</h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              { icon: Share2, title: t('step1Title'), desc: t('step1Desc'), num: '1' },
              { icon: ShoppingCart, title: t('step2Title'), desc: t('step2Desc'), num: '2' },
              { icon: Banknote, title: t('step3Title'), desc: t('step3Desc'), num: '3' },
            ].map((step) => (
              <div key={step.num} className="animate-slide-up text-center">
                <div className="gradient-primary mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-primary-500/25">
                  <step.icon className="h-7 w-7 text-white" />
                </div>
                <div className="mt-2 text-sm font-bold text-primary-500">Étape {step.num}</div>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Why join */}
      <section className="bg-gray-50 py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">{t('whyJoin')}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: TrendingUp, text: t('benefit1') },
              { icon: Gift, text: t('benefit2') },
              { icon: Wrench, text: t('benefit3') },
              { icon: BarChart3, text: t('benefit4') },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                  <item.icon className="h-6 w-6 text-primary-500" />
                </div>
                <p className="mt-4 font-semibold text-gray-900">{item.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Nos partenaires */}
      <section className="bg-white py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Nos partenaires</h2>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {partners.map((partner) => (
              <div
                key={partner.label}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition hover:shadow-md"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${partner.color}`}>
                  <partner.icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-gray-900">{partner.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="gradient-primary px-4 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold md:text-4xl">
            Prêt à gagner de l&apos;argent ?
          </h2>
          <p className="mt-4 text-lg text-white/90">
            Rejoignez des centaines d&apos;ambassadeurs qui gagnent déjà des commissions chaque jour.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/rejoindre"
              className="rounded-xl bg-white px-8 py-3.5 font-semibold text-primary-600 shadow-lg transition hover:bg-gray-50"
            >
              {t('ctaJoin')}
            </Link>
            <Link
              href="/faq"
              className="rounded-xl border-2 border-white/80 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10"
            >
              {t('ctaLearnMore')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
