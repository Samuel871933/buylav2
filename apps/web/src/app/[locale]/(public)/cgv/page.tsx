import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

export default function CgvPage() {
  const t = useTranslations('cgv');

  return (
    <div className="py-12">
      <Container className="max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('lastUpdated')}
        />

        <div className="prose prose-gray max-w-none mt-10">

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">1. Champ d'application</h2>
          <p className="text-gray-600 leading-relaxed">
            Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les ventes de produits réalisées sur le site Buyla (buyla.fr), exploité par Buyla SAS (42 rue de la Paix, 75002 Paris — SIRET&nbsp;: 123 456 789 00012), dans le cadre de son activité de dropshipping. Tout achat effectué sur le Site implique l'acceptation sans réserve des présentes CGV par le client.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">2. Produits et disponibilité</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla opère en tant qu'intermédiaire de vente en dropshipping. Les produits sont expédiés directement par des fournisseurs partenaires sélectionnés. Les offres présentées sur le Site sont valables dans la limite des stocks disponibles. En cas d'indisponibilité d'un produit après commande, le client sera informé par email dans les 48 heures et remboursé intégralement dans un délai de 14 jours.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Les photographies et descriptions des produits sont fournies à titre indicatif. De légères variations de couleur peuvent exister en raison des paramètres d'affichage des écrans.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">3. Prix</h2>
          <p className="text-gray-600 leading-relaxed">
            Les prix sont indiqués en euros (€) toutes taxes comprises (TTC), hors frais de livraison. Les frais de livraison sont indiqués avant la validation définitive de la commande. Buyla SAS se réserve le droit de modifier ses prix à tout moment. Les prix applicables sont ceux en vigueur au moment de la validation de la commande par le client.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">4. Commande</h2>
          <p className="text-gray-600 leading-relaxed">
            Pour passer commande, le client doit&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Sélectionner le(s) produit(s) souhaité(s) et les ajouter au panier.</li>
            <li>Renseigner ses coordonnées de livraison et de facturation.</li>
            <li>Choisir son mode de paiement.</li>
            <li>Valider sa commande après vérification du récapitulatif.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Un email de confirmation est envoyé dès la validation du paiement. La vente est réputée conclue à réception de cet email de confirmation.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">5. Paiement sécurisé</h2>
          <p className="text-gray-600 leading-relaxed">
            Le paiement s'effectue en ligne via la plateforme sécurisée <strong>Stripe</strong>, certifiée PCI-DSS. Les modes de paiement acceptés sont&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Carte bancaire (Visa, Mastercard, American Express)</li>
            <li>Apple Pay et Google Pay (selon disponibilité)</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Les données bancaires du client ne sont jamais stockées sur les serveurs de Buyla SAS. Toutes les transactions sont chiffrées via le protocole SSL/TLS. En cas de refus de paiement, la commande est automatiquement annulée.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">6. Livraison</h2>
          <p className="text-gray-600 leading-relaxed">
            La livraison est effectuée à l'adresse indiquée par le client lors de sa commande. Les délais de livraison sont les suivants&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Livraison standard&nbsp;:</strong> 7 à 14 jours ouvrés</li>
            <li><strong>Livraison express (selon disponibilité)&nbsp;:</strong> 3 à 5 jours ouvrés</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Ces délais sont indicatifs et peuvent varier selon les fournisseurs et les transporteurs. En cas de retard significatif, le client sera informé par email. Les risques liés au transport sont transférés au client dès la remise du colis au transporteur.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS livre uniquement en France métropolitaine, en Belgique, en Suisse et au Luxembourg. Pour toute autre destination, veuillez contacter notre service client.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">7. Droit de rétractation</h2>
          <p className="text-gray-600 leading-relaxed">
            Conformément aux articles L.221-18 et suivants du Code de la consommation, le client dispose d'un délai de <strong>14 jours calendaires</strong> à compter de la réception du colis pour exercer son droit de rétractation, sans avoir à justifier de motifs.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Pour exercer ce droit, le client doit notifier sa décision à Buyla SAS par email à retractation@buyla.fr ou via le formulaire disponible dans son espace client, avant l'expiration du délai de 14 jours.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Le remboursement sera effectué dans un délai de <strong>14 jours</strong> suivant la réception de la demande de rétractation (ou de la réception du produit retourné si antérieure), via le même moyen de paiement que celui utilisé pour l'achat.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Sont exclus du droit de rétractation les produits personnalisés, les produits périssables ou les produits descellés dont la nature ne permet pas le retour pour des raisons d'hygiène ou de protection de la santé.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">8. Retours et remboursements</h2>
          <p className="text-gray-600 leading-relaxed">
            En cas de retour (rétractation ou produit défectueux), le client doit&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Notifier Buyla SAS par email avant tout renvoi.</li>
            <li>Retourner le produit dans son emballage d'origine, en parfait état, dans les 14 jours suivant la notification.</li>
            <li>Joindre une copie de la confirmation de commande.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Les frais de retour sont à la charge du client, sauf en cas de produit défectueux ou non conforme, auquel cas Buyla SAS prendra en charge les frais de renvoi.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">9. Garanties</h2>
          <p className="text-gray-600 leading-relaxed">
            Tous les produits vendus sur Buyla bénéficient&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>De la <strong>garantie légale de conformité</strong> (articles L.217-4 à L.217-14 du Code de la consommation) pendant 2 ans à compter de la livraison.</li>
            <li>De la <strong>garantie contre les vices cachés</strong> (articles 1641 à 1648 du Code civil).</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            En cas de défaut de conformité, le client peut demander le remplacement ou la réparation du produit, ou, si ces solutions sont impossibles, un remboursement.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">10. Cashback acheteur</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla propose un programme de cashback permettant aux acheteurs de récupérer un pourcentage de leurs achats sous forme de crédit utilisable sur les prochaines commandes. Le cashback est crédité après la période de rétractation légale (14 jours). Les conditions détaillées sont disponibles dans la section cashback de l'espace client.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">11. Médiation de la consommation</h2>
          <p className="text-gray-600 leading-relaxed">
            Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, Buyla SAS propose un dispositif de médiation de la consommation. En cas de litige non résolu avec notre service client, le consommateur peut saisir gratuitement le médiateur&nbsp;: <strong>MEDICYS</strong> — 73 boulevard de Clichy, 75009 Paris — www.medicys.fr — dans un délai d'un an à compter de sa réclamation écrite.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">12. Droit applicable</h2>
          <p className="text-gray-600 leading-relaxed">
            Les présentes CGV sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, le tribunal compétent sera celui du domicile du défendeur ou, pour un consommateur, celui de son lieu de résidence.
          </p>

        </div>
      </Container>
    </div>
  );
}
