'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: 'Programme ambassadeur',
    question: 'Comment fonctionne le programme ambassadeur Buyla ?',
    answer:
      "Inscrivez-vous gratuitement sur Buyla et obtenez instantanément un lien de parrainage unique. Partagez ce lien à votre audience (réseaux sociaux, blog, newsletter…). Chaque fois qu'un visiteur clique sur votre lien et effectue un achat dans les 90 jours, vous recevez une commission allant de 25 % à 30 % du montant de la vente. Vous suivez vos clics, conversions et gains en temps réel depuis votre tableau de bord ambassadeur.",
  },
  {
    category: 'Programme ambassadeur',
    question: "Qu'est-ce que le cashback Buyla ?",
    answer:
      "Le cashback est un avantage réservé aux acheteurs qui passent par les liens Buyla. Après chaque achat validé sur un site partenaire (hors période de rétractation), l'acheteur reçoit un pourcentage du montant de sa commande sous forme de crédit sur son portefeuille Buyla. Ce crédit est retirable une fois le seuil minimum atteint. Le taux de cashback varie selon les marchands et programmes partenaires.",
  },
  {
    category: 'Gains et paiements',
    question: "Comment retirer mes gains en tant qu'ambassadeur ?",
    answer:
      "Les retraits sont disponibles depuis votre tableau de bord, dans la section « Paiements ». Le seuil minimum est de 30 €. Les paiements sont traités chaque mois, entre le 1er et le 5e du mois, pour toutes les commissions validées du mois précédent. Les fonds sont virés sur votre compte bancaire (IBAN) ou via PayPal selon votre préférence renseignée dans votre profil. Assurez-vous d'avoir complété votre profil de paiement avant la date de traitement.",
  },
  {
    category: 'Programme ambassadeur',
    question: 'Quels sont les paliers de commissions ?',
    answer:
      "Les commissions évoluent automatiquement selon votre performance sur les 30 derniers jours glissants : Débutant (0 vente) : 25 % — Actif (10 ventes) : 26 % — Performant (30 ventes) : 27 % — Expert (75 ventes) : 28,5 % — Élite (150 ventes) : 30 %. La montée de palier est automatique et quasi-instantanée. En cas de baisse d'activité, le palier est réévalué à la fin du cycle de 30 jours. Vos paliers actuels et prévisionnels sont visibles dans votre tableau de bord.",
  },
  {
    category: 'Programme ambassadeur',
    question: "Comment parrainer d'autres ambassadeurs ?",
    answer:
      "Chaque ambassadeur dispose d'un lien de parrainage spécifique (différent du lien produit) pour inviter d'autres personnes à rejoindre le programme. Niveau 1 : vous percevez 5 % de bonus sur les commissions de vos filleuls directs pendant leurs 12 premiers mois d'activité. Niveau 2 : vous percevez 2 % sur les commissions des filleuls de vos filleuls pendant leurs 6 premiers mois. Le parrainage est limité à 2 niveaux. Il est interdit de se parrainer soi-même ou de créer des comptes multiples.",
  },
  {
    category: 'Programme ambassadeur',
    question: 'Les liens affiliés sont-ils gratuits à créer ?',
    answer:
      "Oui, entièrement gratuits et sans limite. L'inscription au programme ambassadeur Buyla est 100 % gratuite, sans abonnement ni frais cachés. Vous pouvez créer autant de liens personnalisés que vous le souhaitez depuis votre tableau de bord : liens vers des produits spécifiques, vers des catégories ou vers la page d'accueil. Chaque lien génère des statistiques détaillées (clics, conversions, CA généré).",
  },
  {
    category: 'Gains et paiements',
    question: 'Combien de temps faut-il pour être payé après une vente ?',
    answer:
      "Voici le calendrier de paiement : (1) La vente est enregistrée et le tracking validé immédiatement. (2) La commission passe en statut « En attente » pendant la période de rétractation légale de l'acheteur (14 jours calendaires). (3) Une fois ce délai passé et la commande non remboursée, la commission est « validée » et créditée à votre solde disponible. (4) Le virement est effectué entre le 1er et le 5e du mois suivant. Le délai total est donc généralement de 3 à 6 semaines entre la vente et le virement bancaire.",
  },
  {
    category: 'Support',
    question: 'Comment contacter le support Buyla ?',
    answer:
      "Plusieurs options s'offrent à vous : Formulaire de contact sur la page /contact (réponse sous 24-48h ouvrées) — Email direct : contact@buyla.fr — Pour les ambassadeurs : un chat en direct est disponible directement dans votre tableau de bord (accès depuis le menu en bas à gauche). Pour les questions fréquentes, cette FAQ et notre centre d'aide (disponible prochainement) répondent à la majorité des demandes.",
  },
  {
    category: 'Juridique',
    question: 'Dois-je déclarer mes commissions Buyla aux impôts ?',
    answer:
      "Oui. Les commissions perçues en tant qu'ambassadeur Buyla constituent des revenus imposables en France. Ils doivent être déclarés dans la catégorie « Bénéfices Non Commerciaux » (BNC). Si vos revenus annuels dépassent 77 700 €, vous devez opter pour le régime réel. Pour les montants inférieurs, le régime micro-BNC avec abattement de 34 % s'applique. Buyla vous fournit un récapitulatif annuel téléchargeable dans votre tableau de bord. Pour les ambassadeurs ayant perçu plus de 600 € dans l'année, Buyla transmet automatiquement les données à l'administration fiscale conformément à l'article 242 bis du CGI.",
  },
  {
    category: 'Programme ambassadeur',
    question: "Quels marchands puis-je promouvoir via Buyla ?",
    answer:
      "Buyla est partenaire de nombreuses plateformes d'affiliation et marchands de confiance : Amazon, Fnac, Sephora, Zalando, Booking, Decathlon, Naturecan, NutriProfits et bien d'autres. Depuis votre tableau de bord, vous pouvez générer des liens personnalisés vers n'importe quel produit de ces marchands partenaires. Vous n'avez qu'à coller l'URL du produit et notre système génère automatiquement votre lien de tracking affilié.",
  },
];

const CATEGORIES = Array.from(new Set(FAQ_ITEMS.map((f) => f.category)));

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-5 text-left text-gray-900 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-expanded={open}
      >
        <span className="font-semibold pr-4">{item.question}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-primary-500" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-primary-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 py-4 text-gray-600 leading-relaxed text-sm">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const t = useTranslations('faq');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? FAQ_ITEMS.filter((f) => f.category === activeCategory)
    : FAQ_ITEMS;

  return (
    <div className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
      <Container className="relative max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('description')}
        />

        {/* Category filter */}
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              activeCategory === null
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            Toutes
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={[
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                activeCategory === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="mt-6 space-y-3">
          {filtered.map((item) => (
            <AccordionItem key={item.question} item={item} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 rounded-2xl bg-gray-50 p-8 text-center">
          <p className="text-gray-700 font-medium mb-2">Vous n'avez pas trouvé votre réponse ?</p>
          <p className="text-sm text-gray-500 mb-4">
            Notre équipe est disponible pour vous aider du lundi au vendredi, de 9h à 18h.
          </p>
          <a
            href="/contact"
            className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition"
          >
            Contacter le support
          </a>
        </div>
      </Container>
    </div>
  );
}
