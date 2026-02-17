import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

export default function ConfidentialitePage() {
  const t = useTranslations('confidentialite');

  return (
    <div className="py-12">
      <Container className="max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('lastUpdated')}
        />

        <div className="prose prose-gray max-w-none mt-10">

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">1. Responsable du traitement</h2>
          <p className="text-gray-600 leading-relaxed">
            Le responsable du traitement des données personnelles est&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Société&nbsp;:</strong> Buyla SAS</li>
            <li><strong>Adresse&nbsp;:</strong> 42 rue de la Paix, 75002 Paris, France</li>
            <li><strong>Email DPO&nbsp;:</strong> dpo@buyla.fr</li>
            <li><strong>SIRET&nbsp;:</strong> 123 456 789 00012</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            La présente politique de confidentialité est conforme au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés n°&nbsp;78-17 du 6 janvier 1978 modifiée.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">2. Données collectées</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS collecte les catégories de données personnelles suivantes&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Données d'identification&nbsp;:</strong> nom, prénom, adresse email, numéro de téléphone (facultatif).</li>
            <li><strong>Données de compte&nbsp;:</strong> identifiant unique, mot de passe haché (bcrypt), rôle utilisateur (ambassadeur / acheteur).</li>
            <li><strong>Données de transaction&nbsp;:</strong> historique des commandes, montants, statuts de paiement (aucune donnée bancaire brute n'est stockée — délégué à Stripe).</li>
            <li><strong>Données d'affiliation&nbsp;:</strong> code ambassadeur, liens de tracking, clics, conversions, commissions.</li>
            <li><strong>Données techniques&nbsp;:</strong> adresse IP hashée (SHA-256, non réversible), type de navigateur, système d'exploitation, pages visitées, durée des sessions.</li>
            <li><strong>Données de cookies&nbsp;:</strong> identifiant visiteur pseudonymisé, cookie de session d'authentification, cookie de tracking ambassadeur. Voir notre <a href="/cookies" className="text-primary-600 hover:underline">Politique cookies</a>.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Aucune donnée sensible au sens de l'article 9 du RGPD (origine raciale, opinions politiques, données de santé, etc.) n'est collectée.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">3. Finalités et bases légales des traitements</h2>
          <p className="text-gray-600 leading-relaxed">
            Les données sont collectées pour les finalités suivantes&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>
              <strong>Gestion du compte utilisateur</strong> — Base légale&nbsp;: exécution d'un contrat (art. 6.1.b RGPD).
              Conservation&nbsp;: durée d'activité du compte + 3 ans.
            </li>
            <li>
              <strong>Traitement des commandes et paiements</strong> — Base légale&nbsp;: exécution d'un contrat (art. 6.1.b RGPD).
              Conservation&nbsp;: 5 ans (obligations comptables légales).
            </li>
            <li>
              <strong>Tracking d'affiliation et calcul des commissions</strong> — Base légale&nbsp;: exécution d'un contrat (art. 6.1.b RGPD).
              Conservation&nbsp;: 3 ans à compter de la dernière transaction.
            </li>
            <li>
              <strong>Programme cashback acheteur</strong> — Base légale&nbsp;: exécution d'un contrat (art. 6.1.b RGPD).
              Conservation&nbsp;: 3 ans à compter de la dernière utilisation.
            </li>
            <li>
              <strong>Newsletter et communications marketing</strong> — Base légale&nbsp;: consentement (art. 6.1.a RGPD).
              Conservation&nbsp;: jusqu'au retrait du consentement ou 3 ans sans interaction.
            </li>
            <li>
              <strong>Prévention de la fraude</strong> — Base légale&nbsp;: intérêt légitime (art. 6.1.f RGPD).
              Conservation&nbsp;: 1 an à compter de la détection.
            </li>
            <li>
              <strong>Statistiques et amélioration du service</strong> — Base légale&nbsp;: intérêt légitime (art. 6.1.f RGPD).
              Données anonymisées ou pseudonymisées. Conservation&nbsp;: 26 mois.
            </li>
            <li>
              <strong>Obligations légales et fiscales</strong> — Base légale&nbsp;: obligation légale (art. 6.1.c RGPD).
              Conservation&nbsp;: 10 ans (comptabilité), 6 ans (déclarations fiscales).
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">4. Destinataires des données</h2>
          <p className="text-gray-600 leading-relaxed">
            Vos données peuvent être transmises aux destinataires suivants, dans le strict respect des finalités définies&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Stripe Inc.</strong> — traitement sécurisé des paiements (DPA disponible sur stripe.com).</li>
            <li><strong>Vercel Inc.</strong> — hébergement de l'application (données en Europe via Vercel Edge Network).</li>
            <li><strong>Fournisseurs dropshipping</strong> — transmission des données de livraison (nom, adresse de livraison uniquement).</li>
            <li><strong>Administration fiscale française</strong> — en application de l'article 242 bis du CGI.</li>
            <li><strong>Personnel interne habilité</strong> — dans le cadre de leur mission (support, finance, technique).</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Aucune donnée n'est vendue à des tiers à des fins commerciales.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">5. Transferts hors Union Européenne</h2>
          <p className="text-gray-600 leading-relaxed">
            Certains de nos sous-traitants (Stripe, Vercel) ont des entités établies aux États-Unis. Ces transferts sont encadrés par des Clauses Contractuelles Types (CCT) approuvées par la Commission européenne et/ou par le cadre EU-U.S. Data Privacy Framework, garantissant un niveau de protection adéquat.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">6. Vos droits</h2>
          <p className="text-gray-600 leading-relaxed">
            Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Droit d'accès</strong> (art. 15)&nbsp;: obtenir une copie de vos données traitées par Buyla.</li>
            <li><strong>Droit de rectification</strong> (art. 16)&nbsp;: corriger vos données inexactes ou incomplètes.</li>
            <li><strong>Droit à l'effacement</strong> (art. 17)&nbsp;: demander la suppression de vos données (sous réserve d'obligations légales).</li>
            <li><strong>Droit à la limitation du traitement</strong> (art. 18)&nbsp;: restreindre l'utilisation de vos données dans certains cas.</li>
            <li><strong>Droit à la portabilité</strong> (art. 20)&nbsp;: recevoir vos données dans un format structuré et lisible par machine.</li>
            <li><strong>Droit d'opposition</strong> (art. 21)&nbsp;: vous opposer au traitement fondé sur l'intérêt légitime ou à des fins de prospection commerciale.</li>
            <li><strong>Droit de retrait du consentement</strong>&nbsp;: retirer votre consentement à tout moment pour les traitements basés sur celui-ci.</li>
            <li><strong>Droit de définir des directives post-mortem</strong>&nbsp;: donner des instructions sur le sort de vos données après votre décès.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Pour exercer ces droits, contactez notre DPO&nbsp;: <strong>dpo@buyla.fr</strong>. Nous nous engageons à répondre dans un délai d'un mois. En cas de réponse non satisfaisante, vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) — www.cnil.fr.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">7. Sécurité des données</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li>Chiffrement des communications via HTTPS/TLS.</li>
            <li>Hachage des mots de passe (bcrypt) et des adresses IP (SHA-256).</li>
            <li>Contrôle d'accès strict aux bases de données.</li>
            <li>Journalisation des accès et détection des anomalies.</li>
            <li>Mise à jour régulière des dépendances et audits de sécurité.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">8. Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            Pour plus d'informations sur les cookies utilisés par Buyla, leurs finalités et leur durée de conservation, consultez notre{' '}
            <a href="/cookies" className="text-primary-600 hover:underline">Politique cookies</a>.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">9. Modifications de la politique de confidentialité</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla SAS se réserve le droit de modifier la présente politique à tout moment. En cas de modification substantielle, les utilisateurs en seront informés par email. La date de dernière mise à jour est indiquée en haut de cette page.
          </p>

        </div>
      </Container>
    </div>
  );
}
