import Link from 'next/link';
import { getCoffeePlaceById, getPhotoUrl } from '@/lib/api';
import { notFound } from 'next/navigation';
import ChatGPTEnrichment from '@/components/ChatGPTEnrichment';
import ImageGallery from '@/components/ImageGallery';
import { CoffeePlace } from '@/lib/supabase';
import type { Metadata } from 'next';
import { ChatGPTStructuredData } from '@/types/chatgpt';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; }>;
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const awaitedParams = await params;
  const id = awaitedParams.id;
  const place = await getCoffeePlaceById(id);

  if (!place) {
    return {
      title: 'Place Not Found | Vilnius Coffee Finder',
    };
  }

  return {
    title: `${place.name} | Vilnius Coffee Finder`,
    description: `Details about ${place.name}, located at ${place.address}. View ratings, reviews, and AI insights for this coffee shop in Vilnius.`,
    // You can add openGraph images here too if desired, e.g., using photoUrl
  };
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const place = await getCoffeePlaceById(id);
  
  if (!place) {
    notFound();
  }

  let initialChatGPTData: ChatGPTStructuredData | null = null;
  if (place.chatgpt_summary) {
    try {
      initialChatGPTData = JSON.parse(place.chatgpt_summary as string) as ChatGPTStructuredData;
    } catch (error) {
      console.error(`Error parsing chatgpt_summary for place ${place.id}:`, error);
    }
  }

  // Prepare photo URLs for the gallery
  const galleryPhotoUrls = place.photos && place.photos.length > 0
    ? place.photos.map(photo => getPhotoUrl(photo.photo_reference, 1024)) // Fetch larger images for modal
    : ['/coffee-placeholder.jpg']; // Fallback if no photos

  // Helper to render price level
  const renderPriceLevel = (level: number | null | undefined) => {
    if (level === null || typeof level === 'undefined') return null;
    return '€'.repeat(level);
  };

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-12 bg-gray-50 dark:bg-gray-900">
      <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        ← Back to all coffee places
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <ImageGallery photoUrls={galleryPhotoUrls} placeName={place.name} />
        
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{place.name}</h1>
          
          {place.business_status && (
            <span 
              className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-3 ${ 
                place.business_status === 'OPERATIONAL' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
              }`}
            >
              {place.business_status.replace('_', ' ').toLowerCase()}
            </span>
          )}

          <p className="text-gray-600 dark:text-gray-300 mb-1">{place.address}</p>
          {place.google_maps_url && (
            <a 
              href={place.google_maps_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-blue-500 hover:underline mb-4 block"
            >
              View on Google Maps
            </a>
          )}
          
          <div className="flex items-center mb-6">
            {place.rating !== null && typeof place.rating !== 'undefined' && (
              <>
                <div className="flex items-center mr-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(place.rating!)
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
                <span className="text-gray-600 dark:text-gray-300 mr-3">
                  {place.rating.toFixed(1)} ({place.user_ratings_total} Google reviews)
                </span>
              </>
            )}
            {place.price_level && (
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                {renderPriceLevel(place.price_level)}
              </span>
            )}
          </div>

          {/* ChatGPT Enrichment Section */}
          <ChatGPTEnrichment 
            placeId={place.id}
            initialData={initialChatGPTData} 
            placeName={place.name}
          />

          {/* Editorial Summary from Google */}
          {place.editorial_summary && (place.editorial_summary as CoffeePlace['editorial_summary'])?.overview && (
            <div className="my-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">About (from Google)</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {(place.editorial_summary as CoffeePlace['editorial_summary'])?.overview}
              </p>
            </div>
          )}

          {/* Contact and Website */}
          <div className="my-6 grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-1">Contact</h3>
              {place.international_phone_number && <p className="text-gray-600 dark:text-gray-300">{place.international_phone_number}</p>}
              {place.website && 
                <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block">
                  Visit Website
                </a>
              }
            </div>
            {/* Placeholder for other info like email if you add it */}
          </div>

          {/* Opening Hours */}
          {place.opening_hours && (place.opening_hours as CoffeePlace['opening_hours'])?.weekday_text && (
            <div className="my-6">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-1">Opening Hours</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300">
                {(place.opening_hours as CoffeePlace['opening_hours'])?.weekday_text?.map((line: string, index: number) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
              {(place.opening_hours as CoffeePlace['opening_hours'])?.open_now !== undefined && (
                <p className={`mt-2 text-sm font-medium ${(place.opening_hours as CoffeePlace['opening_hours'])?.open_now ? 'text-green-600' : 'text-red-600'}`}>
                  {(place.opening_hours as CoffeePlace['opening_hours'])?.open_now ? 'Open now' : 'Closed now'}
                </p>
              )}
            </div>
          )}

          {/* Place Types */}
          {place.place_types && place.place_types.length > 0 && (
            <div className="my-6">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {place.place_types.map((type: string) => (
                  <span key={type} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                    {type.replace(/_/g, ' ').replace(/\b(\w)/g, (char: string) => char.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Place Features */}
          {place.place_features && Object.keys(place.place_features).length > 0 && (
            <div className="my-6">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Features</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                {Object.entries(place.place_features as Record<string, boolean | null>).map(([key, value]) => (
                  value === true && <li key={key}>{key.replace(/_/g, ' ').replace(/\b(\w)/g, (char: string) => char.toUpperCase())}</li>
                ))}
              </ul>
            </div>
          )}
          
          {place.reviews && Array.isArray(place.reviews) && place.reviews.length > 0 && (
            <div className="my-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">User Reviews (Google)</h2>
              <div className="space-y-6">
                {(place.reviews as import('@/lib/supabase').PlaceReview[]).map((review, index) => (
                  <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
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
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Location</h2>
            <div className="relative h-64 w-full rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(place.name)}&center=${place.location.lat},${place.location.lng}&zoom=16`}
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
