import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

export default function CguPage() {
  const t = useTranslations('cgu');

  return (
    <div className="py-12">
      <Container className="max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('lastUpdated')}
        />

        <div className="prose prose-gray max-w-none mt-10">

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">1. Objet et champ d'application</h2>
          <p className="text-gray-600 leading-relaxed">
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation du site Buyla (buyla.fr) exploité par Buyla SAS (42 rue de la Paix, 75002 Paris — SIRET&nbsp;: 123 456 789 00012). En accédant au Site ou en créant un compte, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser le Site.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">2. Programme Ambassadeur</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla propose un programme d'affiliation permettant à toute personne physique majeure, résidant en France, de devenir «&nbsp;Ambassadeur&nbsp;» et de percevoir des commissions sur les ventes générées via ses liens de recommandation personnalisés.
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>L'inscription au programme est gratuite et sans engagement.</li>
            <li>Chaque ambassadeur dispose d'un lien de tracking unique (contenant son code ambassadeur).</li>
            <li>Une commission est attribuée dès lors qu'une vente est finalisée et non remboursée via le lien de l'ambassadeur.</li>
            <li>Les commissions sont créditées sous 7 jours ouvrés après validation de la commande par le client final.</li>
            <li>Le seuil minimum de paiement est fixé à <strong>30&nbsp;€</strong>. En dessous de ce seuil, les gains sont reportés au mois suivant.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">3. Paliers de commissions</h2>
          <p className="text-gray-600 leading-relaxed">
            Les taux de commission évoluent en fonction du nombre de ventes validées générées sur les 30 derniers jours glissants&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Débutant</strong> (0 vente)&nbsp;: 25 % de commission</li>
            <li><strong>Actif</strong> (dès 10 ventes)&nbsp;: 26 % de commission</li>
            <li><strong>Performant</strong> (dès 30 ventes)&nbsp;: 27 % de commission</li>
            <li><strong>Expert</strong> (dès 75 ventes)&nbsp;: 28,5 % de commission</li>
            <li><strong>Élite</strong> (dès 150 ventes)&nbsp;: 30 % de commission</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Buyla se réserve le droit de modifier les paliers et taux de commission avec un préavis de 30 jours communiqué par email aux ambassadeurs.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">4. Parrainage à deux niveaux</h2>
          <p className="text-gray-600 leading-relaxed">
            Le programme de parrainage de Buyla est limité à <strong>2 niveaux</strong>&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Niveau 1</strong>&nbsp;: L'ambassadeur parrain perçoit un bonus de 5 % sur les commissions générées par chacun de ses filleuls directs, pendant les 12 premiers mois d'activité du filleul.</li>
            <li><strong>Niveau 2</strong>&nbsp;: L'ambassadeur perçoit un bonus de 2 % sur les commissions générées par les filleuls de ses filleuls (second niveau), pendant les 6 premiers mois d'activité.</li>
            <li>Il n'est pas possible de se parrainer soi-même ou de créer des comptes multiples. Tout manquement entraîne la suspension immédiate du compte.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">5. Obligations fiscales et déclaration des revenus</h2>
          <p className="text-gray-600 leading-relaxed">
            Les commissions perçues dans le cadre du programme ambassadeur constituent des revenus imposables. Il appartient à chaque ambassadeur de les déclarer auprès de l'administration fiscale française conformément à la réglementation en vigueur (article 92 du Code général des impôts pour les bénéfices non commerciaux, ou régime micro-BNC le cas échéant).
          </p>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS est tenu, pour les ambassadeurs ayant perçu plus de <strong>600&nbsp;€ par an</strong>, de transmettre à l'administration fiscale le récapitulatif annuel des sommes versées, conformément à l'article 242 bis du CGI. Un récapitulatif annuel est disponible dans l'espace ambassadeur.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">6. Conditions d'utilisation du Site</h2>
          <p className="text-gray-600 leading-relaxed">
            L'utilisateur s'engage à utiliser le Site de manière licite et à ne pas&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Diffuser des contenus illicites, diffamatoires, racistes ou portant atteinte à l'ordre public.</li>
            <li>Utiliser des systèmes automatisés (bots, scrapers) pour générer des clics ou des commissions artificielles.</li>
            <li>Tenter de contourner les mécanismes de sécurité du Site.</li>
            <li>Créer plusieurs comptes ambassadeurs.</li>
            <li>Utiliser le nom ou la marque Buyla de manière trompeuse dans ses communications.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">7. Propriété intellectuelle</h2>
          <p className="text-gray-600 leading-relaxed">
            Tous les éléments du Site (textes, images, logos, bases de données, logiciels) sont la propriété de Buyla SAS et sont protégés par le droit de la propriété intellectuelle. L'ambassadeur est autorisé à utiliser les visuels et descriptions produits fournis par Buyla dans le cadre strict du programme d'affiliation. Toute autre utilisation est soumise à autorisation écrite préalable.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">8. Limitation de responsabilité</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation du Site, d'une interruption de service, d'une perte de données ou d'un accès non autorisé à un compte utilisateur. Buyla SAS ne garantit pas la continuité du programme ambassadeur et se réserve le droit de le suspendre ou de le modifier à tout moment.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">9. Suspension et résiliation</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS se réserve le droit de suspendre ou de résilier tout compte ambassadeur en cas de violation des présentes CGU, de fraude avérée ou de comportement préjudiciable à la plateforme. En cas de résiliation, les commissions validées et dues seront versées dans les 30 jours suivant la clôture du compte, sous réserve d'absence de litige en cours.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">10. Modification des CGU</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur le Site. Les ambassadeurs seront informés par email au moins 15 jours avant toute modification substantielle. La poursuite de l'utilisation du Site après notification vaut acceptation des nouvelles conditions.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">11. Droit applicable et litiges</h2>
          <p className="text-gray-600 leading-relaxed">
            Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou à leur exécution sera soumis, à défaut d'accord amiable, à la compétence exclusive des tribunaux de Paris. L'utilisateur consommateur peut également recourir à la médiation via MEDICYS (www.medicys.fr).
          </p>

        </div>
      </Container>
    </div>
  );
}
