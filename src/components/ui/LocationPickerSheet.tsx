"use client";

import { useEffect, useState } from "react";
import { X, Search, MapPin, Navigation, Loader2 } from "lucide-react";
import { GooglePlacesLocationProvider, LocationData } from "@/lib/providers/locationProvider";
import { useToast } from "@/components/ui/use-toast";

interface LocationPickerSheetProps {
  onClose: () => void;
  onSelectLocation: (location: LocationData) => void;
  selectedLocationName?: string;
  onClearLocation?: () => void;
}

const locationProvider = new GooglePlacesLocationProvider();

export default function LocationPickerSheet({
  onClose,
  onSelectLocation,
  selectedLocationName,
  onClearLocation,
}: LocationPickerSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationData[]>([]);
  const [recents, setRecents] = useState<LocationData[]>([]);
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    // Read recent locations
    locationProvider.getRecentLocations().then(setRecents);
  }, []);

  // Search autocomplete debouncer
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const delay = setTimeout(async () => {
      try {
        const matches = await locationProvider.searchLocations(query);
        setResults(matches);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [query]);

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await locationProvider.getCurrentLocation();
      onSelectLocation(loc);
      await locationProvider.saveRecentLocation(loc);
      onClose();
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to access your location. Please check browser permissions.",
      });
    } finally {
      setLocating(false);
    }
  };

  const handleSelect = async (loc: LocationData) => {
    onSelectLocation(loc);
    await locationProvider.saveRecentLocation(loc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm select-none p-0 md:p-4">
      {/* Background click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet Container */}
      <div className="relative w-full md:max-w-[480px] bg-neutral-950 border border-neutral-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] overflow-hidden text-white animate-slide-up">
        {/* Header drag handle (mobile only) */}
        <div className="md:hidden flex justify-center py-2">
          <div className="w-10 h-1.5 bg-neutral-850 rounded-full" />
        </div>

        {/* Title Bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-900">
          <h3 className="text-base font-bold">Select Location</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Search & Action bar */}
        <div className="p-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search cities, neighborhoods, places..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-neutral-550 focus:border-neutral-700 transition-colors text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Navigation className="size-4 fill-white" />
              )}
              <span>Current Location</span>
            </button>

            {selectedLocationName && onClearLocation && (
              <button
                onClick={() => {
                  onClearLocation();
                  onClose();
                }}
                className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all"
              >
                Clear Location
              </button>
            )}
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-none">
          {searching ? (
            <div className="flex items-center justify-center py-10 text-neutral-500">
              <Loader2 className="size-6 animate-spin text-neutral-500 mr-2" />
              <span className="text-xs font-semibold">Searching places...</span>
            </div>
          ) : query.trim() !== "" ? (
            // Search Results
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 mb-1">Search Results</span>
              {results.length === 0 ? (
                <div className="text-center py-6 text-sm text-neutral-500">No places found</div>
              ) : (
                results.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(loc)}
                    className="flex items-start gap-3 w-full p-3 hover:bg-neutral-900 rounded-2xl text-left transition-colors"
                  >
                    <MapPin className="size-5 text-neutral-450 shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate">{loc.name}</span>
                      {loc.description && (
                        <span className="text-xs text-neutral-500 truncate mt-0.5">{loc.description}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            // Recent Locations
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 mb-1">Recent Locations</span>
              {recents.length === 0 ? (
                <div className="py-6 px-2 text-xs text-neutral-550 italic">No recent locations searched. Places you select will appear here.</div>
              ) : (
                recents.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(loc)}
                    className="flex items-center gap-3 w-full p-3 hover:bg-neutral-900 rounded-2xl text-left transition-colors"
                  >
                    <MapPin className="size-4 text-neutral-500 shrink-0" />
                    <span className="text-sm font-semibold truncate">{loc.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
