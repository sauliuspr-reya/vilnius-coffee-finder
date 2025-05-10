'use client';

import { useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
} from '@vis.gl/react-google-maps';
import { CoffeePlace } from '@/lib/supabase'; // Assuming this type includes location { lat, lng }
import Link from 'next/link';

interface CoffeeMapProps {
  places: CoffeePlace[];
  apiKey: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
}

const VILNIUS_CENTER = { lat: 54.6872, lng: 25.2797 };

export default function CoffeeMap({ 
  places, 
  apiKey,
  initialCenter = VILNIUS_CENTER,
  initialZoom = 12
}: CoffeeMapProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  if (!apiKey) {
    return (
      <div className="p-4 text-center bg-red-100 border border-red-400 text-red-700 rounded-md">
        Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API in your .env.local file.
      </div>
    );
  }

  const selectedPlace = places.find(p => p.id === selectedPlaceId);

  return (
    <APIProvider apiKey={apiKey}>
      <div style={{ height: '500px', width: '100%', marginBottom: '2rem', borderRadius: '8px', overflow: 'hidden' }}>
        <Map
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'vilniusCoffeeMap'}
        >
          {places.map((place) => (
            <AdvancedMarker
              key={place.id}
              position={{ lat: place.location.lat, lng: place.location.lng }}
              onClick={() => setSelectedPlaceId(place.id)}
            >
              <Pin /* background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} */ />
            </AdvancedMarker>
          ))}

          {selectedPlace && (
            <InfoWindow
              position={{ lat: selectedPlace.location.lat, lng: selectedPlace.location.lng }}
              pixelOffset={[0, -30]} // Adjust as needed
              onCloseClick={() => setSelectedPlaceId(null)}
            >
              <div style={{ padding: '10px', maxWidth: '200px' }}>
                <h3 style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{selectedPlace.name}</h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.9em' }}>{selectedPlace.address}</p>
                <Link href={`/place/${selectedPlace.id}`} style={{ color: '#007bff', textDecoration: 'none' }}>
                  View details
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
