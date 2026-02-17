import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Wrench className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Site en maintenance
        </h1>
        <p className="mt-3 max-w-md text-gray-500">
          Nous effectuons une mise à jour pour améliorer votre expérience.
          Le site sera de retour très bientôt.
        </p>
        <p className="mt-6 text-sm text-gray-400">
          Merci de votre patience.
        </p>
      </div>
    </div>
  );
}
