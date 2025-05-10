import { supabase } from '../lib/supabase';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Error: OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

async function getChatGPTPlaceSummary(placeName: string, placeAddress: string): Promise<string | null> {
  const prompt = `Provide a concise and engaging summary for the coffee shop "${placeName}" located at "${placeAddress}" in Vilnius, Lithuania. Focus on its unique selling points, atmosphere, coffee quality, and any notable specialties if known. Aim for a summary that would be useful for someone looking to decide if it's the right coffee shop for them. If you don't have specific information, indicate that.`;

  try {
    console.log(`Querying OpenAI for: ${placeName} at ${placeAddress}...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that provides summaries for coffee shops.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200, // Adjust as needed
      temperature: 0.7, // Adjust for creativity vs. factuality
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (summary) {
      console.log('Summary received from OpenAI.');
      return summary;
    }
    console.log('OpenAI returned an empty summary.');
    return null;
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    return null;
  }
}

async function enrichPlace(placeId: string) {
  console.log(`Fetching place details for ID: ${placeId}...`);
  const { data: place, error: fetchError } = await supabase
    .from('coffee_places')
    .select('id, name, address, chatgpt_summary')
    .eq('id', placeId)
    .single();

  if (fetchError || !place) {
    console.error(`Error fetching place with ID ${placeId}:`, fetchError?.message || 'Place not found.');
    return;
  }

  console.log(`Place found: ${place.name}`);
  if (place.chatgpt_summary) {
    console.log('This place already has a ChatGPT summary. Skipping enrichment.');
    // If you want to overwrite, remove this check or add a --force flag
    // return;
  }

  const summary = await getChatGPTPlaceSummary(place.name, place.address);

  if (summary) {
    console.log(`Updating place ${placeId} with new summary...`);
    const { error: updateError } = await supabase
      .from('coffee_places')
      .update({ chatgpt_summary: summary, last_updated: new Date().toISOString() })
      .eq('id', placeId);

    if (updateError) {
      console.error(`Error updating place ${placeId} with summary:`, updateError.message);
    } else {
      console.log(`Successfully updated ${place.name} (ID: ${placeId}) with ChatGPT summary.`);
    }
  } else {
    console.log(`No summary generated for ${place.name}. Database not updated.`);
  }
}

async function main() {
  const placeId = process.argv[2]; // Get placeId from command line argument

  if (!placeId) {
    console.error('Usage: npm run enrich-place <placeId>');
    console.error('Alternatively: npx ts-node src/scripts/enrichPlaceWithChatGPT.ts <placeId>');
    process.exit(1);
  }

  console.log(`Starting enrichment process for place ID: ${placeId}`);
  await enrichPlace(placeId);
  console.log('Enrichment process finished.');
}

main().catch(console.error);
