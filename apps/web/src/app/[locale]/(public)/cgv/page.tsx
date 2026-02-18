import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

export default function CgvPage() {
  const t = useTranslations('cgv');

  return (
    <div className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
      <Container className="relative max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('lastUpdated')}
        />

        <div className="prose prose-gray max-w-none mt-10">

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">1. Description du service</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla (buyla.fr), exploité par Buyla SAS (42 rue de la Paix, 75002 Paris — SIRET&nbsp;: 123 456 789 00012), est une plateforme d'affiliation. Buyla <strong>ne vend aucun produit</strong> et n'opère aucune activité de commerce en ligne. Le service consiste à mettre à disposition de ses utilisateurs des liens d'affiliation provenant de réseaux partenaires (Amazon, AWIN, Affilae, Booking, NutriProfits, Naturecan et autres), permettant aux ambassadeurs de générer des commissions et aux acheteurs de bénéficier d'un programme de cashback.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Toute utilisation du site Buyla implique l'acceptation sans réserve des présentes Conditions Générales du Service d'Affiliation.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">2. Rôle d'intermédiaire</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla agit exclusivement en qualité d'intermédiaire. Lorsqu'un utilisateur clique sur un lien d'affiliation présent sur la plateforme, il est redirigé vers le site du partenaire concerné (par exemple Amazon, Fnac, Sephora, Zalando, Decathlon, Booking, etc.). L'achat est alors effectué directement sur le site du partenaire, selon les conditions générales de vente de ce dernier.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS n'intervient à aucun moment dans&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>La vente, la facturation ou l'encaissement des produits ou services achetés chez les partenaires.</li>
            <li>La gestion des stocks, la disponibilité des produits ou la fixation des prix.</li>
            <li>La livraison, l'expédition ou le suivi des commandes.</li>
            <li>Le service après-vente, les retours, échanges ou remboursements liés aux achats effectués chez les partenaires.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">3. Programme ambassadeur — Commissions</h2>
          <p className="text-gray-600 leading-relaxed">
            Les ambassadeurs inscrits sur Buyla peuvent partager des liens d'affiliation auprès de leur audience. Lorsqu'un achat est réalisé via l'un de ces liens sur un site partenaire, l'ambassadeur perçoit une commission calculée en pourcentage du montant de la vente validée par le réseau d'affiliation partenaire.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Le taux de commission varie selon&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Le réseau d'affiliation et le partenaire concerné.</li>
            <li>La catégorie de produit ou de service.</li>
            <li>Le palier de performance de l'ambassadeur (les paliers et leurs conditions sont détaillés dans l'espace ambassadeur).</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Les commissions ne sont validées qu'après confirmation définitive de la vente par le réseau d'affiliation partenaire (c'est-à-dire après expiration du délai de rétractation légal applicable sur le site partenaire et validation par ce dernier). Buyla SAS ne peut être tenu responsable du refus de validation d'une commission par un réseau partenaire.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">4. Programme cashback</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla propose un programme de cashback permettant aux acheteurs inscrits de récupérer un pourcentage du montant de leurs achats effectués sur les sites partenaires via les liens d'affiliation Buyla. Le cashback est crédité sur le compte Buyla de l'utilisateur après validation définitive de la vente par le réseau d'affiliation partenaire.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Le taux de cashback varie selon le partenaire et la catégorie de produit. Les taux applicables sont affichés sur la plateforme au moment de la redirection. Buyla SAS se réserve le droit de modifier les taux de cashback à tout moment. Les taux applicables sont ceux affichés au moment du clic sur le lien d'affiliation.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Le cashback n'est pas applicable en cas d'annulation, de retour intégral ou de non-validation de la commande par le site partenaire.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">5. Responsabilité limitée</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS décline toute responsabilité concernant&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>La qualité, la conformité, la disponibilité ou la description des produits et services vendus par les sites partenaires.</li>
            <li>Les délais de livraison, les pertes ou dommages survenus lors du transport des commandes passées sur les sites partenaires.</li>
            <li>Le service après-vente, les garanties, retours et remboursements relevant des sites partenaires.</li>
            <li>Les modifications de prix, promotions ou conditions commerciales appliquées par les sites partenaires.</li>
            <li>L'indisponibilité temporaire ou permanente des sites partenaires ou des réseaux d'affiliation.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            En cas de litige relatif à un achat effectué sur un site partenaire, l'utilisateur doit s'adresser directement au service client du partenaire concerné. Buyla SAS pourra, à titre de courtoisie et sans obligation, assister l'utilisateur dans ses démarches.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">6. Paiement des commissions et du cashback</h2>
          <p className="text-gray-600 leading-relaxed">
            Le versement des commissions ambassadeurs et du cashback acheteurs est soumis aux conditions suivantes&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Seuil minimum de retrait&nbsp;:</strong> le solde disponible doit atteindre un montant minimum de 10&nbsp;€ avant de pouvoir être retiré.</li>
            <li><strong>Délai de validation&nbsp;:</strong> les commissions et le cashback sont crédités sur le compte Buyla de l'utilisateur uniquement après validation définitive par les réseaux d'affiliation partenaires. Ce délai varie généralement de 30 à 90 jours selon les partenaires.</li>
            <li><strong>Mode de versement&nbsp;:</strong> les paiements sont effectués par virement bancaire ou via tout autre moyen de paiement mis à disposition sur la plateforme.</li>
            <li><strong>Délai de versement&nbsp;:</strong> une fois la demande de retrait validée, le paiement est effectué sous 30 jours ouvrés maximum.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS se réserve le droit de suspendre ou d'annuler le versement de commissions ou de cashback en cas de fraude avérée, d'utilisation abusive du service ou de non-respect des présentes conditions.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">7. Obligations de l'utilisateur</h2>
          <p className="text-gray-600 leading-relaxed">
            L'utilisateur s'engage à&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Fournir des informations exactes et à jour lors de son inscription.</li>
            <li>Ne pas utiliser de méthodes frauduleuses pour générer des clics ou des ventes artificiels (auto-clics abusifs, bots, spam, etc.).</li>
            <li>Respecter les conditions d'utilisation des réseaux d'affiliation partenaires.</li>
            <li>Ne pas dénigrer les partenaires ou la plateforme Buyla dans le cadre de ses activités de promotion.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Tout manquement à ces obligations pourra entraîner la suspension ou la suppression du compte de l'utilisateur, ainsi que l'annulation des commissions et du cashback en attente.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">8. Propriété intellectuelle</h2>
          <p className="text-gray-600 leading-relaxed">
            L'ensemble des éléments constituant le site Buyla (textes, graphismes, logos, images, logiciels, base de données, architecture du site) est la propriété exclusive de Buyla SAS ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable de Buyla SAS.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">9. Modification des conditions</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront informés de toute modification substantielle par email ou par notification sur la plateforme. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles conditions.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">10. Droit applicable et litiges</h2>
          <p className="text-gray-600 leading-relaxed">
            Les présentes conditions sont régies par le droit français. En cas de litige relatif à l'utilisation du service d'affiliation Buyla, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut de résolution amiable, le litige sera soumis aux tribunaux compétents de Paris.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige non résolu avec notre service client, le consommateur peut saisir gratuitement le médiateur&nbsp;: <strong>MEDICYS</strong> — 73 boulevard de Clichy, 75009 Paris — www.medicys.fr — dans un délai d'un an à compter de sa réclamation écrite.
          </p>

        </div>
      </Container>
    </div>
  );
}
