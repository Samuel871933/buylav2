import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-primary-500">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Page non trouvée
        </h1>
        <p className="mt-2 text-gray-500">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
