import { NextResponse } from 'next/server';
import { enrichPlaceWithChatGPT } from '@/scripts/enrichPlaceWithChatGPT'; // Adjusted path assuming scripts is at src/scripts

export async function POST(request: Request) {
  try {
    const { placeId } = await request.json();

    if (!placeId) {
      return NextResponse.json({ message: 'Missing placeId' }, { status: 400 });
    }

    // Call enrichPlaceWithChatGPT and get structured data
    const chatGPTData = await enrichPlaceWithChatGPT(placeId);

    if (!chatGPTData) {
      return NextResponse.json({ message: 'Failed to enrich place with ChatGPT data' }, { status: 500 });
    }

    // The enrichPlaceWithChatGPT script should now return the data it saved/fetched
    return NextResponse.json(chatGPTData, { status: 200 });
  } catch (error) {
    console.error('Error in /api/enrich-chatgpt:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
