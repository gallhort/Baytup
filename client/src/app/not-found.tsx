import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-[#FF6B35]">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          Page introuvable
        </h2>
        <p className="mt-2 text-gray-600">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a2a] transition-colors font-medium"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Rechercher un logement
          </Link>
        </div>
      </div>
    </div>
  );
}
