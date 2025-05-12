import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Client, 
  // Place, // Unused
  PlaceData,
  PlaceReview as GooglePlaceReview,
  PlacePhoto,
  AspectRatingType, // Added back
  PlacesNearbyRequest,
  PlaceDetailsRequest,
  PlaceDetailsResponseData
} from '@googlemaps/google-maps-services-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { CoffeePlace, PlaceOpeningHours, PlaceReview, /* PlaceEditorialSummary, */ PlaceFeatures } from '@/lib/supabase';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Debug: Log all loaded environment variables to see if .env.local is picked up
// console.log('All loaded environment variables after dotenv.config():', process.env);
// Debug: Specifically log the keys the script is interested in
console.log('DEBUG: SUPABASE_URL from env:', process.env.SUPABASE_URL ? 'Loaded' : 'NOT LOADED');
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY from env:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'NOT LOADED');
console.log('DEBUG: GOOGLE_MAPS_API_KEY from env:', process.env.GOOGLE_MAPS_API_KEY ? 'Loaded' : 'NOT LOADED');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Ensure it's not NEXT_PUBLIC_
const SUPABASE_URL = process.env.SUPABASE_URL; // Ensure it's not NEXT_PUBLIC_
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // This is critical

if (!GOOGLE_MAPS_API_KEY) {
  console.error('FATAL: GOOGLE_MAPS_API_KEY is not defined in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error('FATAL: SUPABASE_URL is not defined in .env.local');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local. This key is required for the script to bypass RLS.');
  process.exit(1);
}

const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const googleMapsClient = new Client({}); // Use Client directly
const VILNIUS_LAT = 54.687157;
const VILNIUS_LNG = 25.279652;

const MAX_RESULTS = 200;
const MAX_PHOTOS_PER_PLACE = 3;
const PHOTO_MAX_WIDTH = 1024;
const PHOTO_BUCKET_NAME = 'place-photos'; // Use hyphen as per user's latest instruction

// Interface for Google Place Details including specific boolean fields we care about
interface ExtendedPlaceData extends PlaceData {
  wheelchair_accessible_entrance?: boolean;
  curbside_pickup?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  reservable?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  takeout?: boolean;
  [key: string]: unknown; // Changed from any to unknown
}

