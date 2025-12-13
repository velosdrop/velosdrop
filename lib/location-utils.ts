// /lib/location-utils.ts

// Real Zimbabwean provinces and major towns/districts (Based on common administrative divisions)
const ZIMBABWE_LOCATIONS = [
    // Harare Metropolitan Province
    { name: "Harare", type: "city", bounds: { minLat: -17.9, maxLat: -17.7, minLon: 30.9, maxLon: 31.2 } },
    { name: "Chitungwiza", type: "town", bounds: { minLat: -18.0, maxLat: -17.95, minLon: 31.0, maxLon: 31.1 } },
    { name: "Epworth", type: "suburb", bounds: { minLat: -17.95, maxLat: -17.85, minLon: 31.12, maxLon: 31.17 } },

    // Bulawayo Metropolitan Province
    { name: "Bulawayo", type: "city", bounds: { minLat: -20.2, maxLat: -20.1, minLon: 28.5, maxLon: 28.7 } },

    // Mashonaland Provinces
    { name: "Bindura", type: "town", bounds: { minLat: -17.4, maxLat: -17.2, minLon: 31.3, maxLon: 31.4 } }, // Mash Central
    { name: "Marondera", type: "town", bounds: { minLat: -18.25, maxLat: -18.15, minLon: 31.4, maxLon: 31.6 } }, // Mash East
    { name: "Chinhoyi", type: "town", bounds: { minLat: -17.4, maxLat: -17.3, minLon: 30.1, maxLon: 30.2 } }, // Mash West

    // Manicaland Province
    { name: "Mutare", type: "city", bounds: { minLat: -18.9, maxLat: -18.95, minLon: 32.6, maxLon: 32.7 } },
    { name: "Nyanga", type: "district", bounds: { minLat: -18.3, maxLat: -18.1, minLon: 32.7, maxLon: 32.9 } },

    // Masvingo Province
    { name: "Masvingo", type: "city", bounds: { minLat: -20.1, maxLat: -20.0, minLon: 30.8, maxLon: 30.9 } },

    // Matabeleland Provinces
    { name: "Victoria Falls", type: "town", bounds: { minLat: -18.0, maxLat: -17.9, minLon: 25.8, maxLon: 25.9 } }, // Mat North
    { name: "Hwange", type: "town", bounds: { minLat: -18.4, maxLat: -18.3, minLon: 26.5, maxLon: 26.6 } }, // Mat North
    { name: "Gwanda", type: "town", bounds: { minLat: -21.0, maxLat: -20.9, minLon: 29.0, maxLon: 29.1 } }, // Mat South
    { name: "Beitbridge", type: "town", bounds: { minLat: -22.3, maxLat: -22.2, minLon: 30.0, maxLon: 30.1 } }, // Mat South

    // Midlands Province
    { name: "Gweru", type: "city", bounds: { minLat: -19.5, maxLat: -19.4, minLon: 29.8, maxLon: 29.9 } },
    { name: "Kwekwe", type: "town", bounds: { minLat: -18.95, maxLat: -18.85, minLon: 29.8, maxLon: 29.9 } },
    { name: "Zvishavane", type: "town", bounds: { minLat: -20.35, maxLat: -20.25, minLon: 30.0, maxLon: 30.1 } },
];

// Province boundaries for broader classification (simplified rectangles)
const ZIMBABWE_PROVINCES = [
    { name: "Harare Province", bounds: { minLat: -18.0, maxLat: -17.6, minLon: 30.8, maxLon: 31.3 } },
    { name: "Bulawayo Province", bounds: { minLat: -20.3, maxLat: -20.0, minLon: 28.4, maxLon: 28.8 } },
    { name: "Manicaland", bounds: { minLat: -20.5, maxLat: -17.5, minLon: 32.0, maxLon: 33.5 } },
    { name: "Mashonaland Central", bounds: { minLat: -17.8, maxLat: -15.5, minLon: 30.5, maxLon: 31.8 } },
    { name: "Mashonaland East", bounds: { minLat: -19.0, maxLat: -17.5, minLon: 31.2, maxLon: 32.5 } },
    { name: "Mashonaland West", bounds: { minLat: -18.5, maxLat: -16.0, minLon: 29.0, maxLon: 31.0 } },
    { name: "Masvingo Province", bounds: { minLat: -22.0, maxLat: -19.0, minLon: 30.0, maxLon: 32.5 } },
    { name: "Matabeleland North", bounds: { minLat: -22.0, maxLat: -17.0, minLon: 25.5, maxLon: 29.0 } },
    { name: "Matabeleland South", bounds: { minLat: -22.5, maxLat: -20.5, minLon: 27.5, maxLon: 30.5 } },
    { name: "Midlands Province", bounds: { minLat: -21.5, maxLat: -18.5, minLon: 29.0, maxLon: 31.0 } },
];

/**
 * Main function to get a dynamic, real location name for coordinates.
 * Checks specific towns first, then falls back to province.
 */
export async function getGeneralAreaFromCoordinates(latitude: number, longitude: number): Promise<string> {
    // 1. First, try to find a specific town/area
    for (const location of ZIMBABWE_LOCATIONS) {
        if (isWithinBounds(latitude, longitude, location.bounds)) {
            return `${location.name} Area`; // e.g., "Mutare Area"
        }
    }

    // 2. If no specific town, find the province
    for (const province of ZIMBABWE_PROVINCES) {
        if (isWithinBounds(latitude, longitude, province.bounds)) {
            return `${province.name}`; // e.g., "Manicaland"
        }
    }

    // 3. Ultimate fallback: approximate zone based on lat/lon grid (still Zimbabwean context)
    return getApproximateZone(latitude, longitude);
}

/**
 * Helper to check if coordinates are within rectangular bounds.
 */
function isWithinBounds(lat: number, lon: number, bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }): boolean {
    return lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
}

/**
 * Final fallback: generates a descriptive area based on lat/lon quadrants in Zimbabwe.
 */
function getApproximateZone(lat: number, lon: number): string {
    // Zimbabwe's rough geographic center and extents
    const centralLat = -19.0;
    const centralLon = 29.0;

    const latZone = lat < centralLat ? "Southern" : "Northern";
    const lonZone = lon < centralLon ? "Western" : "Eastern";

    // Combine for a general area description
    return `${latZone} ${lonZone} Region`;
}

// Optional: Cache results to avoid unnecessary computation (useful for repeated calls)
const areaCache = new Map<string, string>();
export function getCachedAreaName(latitude: number, longitude: number): string | null {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    return areaCache.get(key) || null;
}
export function cacheAreaName(latitude: number, longitude: number, areaName: string): void {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    areaCache.set(key, areaName);
}