'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  Users,
  Wrench,
  CreditCard,
  UserPlus,
  Share2,
  Banknote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/layout/container';
import { Card } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const TIERS = [
  { name: 'Débutant', sales: 0, commission: '25 %' },
  { name: 'Actif', sales: 10, commission: '26 %' },
  { name: 'Performant', sales: 30, commission: '27 %' },
  { name: 'Expert', sales: 75, commission: '28,5 %' },
  { name: 'Élite', sales: 150, commission: '30 %' },
];

const FAQS = [
  {
    question: 'Comment ça marche ?',
    answer:
      'Inscrivez-vous gratuitement, obtenez votre lien de parrainage unique, partagez-le avec votre audience et touchez une part de la commission d\'affiliation sur chaque vente générée. Notre tableau de bord en temps réel vous permet de suivre vos clics, conversions et revenus.',
  },
  {
    question: 'Combien puis-je gagner ?',
    answer:
      'Vos gains dépendent de votre activité et de votre palier. Vous touchez de 25 % à 30 % de la commission d\'affiliation sur chaque vente. Il n\'y a pas de plafond : plus vous vendez, plus vous montez en palier et plus vous gagnez.',
  },
  {
    question: 'Comment suis-je payé ?',
    answer:
      'Les paiements sont effectués chaque mois, directement sur votre compte bancaire ou via PayPal. Le seuil de paiement minimum est de 30 €. Vous pouvez suivre votre solde en temps réel depuis votre tableau de bord.',
  },
  {
    question: 'Y a-t-il des frais ?',
    answer:
      'Non, l\'inscription est entièrement gratuite. Il n\'y a aucun abonnement, aucune commission à payer, aucun frais caché. Vous commencez à gagner dès votre première commission d\'affiliation.',
  },
  {
    question: 'Puis-je parrainer des amis ?',
    answer:
      'Oui ! Vous pouvez inviter d\'autres ambassadeurs via votre lien de parrainage spécial. Pour chaque ambassadeur actif que vous amenez, vous touchez un bonus sur leurs premières commissions. C\'est un vrai réseau qui travaille pour vous.',
  },
];

const ADVANTAGES = [
  {
    icon: TrendingUp,
    titleKey: 'advantage1Title' as const,
    descKey: 'advantage1Desc' as const,
  },
  {
    icon: Users,
    titleKey: 'advantage2Title' as const,
    descKey: 'advantage2Desc' as const,
  },
  {
    icon: Wrench,
    titleKey: 'advantage3Title' as const,
    descKey: 'advantage3Desc' as const,
  },
  {
    icon: CreditCard,
    titleKey: 'advantage4Title' as const,
    descKey: 'advantage4Desc' as const,
  },
];

const STEPS = [
  {
    icon: UserPlus,
    labelKey: 'step1' as const,
    number: 1,
  },
  {
    icon: Share2,
    labelKey: 'step2' as const,
    number: 2,
  },
  {
    icon: Banknote,
    labelKey: 'step3' as const,
    number: 3,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GradientCircle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-accent-500 via-primary-500 to-primary-600 text-white shadow-md">
      {children}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-5 text-left text-gray-900 transition hover:bg-gray-50 focus:outline-none"
        aria-expanded={open}
      >
        <span className="font-semibold">{question}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-primary-500" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-primary-500" />
        )}
      </button>
      {open && (
        <div className="animate-fade-in border-t border-gray-100 px-6 py-4 text-gray-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RejoindreAmbassadeurPage() {
  const t = useTranslations('join');

  return (
    <div className="flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Hero                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="gradient-primary px-4 py-28 text-center text-white">
        <div className="animate-fade-in mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium uppercase tracking-wider text-white/90">
            Programme Ambassadeur
          </span>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mb-10 text-lg text-white/85 sm:text-xl">
            {t('subtitle')}
          </p>
          <Link
            href="/inscription"
            className="inline-block rounded-xl bg-white px-10 py-4 text-base font-bold text-primary-600 shadow-xl transition hover:bg-gray-50 hover:shadow-2xl active:scale-95"
          >
            {t('ctaHero')}
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Advantages                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gray-50 py-20">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('advantagesTitle')}
            </h2>
            <p className="mt-3 text-gray-500">{t('advantagesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map(({ icon: Icon, titleKey, descKey }) => (
              <Card key={titleKey} hoverable className="flex flex-col gap-4">
                <GradientCircle>
                  <Icon className="h-6 w-6" />
                </GradientCircle>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t(titleKey)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t(descKey)}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. How it works                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white py-20">
        <Container>
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('howItWorksTitle')}
            </h2>
            <p className="mt-3 text-gray-500">{t('howItWorksSubtitle')}</p>
          </div>

          {/* Steps row */}
          <div className="relative flex flex-col items-center gap-12 sm:flex-row sm:items-start sm:justify-center sm:gap-0">
            {/* Connecting line (visible on sm+) */}
            <div
              className="absolute top-10 hidden h-px w-2/3 bg-gradient-to-r from-accent-500 via-primary-500 to-primary-600 sm:block"
              aria-hidden="true"
            />

            {STEPS.map(({ icon: Icon, labelKey, number }) => (
              <div
                key={labelKey}
                className="relative z-10 flex flex-col items-center text-center sm:flex-1"
              >
                {/* Number circle */}
                <div className="mb-4 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-r from-accent-500 via-primary-500 to-primary-600 shadow-lg">
                  <Icon className="h-7 w-7 text-white" />
                  <span className="mt-0.5 text-xs font-bold text-white/80">
                    0{number}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  {t(labelKey)}
                </h3>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Commission tiers table                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gray-50 py-20">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('tiersTitle')}
            </h2>
            <p className="mt-3 text-gray-500">{t('tiersSubtitle')}</p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-accent-500 via-primary-500 to-primary-600 text-white">
                    <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider">
                      Palier
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider text-center">
                      Ventes minimum
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider text-center">
                      Part de la commission
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((tier, idx) => (
                    <tr
                      key={tier.name}
                      className={`border-t border-gray-100 transition hover:bg-primary-50/40 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              idx === TIERS.length - 1
                                ? 'bg-yellow-400'
                                : 'bg-gradient-to-r from-accent-500 to-primary-500'
                            }`}
                          />
                          <span className="font-semibold text-gray-900">
                            {tier.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {tier.sales === 0 ? '—' : `${tier.sales} ventes`}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700">
                          {tier.commission}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. FAQ                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white py-20">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Questions fréquentes
            </h2>
            <p className="mt-3 text-gray-500">
              Tout ce que vous devez savoir avant de commencer.
            </p>
          </div>
          <div className="mx-auto max-w-3xl space-y-3">
            {FAQS.map((faq) => (
              <FaqItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Final CTA                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="gradient-primary py-24 text-center text-white">
        <Container>
          <h2 className="mb-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            Prêt à commencer ?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/85">
            Rejoignez des centaines d'ambassadeurs qui génèrent des revenus en
            partageant des produits qu'ils aiment.
          </p>
          <Link
            href="/inscription"
            className="inline-block rounded-xl bg-white px-10 py-4 text-base font-bold text-primary-600 shadow-xl transition hover:bg-gray-50 hover:shadow-2xl active:scale-95"
          >
            Devenir Ambassadeur gratuitement
          </Link>
        </Container>
      </section>
    </div>
  );
}