interface TransformedGooglePlaceData {
  website?: string;
  international_phone_number?: string;
  price_level?: number;
  opening_hours?: PlaceOpeningHours; // Our app's type
  google_maps_url?: string;
  business_status?: string;
  editorial_summary?: { overview: string; language: string }; // Our app's type for this
  place_types?: string[];
  place_features?: PlaceFeatures; // Our app's type
  reviews?: PlaceReview[]; // Our app's PlaceReview (time as number, translated as boolean)
  photos_metadata?: PlacePhoto[]; // Google's PlacePhoto type, assuming our CoffeePlace.photos_metadata uses this too
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[ Lithuania]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateBaseSlug(name?: string, address?: string): string {
  if (!name) return 'unknown-place';

  const slugFromName = slugify(name);
  let slugFromAddress = '';

  if (address) {
    const addressParts = address.split(',');
    const streetAndMaybeNumber = addressParts[0]?.trim();
    if (streetAndMaybeNumber) {
      slugFromAddress = slugify(streetAndMaybeNumber);
    }
  }

  if (slugFromAddress) {
    return `${slugFromName}-${slugFromAddress}`;
  }
  return slugFromName;
}

// Helper function to transform Google Place Details to our CoffeePlace structure
function transformGooglePlaceDetails(
  googlePlace: Partial<ExtendedPlaceData>,
): TransformedGooglePlaceData {
  const openingHoursData = googlePlace.opening_hours;
  const googleReviews = googlePlace.reviews as GooglePlaceReview[] | undefined;

  const mappedOpeningHours: PlaceOpeningHours | undefined = openingHoursData
  ? {
      open_now: openingHoursData.open_now ?? false,
      periods: (openingHoursData.periods ?? []).map(period => ({
        open: {
          day: period.open.day,
          time: period.open.time ?? '', // Default to empty string if undefined
        },
        close: period.close ? {
          day: period.close.day,
          time: period.close.time ?? '', // Default to empty string if undefined
        } : undefined,
      })),
      weekday_text: openingHoursData.weekday_text ?? [],
    }
  : undefined;

  return {
    website: googlePlace.website ?? undefined,
    international_phone_number: googlePlace.international_phone_number ?? undefined,
    price_level: googlePlace.price_level as number ?? undefined,
    opening_hours: mappedOpeningHours,
    google_maps_url: googlePlace.url ?? undefined,
    business_status: googlePlace.business_status?.toString() ?? undefined,
    editorial_summary: googlePlace.editorial_summary
      ? { 
          overview: googlePlace.editorial_summary.overview ?? '',
          language: googlePlace.editorial_summary.language ?? '' 
        }
      : undefined,
    place_types: googlePlace.types ?? undefined,
    place_features: mapPlaceFeatures(googlePlace),
    reviews: googleReviews?.map((review: GooglePlaceReview) : PlaceReview => ({
      author_name: review.author_name,
      author_url: review.author_url ?? undefined,
      language: review.language, 
      profile_photo_url: review.profile_photo_url, 
      rating: review.rating,
      relative_time_description: review.relative_time_description,
      text: review.text, 
      time: typeof review.time === 'string' ? parseInt(review.time, 10) : (review.time as number), // Parse time to number
      aspects: review.aspects as { rating: number; type: AspectRatingType; }[] ?? [],
    })) ?? undefined,
    photos_metadata: googlePlace.photos?.map(p => ({ ...p })) ?? undefined, // Retain PlacePhoto structure
  };
}

// Helper to map Google's boolean features to our PlaceFeatures structure
function mapPlaceFeatures(placeData: Partial<ExtendedPlaceData>): PlaceFeatures | undefined {
  const features: PlaceFeatures = {};
  if (placeData.wheelchair_accessible_entrance) features.wheelchair_accessible_entrance = true;
  if (placeData.curbside_pickup) features.curbside_pickup = true;
  if (placeData.delivery) features.delivery = true;
  if (placeData.dine_in) features.dine_in = true;
  if (placeData.reservable) features.reservable = true;
  if (placeData.serves_breakfast) features.serves_breakfast = true;
  if (placeData.serves_lunch) features.serves_lunch = true;
  if (placeData.serves_dinner) features.serves_dinner = true;
  if (placeData.takeout) features.takeout = true;
  // Potentially add more specific features here if present in PlaceData and desired in PlaceFeatures
  return Object.keys(features).length > 0 ? features : undefined;
}

async function fetchCoffeePlaces() {
  console.log('Starting to fetch coffee places in Vilnius...');

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is required. Please check your .env.local file.');
    process.exit(1);
  }

  console.log('Using Google Maps API key:', GOOGLE_MAPS_API_KEY);
  console.log('Note: If your API key has referer restrictions, it may not work with this script.');
  console.log('You may need to create a separate API key without referer restrictions for server-side use.');

