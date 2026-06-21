export interface LocationData {
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export interface LocationProvider {
  searchLocations(query: string): Promise<LocationData[]>;
  getCurrentLocation(): Promise<LocationData>;
  getRecentLocations(): LocationData[];
  saveRecentLocation(location: LocationData): void;
}

export class GooglePlacesLocationProvider implements LocationProvider {
  async searchLocations(query: string): Promise<LocationData[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data || [];
    } catch (e) {
      console.error("Location search failed, falling back to mock search:", e);
      // Fallback mocks
      const mockPlaces = [
        "Nashik, Maharashtra, India",
        "Mumbai, Maharashtra, India",
        "Pune, Maharashtra, India",
        "Delhi, India",
        "London, UK",
        "San Francisco, CA",
        "New York, NY",
        "Tokyo, Japan",
        "Paris, France",
        "Berlin, Germany",
        "Sydney, Australia",
      ];
      return mockPlaces
        .filter((p) => p.toLowerCase().includes(query.toLowerCase()))
        .map((p) => ({ name: p, description: p }));
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported by browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Geocode using server-side endpoint
            const res = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.name) {
                resolve({ name: data.name, lat: latitude, lng: longitude });
                return;
              }
            }
          } catch (e) {
            console.error("Reverse geocoding failed, using coordinates", e);
          }
          resolve({
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  getRecentLocations(): LocationData[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("cartly_recent_locations");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to read recent locations", e);
      return [];
    }
  }

  saveRecentLocation(location: LocationData): void {
    if (typeof window === "undefined") return;
    try {
      const recents = this.getRecentLocations();
      const filtered = recents.filter((r) => r.name !== location.name);
      const updated = [location, ...filtered].slice(0, 5); // Cache last 5 items
      localStorage.setItem("cartly_recent_locations", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent location", e);
    }
  }
}
