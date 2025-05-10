import { Client, Place, PlaceDetailsRequest, PlaceDetailsResponse, PlacesNearbyRequest, PlaceReview } from '@googlemaps/google-maps-services-js';
import { supabase, CoffeePlace } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const googleMapsClient = new Client({});
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API || '';

// Vilnius city center coordinates
const VILNIUS_LAT = 54.687157;
const VILNIUS_LNG = 25.279652;

// Maximum number of coffee places to fetch
const MAX_RESULTS = 100;

/**
 * Fetches coffee places from Google Maps API and stores them in Supabase
 */
async function fetchCoffeePlaces() {
  console.log('Starting to fetch coffee places in Vilnius...');

  // Check if Google Maps API key is available
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is required. Please check your .env.local file.');
    process.exit(1);
  }
  
  console.log('Using Google Maps API key:', GOOGLE_MAPS_API_KEY);
  console.log('Note: If your API key has referer restrictions, it may not work with this script.');
  console.log('You may need to create a separate API key without referer restrictions for server-side use.');
  
  try {
    // Check if the coffee_places table exists, if not create it
    const { error: tableCheckError } = await supabase
      .from('coffee_places')
      .select('id')
      .limit(1);
    
    if (tableCheckError) {
      console.log('Creating coffee_places table...');
      const { error: createTableError } = await supabase.rpc('create_coffee_places_table');
      if (createTableError) {
        console.error('Error creating table:', createTableError);
        return;
      }
    }

    // Fetch nearby coffee places
    const coffeePlaces: CoffeePlace[] = [];
    let pageToken: string | undefined = undefined;
    
    do {
      const nearbyRequest: PlacesNearbyRequest = {
        params: {
          location: { lat: VILNIUS_LAT, lng: VILNIUS_LNG },
          radius: 10000, // 10km radius
          type: 'cafe',
          keyword: 'coffee',
          key: GOOGLE_MAPS_API_KEY,
          pagetoken: pageToken,
        }
      };

      const nearbyResponse = await googleMapsClient.placesNearby(nearbyRequest);
      const { results, next_page_token } = nearbyResponse.data;
      
      // Loop through each place found in the current page
      for (const place of results) {
        if (coffeePlaces.length >= MAX_RESULTS) break;

        if (!place.place_id) {
          console.log('Skipping place without Google Place ID.');
          continue;
        }

        // Get place details including reviews
        const detailsRequest: PlaceDetailsRequest = {
          params: {
            place_id: place.place_id,
            fields: [
              'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'photos', 'reviews', // Existing fields
              'website', 'international_phone_number', 'price_level', 'opening_hours', 'url', // For google_maps_url
              'business_status', 'editorial_summary', 'types', // For place_types
              // Boolean fields for place_features
              'wheelchair_accessible_entrance', 'curbside_pickup', 'delivery', 'dine_in',
              'reservable', 'serves_breakfast', 'serves_lunch', 'serves_dinner', 'takeout'
            ] as string[],
            key: GOOGLE_MAPS_API_KEY as string,
          }
        };

        let placeDetailsFromGoogle: Partial<Place> = {}; 
        try {
          const detailsResponse: PlaceDetailsResponse = await googleMapsClient.placeDetails(detailsRequest);
          placeDetailsFromGoogle = detailsResponse.data.result;
        } catch (e: unknown) { 
          if (e instanceof Error) {
            console.error(`Error fetching details for place ID ${place.place_id}: ${e.message}`);
          } else {
            console.error(`Error fetching details for place ID ${place.place_id}: An unknown error occurred`);
          }
          continue; // Skip this place if details fetching fails
        }

        // Fetch existing place data from our database
        const { data: existingPlaceInDb, error: fetchExistingError } = await supabase
          .from('coffee_places')
          .select('*') // Fetch all columns to preserve existing data
          .eq('id', place.place_id)
          .single();

        if (fetchExistingError && fetchExistingError.code !== 'PGRST116') { // PGRST116: row not found (ok for new places)
          console.warn(`Warning fetching existing data for ${place.place_id}: ${fetchExistingError.message}`);
        }

        // Prepare new reviews from Google
        const newReviewsFromGoogle = (placeDetailsFromGoogle.reviews || []).map((review: PlaceReview) => ({ 
          author_name: review.author_name,
          rating: review.rating,
          text: review.text,
          time: typeof review.time === 'string' ? parseInt(review.time, 10) : review.time,
        }));

        // Merge reviews: existing + new, ensuring uniqueness
        const allReviewsMap = new Map<string, NonNullable<CoffeePlace['reviews']>[0]>();
        type ProcessedReview = NonNullable<CoffeePlace['reviews']>[0];
        
        const getReviewKey = (r: ProcessedReview) => `${r.author_name}_${r.time}`;

        (existingPlaceInDb?.reviews || []).forEach((review: ProcessedReview) => {
          allReviewsMap.set(getReviewKey(review), review);
        });
        newReviewsFromGoogle.forEach((review: ProcessedReview) => {
          allReviewsMap.set(getReviewKey(review), review);
        });
        const mergedReviews = Array.from(allReviewsMap.values());

        // Helper to build place_features object, only including true/false values if present
        const getPlaceFeatures = (): CoffeePlace['place_features'] => {
          const features: Partial<NonNullable<CoffeePlace['place_features']>> = {};
          // These are keys of our PlaceFeatures type, which should align with optional boolean fields on Google's Place type
          const featureKeys: (keyof NonNullable<CoffeePlace['place_features']>)[] = [
            'wheelchair_accessible_entrance', 'curbside_pickup', 'delivery', 'dine_in',
            'reservable', 'serves_breakfast', 'serves_lunch', 'serves_dinner', 'takeout'
          ];

          let hasAnyFeatureDataFromGoogle = false;
          for (const key of featureKeys) {
            // Access the property from placeDetailsFromGoogle (Partial<Place>)
            // The Google Place type includes these as optional boolean fields.
            const googleValue = placeDetailsFromGoogle[key as keyof Place]; 
            
            if (typeof googleValue === 'boolean') {
              features[key] = googleValue;
              hasAnyFeatureDataFromGoogle = true;
            }
          }
          
          // If new feature data was found from Google, return that object.
          // Otherwise, fall back to existing features in DB, or null if none.
          if (hasAnyFeatureDataFromGoogle) {
            return features;
          }
          return existingPlaceInDb?.place_features ?? null; 
        };

        // Construct the coffee place object for upsert, preserving existing non-Google data
        const coffeePlaceForDb: CoffeePlace = {
          // Start with existing data if available, to preserve fields like chatgpt_summary etc.
          ...(existingPlaceInDb || {}),

          // Overwrite with new Google data or defaults
          id: place.place_id, // This is the primary key
          name: placeDetailsFromGoogle.name || existingPlaceInDb?.name || '',
          address: placeDetailsFromGoogle.formatted_address || existingPlaceInDb?.address || '',
          location: placeDetailsFromGoogle.geometry?.location
            ? { lat: placeDetailsFromGoogle.geometry.location.lat, lng: placeDetailsFromGoogle.geometry.location.lng }
            : existingPlaceInDb?.location || { lat: 0, lng: 0 },
          rating: placeDetailsFromGoogle.rating ?? existingPlaceInDb?.rating ?? null,
          user_ratings_total: placeDetailsFromGoogle.user_ratings_total ?? existingPlaceInDb?.user_ratings_total ?? null,
          photos: (placeDetailsFromGoogle.photos && placeDetailsFromGoogle.photos.length > 0)
            ? placeDetailsFromGoogle.photos.map(photo => ({
                photo_reference: photo.photo_reference || '',
                width: photo.width,
                height: photo.height,
                html_attributions: photo.html_attributions,
              }))
            : existingPlaceInDb?.photos || [], // If Google provides no photos, keep existing or default to empty
          reviews: mergedReviews, // Use the fully merged review list
          last_updated: new Date().toISOString(),

          // --- New metadata fields ---
          website: placeDetailsFromGoogle.website ?? existingPlaceInDb?.website ?? null,
          international_phone_number: placeDetailsFromGoogle.international_phone_number ?? existingPlaceInDb?.international_phone_number ?? null,
          price_level: placeDetailsFromGoogle.price_level ?? existingPlaceInDb?.price_level ?? null,
          opening_hours: placeDetailsFromGoogle.opening_hours ?? existingPlaceInDb?.opening_hours ?? null,
          google_maps_url: placeDetailsFromGoogle.url ?? existingPlaceInDb?.google_maps_url ?? null,
          business_status: placeDetailsFromGoogle.business_status ?? existingPlaceInDb?.business_status ?? null,
          editorial_summary: placeDetailsFromGoogle.editorial_summary ?? existingPlaceInDb?.editorial_summary ?? null,
          place_types: placeDetailsFromGoogle.types ?? existingPlaceInDb?.place_types ?? null,
          place_features: getPlaceFeatures(),
          
          // Ensure fields not from Google but defined in CoffeePlace are correctly typed or preserved
          ring29_rating: existingPlaceInDb?.ring29_rating ?? null,
          ring29_user_ratings_total: existingPlaceInDb?.ring29_user_ratings_total ?? null,
          chatgpt_summary: existingPlaceInDb?.chatgpt_summary ?? null,
          trending_score_web: existingPlaceInDb?.trending_score_web ?? null,
          trending_score_social: existingPlaceInDb?.trending_score_social ?? null,
          data_last_scraped_at: existingPlaceInDb?.data_last_scraped_at ?? null,
        };

        coffeePlaces.push(coffeePlaceForDb);
      }

      pageToken = next_page_token;
      
      // If there's a next page token, wait a bit before making the next request
      if (pageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } while (pageToken && coffeePlaces.length < MAX_RESULTS);
    
    console.log(`Found ${coffeePlaces.length} coffee places in Vilnius`);
    
    // Store coffee places in Supabase
    for (const place of coffeePlaces) {
      const { error } = await supabase
        .from('coffee_places')
        .upsert(place, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error storing ${place.name}:`, error);
      }
    }
    
    console.log('Successfully updated coffee places in the database');
    
  } catch (error) {
    console.error('Error fetching coffee places:', error);
  }
}

// Execute the function if this file is run directly
if (require.main === module) {
  fetchCoffeePlaces()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default fetchCoffeePlaces;
