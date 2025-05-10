'use client';

import { useState, startTransition } from 'react';
import { ChatGPTStructuredData } from '@/types/chatgpt';

interface ChatGPTEnrichmentProps {
  placeId: string;
  initialData: ChatGPTStructuredData | null | undefined;
  placeName: string;
}

export default function ChatGPTEnrichment({ 
  placeId, 
  initialData, 
  placeName 
}: ChatGPTEnrichmentProps) {
  const [chatGPTData, setChatGPTData] = useState<ChatGPTStructuredData | null | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnrich = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enrich-chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placeId }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to enrich summary from server';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: ChatGPTStructuredData = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      startTransition(() => {
        setChatGPTData(data);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during enrichment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 sm:mb-0">AI Insights for {placeName}</h3>
        {(!chatGPTData || chatGPTData.error) && (
          <button 
            onClick={handleEnrich} 
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors text-sm shadow-sm"
          >
            {isLoading ? 'Generating...' : 'Get AI Insights'}
          </button>
        )}
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">Error: {error}</p>}

      {isLoading && !chatGPTData && (
        <p className="text-gray-500 dark:text-gray-400 italic">Generating AI insights, please wait...</p>
      )}

      {chatGPTData && !chatGPTData.error ? (
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Summary:</h4>
            <p className="whitespace-pre-wrap pl-2">{chatGPTData.summary_for_display}</p>
          </div>
          {chatGPTData.chatgpt_rating && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Overall Rating:</h4>
              <p className="pl-2">{chatGPTData.chatgpt_rating}</p>
            </div>
          )}
          
          {/* Atmosphere Section */}
          {chatGPTData.atmosphere && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Atmosphere:</h4>
              {chatGPTData.atmosphere.vibe && <p className="pl-2"><strong>Vibe:</strong> {chatGPTData.atmosphere.vibe}</p>}
              {chatGPTData.atmosphere.decor_style && <p className="pl-2"><strong>Decor:</strong> {chatGPTData.atmosphere.decor_style}</p>}
              {typeof chatGPTData.atmosphere.good_for_work_study === 'boolean' && <p className="pl-2"><strong>Good for Work/Study:</strong> {chatGPTData.atmosphere.good_for_work_study ? 'Yes' : 'No'}</p>}
            </div>
          )}

          {/* Coffee Program Section */}
          {chatGPTData.coffee_program && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Coffee Program:</h4>
              {chatGPTData.coffee_program.bean_source_quality && <p className="pl-2"><strong>Bean Quality:</strong> {chatGPTData.coffee_program.bean_source_quality}</p>}
              {chatGPTData.coffee_program.brewing_methods_available && chatGPTData.coffee_program.brewing_methods_available.length > 0 && (
                <div className="pl-2">
                  <strong>Brewing Methods:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {chatGPTData.coffee_program.brewing_methods_available.map((method, index) => <li key={index}>{method}</li>)}
                  </ul>
                </div>
              )}
              {chatGPTData.coffee_program.signature_drinks && chatGPTData.coffee_program.signature_drinks.length > 0 && (
                <div className="pl-2">
                  <strong>Signature Drinks:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {chatGPTData.coffee_program.signature_drinks.map((drink, index) => <li key={index}>{drink}</li>)}
                  </ul>
                </div>
              )}
              {chatGPTData.coffee_program.milk_alternatives_offered && chatGPTData.coffee_program.milk_alternatives_offered.length > 0 && (
                <div className="pl-2">
                  <strong>Milk Alternatives:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {chatGPTData.coffee_program.milk_alternatives_offered.map((milk, index) => <li key={index}>{milk}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Food Offerings Section */}
          {chatGPTData.food_offerings && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Food Offerings:</h4>
              {chatGPTData.food_offerings.types_available && chatGPTData.food_offerings.types_available.length > 0 && (
                 <div className="pl-2">
                  <strong>Types Available:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {chatGPTData.food_offerings.types_available.map((type, index) => <li key={index}>{type}</li>)}
                  </ul>
                </div>
              )}
              {chatGPTData.food_offerings.specific_popular_items && chatGPTData.food_offerings.specific_popular_items.length > 0 && (
                <div className="pl-2">
                  <strong>Popular Items:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {chatGPTData.food_offerings.specific_popular_items.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Key Selling Points Section */}
          {chatGPTData.key_selling_points && chatGPTData.key_selling_points.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Key Selling Points:</h4>
              <ul className="list-disc list-inside pl-2">
                {chatGPTData.key_selling_points.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
            </div>
          )}

          {/* Primary Target Audience Section */}
          {chatGPTData.primary_target_audience && chatGPTData.primary_target_audience.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Target Audience:</h4>
              <ul className="list-disc list-inside pl-2">
                {chatGPTData.primary_target_audience.map((audience, index) => <li key={index}>{audience}</li>)}
              </ul>
            </div>
          )}

          {/* Other String Fields */}
          {chatGPTData.sentiment_analysis && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Sentiment:</h4>
              <p className="pl-2">{chatGPTData.sentiment_analysis}</p>
            </div>
          )}
          {chatGPTData.special_features && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Special Features:</h4>
              <p className="whitespace-pre-wrap pl-2">{chatGPTData.special_features}</p>
            </div>
          )}
          {chatGPTData.ongoing_events && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Ongoing Events:</h4>
              <p className="whitespace-pre-wrap pl-2">{chatGPTData.ongoing_events}</p>
            </div>
          )}
        </div>
      ) : (
        !isLoading && (
          <p className="text-gray-500 dark:text-gray-400 italic">
            No AI insights available yet. Click the button to generate them!
          </p>
        )
      )}
    </div>
  );
}
