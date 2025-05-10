import { supabase } from '../lib/supabase';
import OpenAI, { APIError } from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Error: OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

// Define interfaces for type safety
interface ReviewItem {
  text?: string;
  comment?: string;
  // Add other review properties if known and needed
}

interface ChatGPTStructuredData {
  place_name: string;
  summary_for_display: string;
  chatgpt_rating: string;
  ongoing_events: string;
  sentiment_analysis: string;
  special_features: string;
  atmosphere?: {
    vibe?: string;
    decor_style?: string;
    good_for_work_study?: boolean;
  };
  coffee_program?: {
    bean_source_quality?: string;
    brewing_methods_available?: string[];
    signature_drinks?: string[];
    milk_alternatives_offered?: string[];
  };
  food_offerings?: {
    types_available?: string[];
    specific_popular_items?: string[];
  };
  key_selling_points?: string[];
  primary_target_audience?: string[];
  error?: string; // For our custom error reporting from the script
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// This function will now return the full JSON object from the AI.
async function getChatGPTStructuredData(placeName: string, placeAddress: string, existingReviews?: string): Promise<ChatGPTStructuredData | null> {
  
  const jsonSchemaForPrompt = {
    type: "object",
    properties: {
      place_name: { type: "string", description: "The name of the coffee shop." },
      summary_for_display: { type: "string", description: "A concise, engaging summary for direct display (2-4 sentences). Highlight atmosphere, coffee, and unique features." },
      chatgpt_rating: { type: "string", description: "Overall rating or sentiment from ChatGPT's perspective (e.g., 'Highly Recommended', 'Good Option', 'Mixed Feelings', 'Potential Concerns')."},
      ongoing_events: { type: "string", description: "Information about any ongoing or upcoming events, if known (Vykstantys renginiai). Default to 'No specific events mentioned' if unknown." },
      sentiment_analysis: { type: "string", description: "A brief analysis of the general sentiment towards the place based on available information. Default to 'Neutral or not enough data' if cannot be determined." },
      special_features: { type: "string", description: "What is particularly special or unique about this coffee shop? (e.g., unique concept, community focus, specific products)." },
      atmosphere: {
        type: "object",
        properties: {
          vibe: { type: "string", description: "Overall vibe (e.g., cozy, bustling, minimalist, artistic, quiet, lively)." },
          decor_style: { type: "string", description: "Brief notes on decor (e.g., industrial, Scandinavian, vintage)." },
          good_for_work_study: { type: "boolean", description: "Is it generally suitable for working or studying?" }
        },
      },
      coffee_program: {
        type: "object",
        properties: {
          bean_source_quality: { type: "string", description: "Notes on coffee beans (e.g., single-origin, specialty blends, local roaster name)." },
          brewing_methods_available: { type: "array", items: { type: "string" }, description: "List of brewing methods (e.g., espresso, pour-over, Aeropress, cold brew)." },
          signature_drinks: { type: "array", items: { type: "string" }, description: "Any unique or popular coffee-based drinks." },
          milk_alternatives_offered: { type: "array", items: { type: "string" }, description: "List of milk alternatives (e.g., oat, almond, soy)." }
        },
      },
      food_offerings: {
        type: "object",
        properties: {
          types_available: { type: "array", items: { type: "string" }, description: "Types of food (e.g., pastries, cakes, sandwiches, light meals, vegan options)." },
          specific_popular_items: { type: "array", items: { type: "string" }, description: "Any specific food items that are popular or noteworthy." }
        },
      },
      key_selling_points: { type: "array", items: { type: "string" }, description: "List of unique selling propositions or standout features." }, // Kept this, can overlap/complement special_features
      primary_target_audience: { type: "array", items: { type: "string" }, description: "Who would most enjoy this coffee shop (e.g., students, remote workers, coffee connoisseurs)." }
    },
    required: ["place_name", "summary_for_display", "chatgpt_rating", "ongoing_events", "sentiment_analysis", "special_features"] 
  };

  const prompt = `
As an expert coffee shop reviewer for Vilnius, Lithuania, analyze "${placeName}" at "${placeAddress}".
${existingReviews ? `Consider these existing reviews as additional context: ${existingReviews}\n\n` : ''}
Your main goal is to provide a comprehensive overview. Your response MUST be a valid JSON object adhering to this schema:
${JSON.stringify(jsonSchemaForPrompt, null, 2)}

Focus on these key areas:
- Overall Summary: A concise, engaging 'summary_for_display'.
- ChatGPT Rating: Your overall assessment.
- Ongoing Events: Any known current or upcoming events.
- Sentiment: General public sentiment.
- Special Features: What makes it unique.
- Atmosphere: Vibe, decor, suitability for work/study.
- Coffee: Bean quality, brewing methods, specialty drinks, milk alternatives.
- Food: Types offered, notable items.

If specific details are unknown, use placeholders like "Not specified", "Unknown", or omit optional fields/array items where appropriate, but ensure all 'required' fields in the schema are present.
`;

  try {
    console.log(`Querying OpenAI gpt-4.1 for: ${placeName} at ${placeAddress}...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // Updated model
      messages: [
        { role: 'system', content: 'You are a helpful assistant that returns coffee shop information as a structured JSON object.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000, // Adjusted for potentially larger, more structured JSON
      temperature: 0.5, 
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (rawContent) {
      console.log('OpenAI JSON response received.');
      try {
        const jsonData = JSON.parse(rawContent) as ChatGPTStructuredData;
        // Validate main required fields before returning
        if (jsonData && jsonData.place_name && jsonData.summary_for_display && jsonData.chatgpt_rating) {
          console.log('Parsed JSON data seems valid.');
          return jsonData; // Return the full parsed JSON object
        } else {
          console.error('OpenAI returned JSON, but some core required fields are missing or empty.');
          // Construct a fallback JSON object that still adheres to the expected structure if possible
          return {
            place_name: placeName,
            summary_for_display: `Summary for ${placeName} could not be fully generated. Core fields missing from AI.`,
            chatgpt_rating: 'Undetermined',
            ongoing_events: 'Unknown',
            sentiment_analysis: 'Unknown',
            special_features: 'Unknown',
            error: 'Core fields missing from AI response.'
          } as ChatGPTStructuredData;
        }
      } catch (parseError) {
        console.error('Error parsing JSON from OpenAI:', parseError);
        return {
            place_name: placeName,
            summary_for_display: `Error processing AI response for ${placeName}. Response was not valid JSON.`,
            chatgpt_rating: 'Error',
            ongoing_events: 'Error',
            sentiment_analysis: 'Error',
            special_features: 'Error',
            error: 'Failed to parse AI JSON response.'
        } as ChatGPTStructuredData; // Cast to assure type if returning error structure
      }
    }
    console.log('OpenAI returned no content in the message.');
    return null;
  } catch (e: unknown) {
    if (e instanceof APIError) {
      console.error('OpenAI API Error Status:', e.status);
      console.error('OpenAI API Error Name:', e.name);
      console.error('OpenAI API Error Message:', e.message);
    } else if (e instanceof Error) {
      console.error('Generic error querying OpenAI:', e.message);
    } else {
      console.error('Unknown error querying OpenAI:', e);
    }
    return null; // Return null on error
  }
}

// Export this function to be used by the API route
export async function enrichPlaceWithChatGPT(placeId: string): Promise<ChatGPTStructuredData | null> {
  console.log(`Fetching place details for ID: ${placeId} for ChatGPT enrichment...`);
  const { data: place, error: fetchError } = await supabase
    .from('coffee_places')
    // Fetch more fields for better context if available, like 'reviews' (assuming it's a JSON or text field of concatenated reviews)
    .select('id, name, address, reviews, chatgpt_summary') 
    .eq('id', placeId)
    .single();

  if (fetchError || !place) {
    console.error(`Error fetching place with ID ${placeId}:`, fetchError?.message || 'Place not found.');
    return null; // Return null if place not found or error
  }

  console.log(`Place found: ${place.name}.`);
  // Decide if you want to re-enrich. For now, let's allow re-enrichment.
  // if (place.chatgpt_summary) {
  //   console.log('This place already has a ChatGPT summary. To re-enrich, modify this logic.');
  //   try {
  //      return JSON.parse(place.chatgpt_summary); // Return existing data if not re-enriching
  //   } catch (e) {
  //     console.error('Error parsing existing chatgpt_summary:', e);
  //     // Proceed to re-enrich if existing data is corrupt
  //   }
  // }

  // Concatenate reviews for context, if they exist and are in expected format
  let reviewsContext = '';
  if (place.reviews && Array.isArray(place.reviews)) {
    reviewsContext = (place.reviews as ReviewItem[])
      .map(review => review.text || review.comment || '') // Adapt based on your actual review structure
      .filter(text => text.trim() !== '')
      .join('\n---\n');
  }

  console.log(`Calling getChatGPTStructuredData for ${place.name}...`);
  const structuredData = await getChatGPTStructuredData(place.name, place.address, reviewsContext);

  // Define a type for the update payload to Supabase for better type safety
  interface CoffeePlaceUpdatePayload {
    chatgpt_summary: string;
    last_updated: string;
    chatgpt_extracted_rating?: string;
  }

  if (structuredData) {
    // Always update with the new structured data, even if some fields are error placeholders
    const updates: CoffeePlaceUpdatePayload = {
      chatgpt_summary: JSON.stringify(structuredData), // Store the full structured JSON
      last_updated: new Date().toISOString(),
    };

    // Add the extracted rating if available
    if (structuredData.chatgpt_rating) {
      updates.chatgpt_extracted_rating = structuredData.chatgpt_rating;
    }

    console.log(`Updating Supabase for ${place.id} with new ChatGPT data and extracted rating...`);
    const { error: updateError } = await supabase
      .from('coffee_places')
      .update(updates)
      .eq('id', placeId);

    if (updateError) {
      console.error(`Error updating place ${placeId} in Supabase:`, updateError.message);
      // Decide if you want to return a specific error object or just the raw structuredData which might contain an error field
      return {
        // ... (copy error structure from getChatGPTStructuredData if needed or make a new one)
        place_name: place.name,
        summary_for_display: `Failed to save AI insights to database for ${place.name}.`,
        chatgpt_rating: 'DB Error',
        ongoing_events: 'DB Error',
        sentiment_analysis: 'DB Error',
        special_features: 'DB Error',
        error: `Database update failed: ${updateError.message}`
      } as ChatGPTStructuredData; // Return an error-like structure
    }
    console.log(`Successfully updated ${place.id} with ChatGPT insights and extracted rating.`);
    return structuredData; // Return the full structured data (which might contain its own error fields from AI processing)
  } else {
    console.log(`No structured data returned from getChatGPTStructuredData for ${place.name}.`);
    // Return a specific error object if OpenAI call itself failed and returned null
    return {
        place_name: place.name,
        summary_for_display: `Failed to get AI insights for ${place.name}. OpenAI call might have failed.`,
        chatgpt_rating: 'AI Error',
        ongoing_events: 'AI Error',
        sentiment_analysis: 'AI Error',
        special_features: 'AI Error',
        error: 'OpenAI call failed or returned no data.'
    } as ChatGPTStructuredData;
  }
}

/*
// Keep main function commented out if you want to run this script manually for testing
async function main() {
  const placeId = process.argv[2]; // Get placeId from command line argument

  if (!placeId) {
    console.error('Usage: npm run enrich-place <placeId>');
    console.error('Alternatively: npx ts-node src/scripts/enrichPlaceWithChatGPT.ts <placeId>');
    process.exit(1);
  }

  console.log(`Starting enrichment process for place ID: ${placeId}`);
  const result = await enrichPlaceWithChatGPT(placeId);
  if (result) {
    console.log('Enrichment result:', JSON.stringify(result, null, 2));
  } else {
    console.log('Enrichment failed or returned no data.');
  }
  console.log('Enrichment process finished.');
}

// main().catch(console.error);
*/
