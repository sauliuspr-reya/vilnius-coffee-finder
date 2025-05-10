import Image from 'next/image';
import Link from 'next/link';
import { CoffeePlace } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/api';

interface CoffeeCardProps {
  place: CoffeePlace;
}

export default function CoffeeCard({ place }: CoffeeCardProps) {
  // Get the first photo if available
  const photoUrl = place.photos && place.photos.length > 0
    ? getPhotoUrl(place.photos[0].photo_reference)
    : '/coffee-placeholder.jpg';

  return (
    <Link href={`/place/${place.id}`} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="relative h-48 w-full">
          <Image
            src={photoUrl}
            alt={place.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-1 truncate">{place.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={place.address}>{place.address}</p>
          <div className="mt-2 flex items-center">
            <div className="flex items-center mr-2">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(place.rating ?? 0)
                      ? 'text-yellow-500'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {typeof place.rating === 'number' 
                ? `${place.rating.toFixed(1)} (${place.user_ratings_total || 0})` 
                : 'No rating'}
            </span>
            <div className="ml-4 flex items-center">
              <div className="flex items-center mr-2">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(place.ring29_rating ?? 0)
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {(place.ring29_rating ?? 0).toFixed(1)} ({place.ring29_user_ratings_total ?? 0})
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
