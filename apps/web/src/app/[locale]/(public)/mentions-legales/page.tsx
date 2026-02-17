import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';

export default function MentionsLegalesPage() {
  const t = useTranslations('mentionsLegales');

  return (
    <div className="py-12">
      <Container className="max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('lastUpdated')}
        />

        <div className="prose prose-gray max-w-none mt-10">

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">1. Éditeur du site</h2>
          <p className="text-gray-600 leading-relaxed">
            Le site <strong>Buyla</strong> (ci-après «&nbsp;le Site&nbsp;») est édité par&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Raison sociale&nbsp;:</strong> Buyla SAS</li>
            <li><strong>Forme juridique&nbsp;:</strong> Société par Actions Simplifiée (SAS)</li>
            <li><strong>Capital social&nbsp;:</strong> 10 000 €</li>
            <li><strong>Siège social&nbsp;:</strong> 42 rue de la Paix, 75002 Paris, France</li>
            <li><strong>SIRET&nbsp;:</strong> 123 456 789 00012</li>
            <li><strong>RCS&nbsp;:</strong> Paris B 123 456 789</li>
            <li><strong>N° TVA intracommunautaire&nbsp;:</strong> FR12 123456789</li>
            <li><strong>Directeur de la publication&nbsp;:</strong> M. Jean Dupont, Président de Buyla SAS</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">2. Hébergement</h2>
          <p className="text-gray-600 leading-relaxed">
            Le Site est hébergé par&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Société&nbsp;:</strong> Vercel Inc.</li>
            <li><strong>Adresse&nbsp;:</strong> 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis</li>
            <li><strong>Site web&nbsp;:</strong> https://vercel.com</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">3. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Pour toute question relative au fonctionnement du Site, vous pouvez nous contacter&nbsp;:
          </p>
          <ul className="list-disc pl-6 text-gray-600 leading-relaxed space-y-1">
            <li><strong>Email&nbsp;:</strong> contact@buyla.fr</li>
            <li><strong>Adresse postale&nbsp;:</strong> Buyla SAS — 42 rue de la Paix, 75002 Paris, France</li>
            <li><strong>Formulaire de contact&nbsp;:</strong> disponible à l'adresse <a href="/contact" className="text-primary-600 hover:underline">/contact</a></li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">4. Propriété intellectuelle</h2>
          <p className="text-gray-600 leading-relaxed">
            L'ensemble des contenus présents sur le Site (textes, images, graphiques, logo, icônes, sons, logiciels) est la propriété exclusive de Buyla SAS ou de ses partenaires. Toute reproduction, distribution, modification, adaptation, retransmission ou publication de ces éléments est strictement interdite sans l'accord exprès écrit de Buyla SAS.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">5. Données personnelles</h2>
          <p className="text-gray-600 leading-relaxed">
            Le traitement des données personnelles collectées sur le Site est régi par notre{' '}
            <a href="/confidentialite" className="text-primary-600 hover:underline">Politique de confidentialité</a>,
            conforme au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi
            n°&nbsp;78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">6. Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            Le Site utilise des cookies nécessaires à son bon fonctionnement et au suivi des affiliations. Pour en savoir plus, consultez notre{' '}
            <a href="/cookies" className="text-primary-600 hover:underline">Politique cookies</a>.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">7. Droit applicable</h2>
          <p className="text-gray-600 leading-relaxed">
            Le présent Site est soumis au droit français. Tout litige relatif à son utilisation sera soumis à la compétence des tribunaux compétents de Paris, sauf disposition légale contraire.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">8. Médiation</h2>
          <p className="text-gray-600 leading-relaxed">
            Conformément aux dispositions du Code de la consommation, Buyla SAS adhère au service de médiation MEDICYS. En cas de litige, le consommateur peut recourir gratuitement à ce service de médiation&nbsp;: MEDICYS — 73 boulevard de Clichy, 75009 Paris — www.medicys.fr.
          </p>

        </div>
      </Container>
    </div>
  );
}
