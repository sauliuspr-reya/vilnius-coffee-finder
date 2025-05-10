-- Create coffee_places table if it doesn't exist
CREATE TABLE IF NOT EXISTS coffee_places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  location JSONB NOT NULL,
  rating NUMERIC, -- Google rating
  user_ratings_total INTEGER, -- Google user ratings total
  photos JSONB,
  reviews JSONB, -- Google reviews
  ring29_rating NUMERIC, -- Ring29 custom rating
  ring29_user_ratings_total INTEGER, -- Ring29 user ratings total
  chatgpt_summary TEXT, -- Summary from ChatGPT API
  chatgpt_extracted_rating TEXT, -- Specific rating field extracted from chatgpt_summary
  trending_score_web NUMERIC DEFAULT 0, -- Score based on web scraping
  trending_score_social NUMERIC DEFAULT 0, -- Score based on social media scraping
  data_last_scraped_at TIMESTAMP WITH TIME ZONE, -- Timestamp of the last web/social scrape
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  slug TEXT UNIQUE, -- Added for user-friendly URLs
  -- New metadata fields added
  website TEXT,
  international_phone_number TEXT,
  price_level INTEGER,
  opening_hours JSONB, -- Stores Google's opening_hours object (periods, weekday_text, open_now)
  google_maps_url TEXT, -- From Google's 'url' field
  business_status TEXT, -- e.g., OPERATIONAL, CLOSED_TEMPORARILY
  editorial_summary JSONB, -- Google's editorial_summary object (overview, language)
  place_types TEXT[], -- Google's categorization (e.g., ["cafe", "food"])
  place_features JSONB -- Grouped boolean features (wheelchair_accessible, delivery, etc.)
);

-- Add new columns for additional metadata (if they don't exist) - for idempotency
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS international_phone_number TEXT;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS price_level INTEGER;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS business_status TEXT;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS editorial_summary JSONB;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS place_types TEXT[];
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS place_features JSONB;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS chatgpt_extracted_rating TEXT;
ALTER TABLE coffee_places ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create function to create the coffee_places table
CREATE OR REPLACE FUNCTION create_coffee_places_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS coffee_places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    location JSONB NOT NULL,
    rating NUMERIC, -- Google rating
    user_ratings_total INTEGER, -- Google user ratings total
    photos JSONB,
    reviews JSONB, -- Google reviews
    ring29_rating NUMERIC, -- Ring29 custom rating
    ring29_user_ratings_total INTEGER, -- Ring29 user ratings total
    chatgpt_summary TEXT, -- Summary from ChatGPT API
    chatgpt_extracted_rating TEXT, -- Specific rating field extracted from chatgpt_summary
    trending_score_web NUMERIC DEFAULT 0, -- Score based on web scraping
    trending_score_social NUMERIC DEFAULT 0, -- Score based on social media scraping
    data_last_scraped_at TIMESTAMP WITH TIME ZONE, -- Timestamp of the last web/social scrape
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    slug TEXT UNIQUE, -- Added for user-friendly URLs
    -- New metadata fields added (mirroring the main CREATE TABLE)
    website TEXT,
    international_phone_number TEXT,
    price_level INTEGER,
    opening_hours JSONB,
    google_maps_url TEXT,
    business_status TEXT,
    editorial_summary JSONB,
    place_types TEXT[],
    place_features JSONB
  );
END;
$$ LANGUAGE plpgsql;

-- Photos for each coffee place
CREATE TABLE IF NOT EXISTS place_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coffee_place_id TEXT NOT NULL REFERENCES coffee_places(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_source_url TEXT,
    alt_text TEXT,
    order_index INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Index for faster querying of photos by coffee_place_id
CREATE INDEX IF NOT EXISTS idx_place_photos_coffee_place_id ON place_photos(coffee_place_id);

-- RLS Policies for place_photos (adjust as needed)
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public photos are viewable by everyone."
ON place_photos FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own photos." -- This might need adjustment based on auth
ON place_photos FOR INSERT
WITH CHECK (true); -- Or check (auth.uid() = user_id) if you add a user_id column for uploads

CREATE POLICY "Users can update their own photos." -- This might need adjustment
ON place_photos FOR UPDATE
USING (true); -- Or check (auth.uid() = user_id)

CREATE POLICY "Users can delete their own photos." -- This might need adjustment
ON place_photos FOR DELETE
USING (true); -- Or check (auth.uid() = user_id)

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER handle_updated_at_place_photos
BEFORE UPDATE ON place_photos
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);
