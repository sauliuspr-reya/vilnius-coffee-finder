// Import necessary components
import { getCoffeePlaces } from "@/lib/api";
import CoffeeCard from "@/components/CoffeeCard";
import CoffeeMap from '@/components/CoffeeMap';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const coffeePlaces = await getCoffeePlaces(100);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Vilnius Coffee Finder</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Discover the best coffee shops in Vilnius, Lithuania
        </p>
      </header>

      {googleMapsApiKey && coffeePlaces.length > 0 && (
        <section className="mb-12">
          <CoffeeMap places={coffeePlaces} apiKey={googleMapsApiKey} />
        </section>
      )}
      {!googleMapsApiKey && coffeePlaces.length > 0 && (
        <div className="mb-12 p-4 text-center bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md">
          Map is not available because the Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API in your .env.local file.
        </div>
      )}

      <main>
        {coffeePlaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-semibold mb-4">No coffee places found</p>
            <p className="text-gray-600 dark:text-gray-300">
              Please run the data fetching script to populate the database
            </p>
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg max-w-lg mx-auto text-left">
              <h3 className="font-semibold mb-2">How to fetch data:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Make sure your <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-mono">.env.local</code> file has the Google Maps API key</li>
                <li>Run <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-mono">npm run fetch-coffee</code> to fetch coffee places</li>
                <li>Refresh this page to see the results</li>
              </ol>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Top Coffee Places</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Showing {coffeePlaces.length} places
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coffeePlaces.map((place) => (
                <CoffeeCard key={place.id} place={place} />
              ))}
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-20 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
        <p> {new Date().getFullYear()} Vilnius Coffee Finder</p>
        <div className="mt-4 flex gap-4 justify-center">
          <a
            className="hover:text-gray-800 dark:hover:text-gray-200"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            className="hover:text-gray-800 dark:hover:text-gray-200"
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js
          </a>
          <a
            className="hover:text-gray-800 dark:hover:text-gray-200"
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase
          </a>
        </div>
      </footer>
    </div>
  );
}
