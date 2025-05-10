import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Please check your .env.local file.');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Specific type for Google's PlaceOpeningHours
export type PlaceOpeningHours = {
  open_now?: boolean;
  periods?: {
    open: { day: number; time: string; date?: string; } | { day: number; time: string; };
    close?: { day: number; time: string; date?: string; } | { day: number; time: string; };
  }[];
  weekday_text?: string[];
  permanently_closed?: boolean;
  // Allows for other potential fields Google might add, using unknown for better type safety
  [key: string]: unknown; 
};

// Specific type for Google's PlaceEditorialSummary
export type PlaceEditorialSummary = {
  language?: string;
  overview?: string;
  // Allows for other potential fields, using unknown for better type safety
  [key: string]: unknown;
};

// Specific type for our custom place_features JSONB object
export type PlaceFeatures = {
  wheelchair_accessible_entrance?: boolean | null;
  curbside_pickup?: boolean | null;
  delivery?: boolean | null;
  dine_in?: boolean | null;
  reservable?: boolean | null;
  serves_breakfast?: boolean | null;
  serves_lunch?: boolean | null;
  serves_dinner?: boolean | null;
  takeout?: boolean | null;
};

export type CoffeePlace = {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number; // Google rating
  user_ratings_total?: number; // Google user ratings total
  photos?: {
    photo_reference: string;
    width: number;
    height: number;
    html_attributions: string[];
  }[];
  reviews?: { // Google reviews
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }[];
  ring29_rating?: number; // Ring29 custom rating
  ring29_user_ratings_total?: number; // Ring29 user ratings total
  chatgpt_summary?: string; // Summary from ChatGPT API
  trending_score_web?: number; // Score based on web scraping
  trending_score_social?: number; // Score based on social media scraping
  data_last_scraped_at?: string; // Timestamp of the last web/social scrape
  last_updated: string;
  // New metadata fields from database schema
  website?: string | null;
  international_phone_number?: string | null;
  price_level?: number | null;
  opening_hours?: PlaceOpeningHours | null; // Using specific type
  google_maps_url?: string | null;
  business_status?: string | null;
  editorial_summary?: PlaceEditorialSummary | null; // Using specific type
  place_types?: string[] | null;
  place_features?: PlaceFeatures | null; // Using specific type
};