  try {
    const { error: tableCheckError } = await supabaseAdmin
      .from('coffee_places')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (tableCheckError) {
      console.log('Creating coffee_places table...');
      // This assumes create_coffee_places_table is a PL/pgSQL function you've defined.
      // Ensure it exists and handles its own errors or this might fail silently.
      const { error: createTableError } = await supabaseAdmin.rpc('create_coffee_places_table'); 
      if (createTableError) {
        console.error('Error creating coffee_places table via RPC:', createTableError);
        // Decide if you want to process.exit(1) here or try to continue
      }
    }

    const coffeePlaces: Partial<CoffeePlace>[] = []; // Type more specifically
    let pageToken: string | undefined = undefined;

    const placeDetailsFields: string[] = [ // Type as string[]
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'reviews',
      'photos',
      'website',
      'international_phone_number',
      'price_level',
      'opening_hours',
      'url',
      'business_status',
      'editorial_summary',
      'types',
      'adr_address',
      // Boolean fields for place_features
      'wheelchair_accessible_entrance',
      'curbside_pickup',
      'delivery',
      'dine_in',
      'reservable',
      'serves_breakfast',
      'serves_lunch',
      'serves_dinner',
      'takeout',
    ]; //.map((f) => f as PlaceDataField); // Removed problematic cast

    do {
      const nearbyRequest: PlacesNearbyRequest = {
        params: {
          location: { lat: VILNIUS_LAT, lng: VILNIUS_LNG },
          radius: 10000,
          type: 'cafe',
          keyword: 'coffee',
          key: GOOGLE_MAPS_API_KEY,
          pagetoken: pageToken,
        },
      };

      const nearbyResponse = await googleMapsClient.placesNearby(nearbyRequest);
      const { results, next_page_token } = nearbyResponse.data;

      for (const place of results) {
        if (coffeePlaces.length >= MAX_RESULTS) break;

        if (!place.place_id) continue;

        const detailsRequest: PlaceDetailsRequest = {
          params: {
            place_id: place.place_id,
            fields: placeDetailsFields, // Now string[]
            key: GOOGLE_MAPS_API_KEY as string,
          },
        };

        let placeDetailsFromGoogle: Partial<ExtendedPlaceData> = {};
        try {
          const apiResponse = await googleMapsClient.placeDetails(detailsRequest);
          const detailsResponse: PlaceDetailsResponseData = apiResponse.data;
          placeDetailsFromGoogle = detailsResponse.result as ExtendedPlaceData;
        } catch (e: unknown) {
          if (e instanceof Error) {
            console.error(`Error fetching details for place ID ${place.place_id}: ${e.message}`);
          } else {
            console.error(`Error fetching details for place ID ${place.place_id}: An unknown error occurred`);
          }
          continue;
        }

        const { data: existingPlaceInDb, error: fetchExistingError } = await supabaseAdmin
          .from('coffee_places')
          .select('*')
          .eq('id', place.place_id)
          .single();

        if (fetchExistingError && fetchExistingError.code !== 'PGRST116') {
          console.warn(`Warning fetching existing data for ${place.place_id}: ${fetchExistingError.message}`);
        }

        const transformedDetails = transformGooglePlaceDetails(
          placeDetailsFromGoogle,
        );

        const baseSlug = generateBaseSlug(placeDetailsFromGoogle.name, placeDetailsFromGoogle.formatted_address);
        let finalSlug = baseSlug;
        let suffix = 1;
        let slugIsUnique = false;

        while (!slugIsUnique) {
          const { data: existingSlugEntry, error: slugCheckError } = await supabaseAdmin
            .from('coffee_places')
            .select('id')
            .eq('slug', finalSlug)
            .maybeSingle();

          if (slugCheckError && slugCheckError.code !== 'PGRST116') {
            console.warn(`Warning checking slug uniqueness for ${finalSlug}: ${slugCheckError.message}. Assigning place_id as fallback slug.`);
            finalSlug = place.place_id;
            break;
          }

          if (!existingSlugEntry || existingSlugEntry.id === place.place_id) {
            slugIsUnique = true;
          } else {
            suffix++;
            finalSlug = `${baseSlug}-${suffix}`;
          }
        }

        const coffeePlaceForDb: CoffeePlace = {
          // Base fields from existing DB record or initial search result
          id: place.place_id!,
          slug: finalSlug,
          name: placeDetailsFromGoogle.name || existingPlaceInDb?.name || place.name || '',
          address: placeDetailsFromGoogle.formatted_address || existingPlaceInDb?.address || place.vicinity || '',
          location: placeDetailsFromGoogle.geometry?.location
            ? { lat: placeDetailsFromGoogle.geometry.location.lat, lng: placeDetailsFromGoogle.geometry.location.lng }
            : existingPlaceInDb?.location || { lat: place.geometry?.location.lat || 0, lng: place.geometry?.location.lng || 0 },
          rating: placeDetailsFromGoogle.rating ?? existingPlaceInDb?.rating ?? place.rating ?? undefined,
          user_ratings_total: placeDetailsFromGoogle.user_ratings_total ?? existingPlaceInDb?.user_ratings_total ?? place.user_ratings_total ?? undefined,
          photos: existingPlaceInDb?.photos || [], // Default to empty array if new
          created_at: existingPlaceInDb?.created_at || new Date().toISOString(),
          last_updated: new Date().toISOString(),
          
          // Overwrite with transformed details from Google
          ...transformedDetails,
          
          // Ensure no properties are spread from existingPlaceInDb if they are meant to be fully overwritten
          // by transformedDetails or if transformedDetails provides 'undefined' for them.
          // Example: if transformedDetails.website is undefined, we want undefined, not existingPlaceInDb.website.
          // This is generally handled by the order of spread and explicit assignments.
          
          // Ensure all non-optional fields of CoffeePlace have values.
          // Fields like 'ai_summary', 'user_submitted_content' etc. are optional or handled elsewhere.
        } as CoffeePlace; // Added 'as CoffeePlace' for stricter checking during assignment construction

        // Prepare an array for Supabase photo URLs and metadata
        const supabasePhotosArray: { url: string; width: number; height: number; html_attributions?: string[] }[] = [];

        if (placeDetailsFromGoogle.photos && placeDetailsFromGoogle.photos.length > 0) {
          console.log(`  Processing photos for ${placeDetailsFromGoogle.name}...`);

          for (let i = 0; i < Math.min((placeDetailsFromGoogle.photos || []).length, MAX_PHOTOS_PER_PLACE); i++) {
            const photo: PlacePhoto = placeDetailsFromGoogle.photos![i]; // Added non-null assertion since we check length
            const photoRef = photo.photo_reference;

            if (!photoRef) {
              console.warn(`  Photo reference missing for photo ${i + 1} of ${placeDetailsFromGoogle.name}. Skipping.`);
              continue;
            }

            const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PHOTO_MAX_WIDTH}&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;

            try {
              const photoResponse = await fetch(photoApiUrl);
              if (!photoResponse.ok) {
                console.error(`  Failed to download photo ${i + 1} for ${placeDetailsFromGoogle.name} (ref: ${photoRef.substring(0, 10)}...): ${photoResponse.status} ${photoResponse.statusText}`);
                continue;
              }
              const imageBuffer = await photoResponse.arrayBuffer();
              const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
              const fileExtension = contentType.split('/')[1]?.toLowerCase() || 'jpg';

              const storageFilePath = `${place.place_id}/${i}.${fileExtension}`;

              const { error: uploadError } = await supabaseAdmin.storage
                .from(PHOTO_BUCKET_NAME)
                .upload(storageFilePath, imageBuffer, {
                  contentType: contentType,
                  upsert: true,
                });

              if (uploadError) {
                console.error(`  Error uploading photo ${storageFilePath} to Supabase:`, uploadError.message);
                continue;
              }
              console.log(`  Successfully uploaded photo ${storageFilePath}`);

              // Get public URL for the uploaded photo
              const { data: publicUrlData } = supabaseAdmin.storage
                .from(PHOTO_BUCKET_NAME)
                .getPublicUrl(storageFilePath);
              
              const publicSupabaseUrl = publicUrlData?.publicUrl;

              if (publicSupabaseUrl) {
                supabasePhotosArray.push({
                  url: publicSupabaseUrl,
                  width: photo.width,
                  height: photo.height,
                  html_attributions: photo.html_attributions
                });
              } else {
                console.warn(`  Could not retrieve public URL for ${storageFilePath}`);
              }

              // The existing logic to insert into 'place_photos' table can remain if you want a separate log/reference
              // Or it can be removed/modified if coffeePlaceForDb.photos is the single source of truth for displayable photos.
              const { error: insertPhotoError } = await supabaseAdmin.from('place_photos').insert({
                coffee_place_id: place.place_id,
                storage_path: storageFilePath,
                original_source_url: photo.html_attributions?.[0] || null,
                alt_text: `Photo ${i + 1} of ${placeDetailsFromGoogle.name || 'coffee place'}`,
                order_index: i,
                width: photo.width,
                height: photo.height,
              });

              if (insertPhotoError) {
                console.error(`  Error inserting photo metadata for ${storageFilePath}:`, insertPhotoError.message);
              } else {
                console.log(`  Successfully inserted photo metadata for ${storageFilePath}`);
              }
            } catch (e: unknown) {
              console.error(`  Exception processing photo ${i + 1} (ref: ${photoRef.substring(0, 10)}...) for ${placeDetailsFromGoogle.name}:`, (e as Error).message);
            }
          }
        }
        // Assign the collected Supabase photo URLs to the main coffee place object
        coffeePlaceForDb.photos = supabasePhotosArray.length > 0 ? supabasePhotosArray : undefined;

        coffeePlaces.push(coffeePlaceForDb);

      }

      pageToken = next_page_token;

      if (pageToken) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } while (pageToken && coffeePlaces.length < MAX_RESULTS);

    console.log(`Found ${coffeePlaces.length} coffee places in Vilnius`);

    for (const place of coffeePlaces) {
      const { error } = await supabaseAdmin
        .from('coffee_places')
        .upsert(place, { onConflict: 'id' });

      if (error) {
        console.error(`Error storing ${place.name}:`, error);
      }
    }

    console.log('Successfully updated coffee places in the database');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching coffee places:', error.message, error.stack);
    } else {
      console.error('Error fetching coffee places:', error);
    }
  }
}

if (require.main === module) {
  fetchCoffeePlaces()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error instanceof Error) {
        console.error('Unhandled error:', error.message, error.stack);
      } else {
        console.error('Unhandled unknown error:', error);
      }
      process.exit(1);
    });
}

export default fetchCoffeePlaces;
