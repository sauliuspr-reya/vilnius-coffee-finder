import { supabase, CoffeePlace } from './supabase';

/**
 * Fetches coffee places from the database
 * @param limit Maximum number of places to fetch
 * @param offset Offset for pagination
 * @returns Array of coffee places
 */
export async function getCoffeePlaces(limit = 20, offset = 0): Promise<CoffeePlace[]> {
  const { data, error } = await supabase
    .from('coffee_places')
    .select('*')
    .order('rating', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Error fetching coffee places:', error);
    return [];
  }
  
  return data as CoffeePlace[];
}

/**
 * Fetches a single coffee place by ID
 * @param id Coffee place ID
 * @returns Coffee place or null if not found
 */
export async function getCoffeePlaceById(id: string): Promise<CoffeePlace | null> {
  const { data, error } = await supabase
    .from('coffee_places')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching coffee place with ID ${id}:`, error);
    return null;
  }
  
  return data as CoffeePlace;
}

/**
 * Fetches the photo URL for a Google Maps photo reference
 * @param photoReference Google Maps photo reference
 * @param maxWidth Maximum width of the photo
 * @returns URL to the photo
 */
export function getPhotoUrl(photoReference: string, maxWidth = 400): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || process.env.GOOGLE_MAPS_API;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
}
