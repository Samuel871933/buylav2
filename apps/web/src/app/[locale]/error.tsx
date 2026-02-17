'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-red-500">500</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Erreur serveur
        </h1>
        <p className="mt-2 text-gray-500">
          Une erreur inattendue est survenue. Veuillez réessayer.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  );
}
