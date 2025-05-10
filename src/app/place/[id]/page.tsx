import Image from 'next/image';
import Link from 'next/link';
import { getCoffeePlaceById, getPhotoUrl } from '@/lib/api';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const place = await getCoffeePlaceById(id);
  
  if (!place) {
    notFound();
  }

  // Get the first photo if available
  const photoUrl = place.photos && place.photos.length > 0
    ? getPhotoUrl(place.photos[0].photo_reference, 800)
    : '/coffee-placeholder.jpg';

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-12">
      <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        ← Back to all coffee places
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <div className="relative h-64 sm:h-80 md:h-96 w-full">
          <Image
            src={photoUrl}
            alt={place.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
          />
        </div>
        
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{place.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{place.address}</p>
          
          <div className="flex items-center mb-6">
            <div className="flex items-center mr-2">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(place.rating)
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
            <span className="text-gray-600 dark:text-gray-300">
              {place.rating.toFixed(1)} ({place.user_ratings_total} reviews)
            </span>
          </div>
          
          {place.reviews && place.reviews.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              <div className="space-y-6">
                {place.reviews.map((review, index) => (
                  <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex items-center mb-2">
                      <span className="font-medium mr-2">{review.author_name}</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(review.rating)
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
                      <span className="text-sm text-gray-500 ml-2">
                        {new Date(review.time * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            <div className="relative h-64 w-full rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || process.env.GOOGLE_MAPS_API}&q=${encodeURIComponent(place.name)}&center=${place.location.lat},${place.location.lng}&zoom=16`}
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
