export interface LocationData {
  name: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  locationDisplay?: string;
  lat?: number;
  lng?: number;
  osmId?: string;
}

export interface LocationProvider {
  searchLocations(query: string): Promise<LocationData[]>;
  getCurrentLocation(): Promise<LocationData>;
  getRecentLocations(): Promise<LocationData[]>;
  saveRecentLocation(location: LocationData): Promise<void>;
}

export class GooglePlacesLocationProvider implements LocationProvider {
  async searchLocations(query: string): Promise<LocationData[]> {
    if (!query.trim() || query.trim().length < 2) return [];
    try {
      const res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data || [];
    } catch (e) {
      console.error("Location search failed:", e);
      return [];
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation not supported by browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              resolve(data);
              return;
            }
          } catch (e) {
            console.error("Reverse geocoding failed, falling back to coordinates name", e);
          }
          resolve({
            name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            lat: Number(latitude.toFixed(5)),
            lng: Number(longitude.toFixed(5)),
            locationDisplay: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  async getRecentLocations(): Promise<LocationData[]> {
    try {
      const res = await fetch("/api/location/recent");
      if (!res.ok) throw new Error("Failed to fetch recent locations");
      const data = await res.json();
      return data || [];
    } catch (e) {
      console.error("Failed to read recent locations from API", e);
      return [];
    }
  }

  async saveRecentLocation(location: LocationData): Promise<void> {
    try {
      await fetch("/api/location/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
    } catch (e) {
      console.error("Failed to save recent location to API", e);
    }
  }
}
