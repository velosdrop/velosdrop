// src/lib/geocoding.ts
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  placeType: string[];
}

/**
 * Convert coordinates to a human-readable address using Mapbox reverse geocoding
 */
export async function reverseGeocode(
  longitude: number,
  latitude: number,
  country: string = 'ZW'
): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
      `access_token=${MAPBOX_TOKEN}` +
      `&country=${country}` +
      `&types=address,poi,neighborhood,locality` +
      `&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      // Return fallback if no address found
      return {
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude,
        placeType: []
      };
    }

    const feature = data.features[0];
    return {
      address: feature.place_name,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      placeType: feature.place_type || []
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Return fallback coordinates
    return {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      latitude,
      longitude,
      placeType: []
    };
  }
}

/**
 * Forward geocode - search for addresses by name
 */
export async function forwardGeocode(
  query: string,
  country: string = 'ZW',
  proximity?: { longitude: number; latitude: number }
): Promise<GeocodingResult[]> {
  if (!MAPBOX_TOKEN || !query || query.length < 2) {
    return [];
  }

  try {
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `access_token=${MAPBOX_TOKEN}` +
      `&types=address,place,poi,neighborhood,locality` +
      `&country=${country}` +
      `&limit=5` +
      `&language=en`;

    if (proximity) {
      url += `&proximity=${proximity.longitude},${proximity.latitude}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      address: feature.place_name,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      placeType: feature.place_type || []
    }));
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return [];
  }
}

/**
 * Get user's current location with address
 */
export async function getCurrentLocationWithAddress(): Promise<GeocodingResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        const result = await reverseGeocode(longitude, latitude);
        resolve(result);
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Format location for storage in database
 */
export function formatLocationForStorage(
  address: string,
  latitude: number,
  longitude: number
): {
  address: string;
  latitude: number;
  longitude: number;
} {
  return {
    address: address.trim(),
    latitude: parseFloat(latitude.toFixed(8)),
    longitude: parseFloat(longitude.toFixed(8))
  };
}