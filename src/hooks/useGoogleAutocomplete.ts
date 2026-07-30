import { useEffect, useState, useRef } from "react";

export interface Prediction {
  description: string;
  placeId: string;
}

export function useGoogleAutocomplete() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const autocompleteServiceRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    console.log("PLG Address Autocomplete: VITE_GOOGLE_MAPS_API_KEY detected =", !!apiKey);
    if (!apiKey) return;

    if (window.google?.maps?.places) {
      setIsLoaded(true);
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      return;
    }

    const callbackName = "initGoogleMapsCallback";
    (window as any)[callbackName] = () => {
      setIsLoaded(true);
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      console.error("Google Maps API script failed to load. Check VITE_GOOGLE_MAPS_API_KEY value or connectivity:", err);
    };
    document.head.appendChild(script);

    return () => {
      // Clean up callback
      delete (window as any)[callbackName];
    };
  }, [apiKey]);

  const getPredictions = (input: string) => {
    if (!isLoaded || !autocompleteServiceRef.current || !input.trim()) {
      return;
    }

    // Skip URLs
    if (input.toLowerCase().startsWith("http://") || input.toLowerCase().startsWith("https://")) {
      setPredictions([]);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: "us" },
        types: ["address"],
      },
      (results: any, status: any) => {
        if (status === "OK" && results) {
          setPredictions(
            results.map((r: any) => ({
              description: r.description,
              placeId: r.place_id,
            }))
          );
        } else {
          if (status !== "ZERO_RESULTS") {
            console.warn(`Google Places prediction warning/status: ${status}`);
          }
          setPredictions([]);
        }
      }
    );
  };

  const clearPredictions = () => {
    setPredictions([]);
  };

  const refreshSessionToken = () => {
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  };

  return {
    isLoaded,
    predictions,
    getPredictions,
    clearPredictions,
    refreshSessionToken,
  };
}
