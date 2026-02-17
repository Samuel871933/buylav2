import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

export default function CookiesPage() {
  const t = useTranslations('cookies');

  return (
    <div className="py-12">
      <Container className="max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('lastUpdated')}
        />

        <div className="prose prose-gray max-w-none mt-10">

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">1. Qu'est-ce qu'un cookie ?</h2>
          <p className="text-gray-600 leading-relaxed">
            Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) lors de votre navigation sur un site web. Il permet au site de mémoriser des informations sur votre visite pour améliorer votre expérience, assurer le bon fonctionnement des services ou réaliser des statistiques anonymes d'audience.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Conformément à la directive ePrivacy (directive 2002/58/CE modifiée) et aux recommandations de la CNIL, Buyla SAS recueille votre consentement avant tout dépôt de cookies non essentiels sur votre terminal.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">2. Cookies déposés par Buyla</h2>
          <p className="text-gray-600 leading-relaxed">
            Le tableau suivant récapitule les cookies directement déposés par Buyla sur votre terminal&nbsp;:
          </p>

          <div className="overflow-x-auto mt-4 mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-700">Nom</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-700">Finalité</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-700">Durée</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-2 font-mono text-xs">amb_ref</td>
                  <td className="border border-gray-200 px-4 py-2">Tracking ambassadeur — mémorise le code du lien de parrainage qui a amené le visiteur, pour attribuer la commission à l'ambassadeur lors d'un achat.</td>
                  <td className="border border-gray-200 px-4 py-2">Fonctionnel / Affiliation</td>
                  <td className="border border-gray-200 px-4 py-2">90 jours</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2 font-mono text-xs">visitor_id</td>
                  <td className="border border-gray-200 px-4 py-2">Identification visiteur pseudonymisé — attribue un identifiant unique non personnel à chaque visiteur pour le suivi des parcours de navigation et la déduplication des conversions.</td>
                  <td className="border border-gray-200 px-4 py-2">Analytique / Affiliation</td>
                  <td className="border border-gray-200 px-4 py-2">1 an</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-2 font-mono text-xs">session</td>
                  <td className="border border-gray-200 px-4 py-2">Session d'authentification — maintient la connexion de l'utilisateur entre les pages. Contient un jeton signé (JWT HttpOnly) sans données personnelles en clair.</td>
                  <td className="border border-gray-200 px-4 py-2">Strictement nécessaire</td>
                  <td className="border border-gray-200 px-4 py-2">7 jours</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2 font-mono text-xs">cookie_consent</td>
                  <td className="border border-gray-200 px-4 py-2">Mémorise vos préférences relatives aux cookies pour ne pas afficher la bannière à chaque visite.</td>
                  <td className="border border-gray-200 px-4 py-2">Strictement nécessaire</td>
                  <td className="border border-gray-200 px-4 py-2">12 mois</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">3. Cookies tiers</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyla intègre des services tiers susceptibles de déposer des cookies sur votre terminal&nbsp;:
          </p>

          <h3 className="text-base font-semibold mt-6 mb-2 text-gray-800">Stripe (paiement)</h3>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Finalité&nbsp;:</strong> sécurisation et traitement des paiements en ligne, prévention de la fraude.</li>
            <li><strong>Cookies déposés&nbsp;:</strong> <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">__stripe_mid</code>, <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">__stripe_sid</code></li>
            <li><strong>Durée&nbsp;:</strong> de quelques minutes à 1 an selon le cookie.</li>
            <li><strong>Politique de confidentialité&nbsp;:</strong> <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">stripe.com/fr/privacy</a></li>
          </ul>

          <h3 className="text-base font-semibold mt-6 mb-2 text-gray-800">Analytics (mesure d'audience)</h3>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Finalité&nbsp;:</strong> mesure de l'audience du site, analyse des comportements de navigation (pages vues, sources de trafic, taux de rebond) dans le but d'améliorer le service.</li>
            <li><strong>Type&nbsp;:</strong> analytics interne anonymisé — aucune donnée identifiante n'est transmise à des tiers.</li>
            <li><strong>Durée&nbsp;:</strong> 26 mois maximum.</li>
            <li><strong>Consentement&nbsp;:</strong> requis — vous pouvez refuser ces cookies via notre bannière.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">4. Cookies strictement nécessaires</h2>
          <p className="text-gray-600 leading-relaxed">
            Certains cookies sont strictement nécessaires au fonctionnement du Site et ne peuvent pas être désactivés&nbsp;: le cookie de session (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">session</code>) et le cookie de mémorisation des préférences cookies (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">cookie_consent</code>). Ces cookies ne collectent pas d'informations utilisables à des fins commerciales ou publicitaires.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">5. Bannière de consentement (ePrivacy)</h2>
          <p className="text-gray-600 leading-relaxed">
            Conformément aux exigences de la directive ePrivacy et aux lignes directrices de la CNIL, une bannière de consentement s'affiche lors de votre première visite sur Buyla. Elle vous permet de&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Tout accepter&nbsp;:</strong> autoriser tous les cookies (nécessaires, fonctionnels, analytiques).</li>
            <li><strong>Tout refuser&nbsp;:</strong> n'autoriser que les cookies strictement nécessaires.</li>
            <li><strong>Personnaliser&nbsp;:</strong> choisir cookie par cookie les catégories que vous autorisez.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Votre choix est mémorisé pendant 12 mois. Vous pouvez modifier vos préférences à tout moment en cliquant sur le lien «&nbsp;Gérer mes cookies&nbsp;» disponible dans le pied de page du Site.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Le refus de cookies non essentiels n'affecte pas votre capacité à naviguer sur le Site ni à effectuer des achats.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">6. Comment gérer les cookies dans votre navigateur ?</h2>
          <p className="text-gray-600 leading-relaxed">
            En complément de notre bannière, vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Chrome&nbsp;:</strong> Paramètres &gt; Confidentialité et sécurité &gt; Cookies et autres données des sites</li>
            <li><strong>Firefox&nbsp;:</strong> Paramètres &gt; Vie privée et sécurité &gt; Cookies et données de site</li>
            <li><strong>Safari&nbsp;:</strong> Préférences &gt; Confidentialité &gt; Gestion des données des sites</li>
            <li><strong>Edge&nbsp;:</strong> Paramètres &gt; Cookies et autorisations de site</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            Attention&nbsp;: la désactivation de tous les cookies peut altérer le fonctionnement du Site, notamment la connexion à votre compte.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">7. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Pour toute question relative à notre utilisation des cookies, contactez notre DPO&nbsp;: <strong>dpo@buyla.fr</strong> ou consultez notre{' '}
            <a href="/confidentialite" className="text-primary-600 hover:underline">Politique de confidentialité</a>.
          </p>

        </div>
      </Container>
    </div>
  );
}
