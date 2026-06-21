export interface GifData {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

export interface GifProvider {
  search(query: string, page: number, type?: "gifs" | "stickers"): Promise<GifData[]>;
  trending(page: number, type?: "gifs" | "stickers"): Promise<GifData[]>;
  categories(): Promise<string[]>;
}

export class GiphyGifProvider implements GifProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, page: number, type: "gifs" | "stickers" = "gifs"): Promise<GifData[]> {
    if (!this.apiKey) return [];
    const limit = 30;
    const offset = page * limit;
    const isSticker = type === "stickers";
    const endpoint = isSticker ? "stickers" : "gifs";
    
    const url = `https://api.giphy.com/v1/${endpoint}/search?api_key=${this.apiKey}&q=${encodeURIComponent(
      query
    )}&limit=${limit}&offset=${offset}&rating=g`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Giphy search request failed");
      const json = await res.json();
      return this.mapGiphyResults(json.data || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async trending(page: number, type: "gifs" | "stickers" = "gifs"): Promise<GifData[]> {
    if (!this.apiKey) return [];
    const limit = 30;
    const offset = page * limit;
    const isSticker = type === "stickers";
    const endpoint = isSticker ? "stickers" : "gifs";

    const url = `https://api.giphy.com/v1/${endpoint}/trending?api_key=${this.apiKey}&limit=${limit}&offset=${offset}&rating=g`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Giphy trending request failed");
      const json = await res.json();
      return this.mapGiphyResults(json.data || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async categories(): Promise<string[]> {
    return ["Trending", "Reaction", "Action", "Stickers", "Funny", "Excited", "Sad", "Love"];
  }

  private mapGiphyResults(data: any[]): GifData[] {
    return data.map((item) => {
      const url = item.images?.downsized?.url || item.images?.original?.url || "";
      const previewUrl = item.images?.fixed_width_small?.url || url;
      return {
        id: item.id || Math.random().toString(),
        title: item.title || "Giphy Image",
        url,
        previewUrl,
      };
    });
  }
}

export class TenorGifProvider implements GifProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, page: number, type: "gifs" | "stickers" = "gifs"): Promise<GifData[]> {
    // Tenor fallback to search API (Tenor V2 API endpoint reference)
    if (!this.apiKey) return [];
    const limit = 30;
    const pos = page * limit;
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
      query
    )}&key=${this.apiKey}&client_key=cartly&limit=${limit}&pos=${pos}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Tenor search request failed");
      const json = await res.json();
      return this.mapTenorResults(json.results || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async trending(page: number, type: "gifs" | "stickers" = "gifs"): Promise<GifData[]> {
    if (!this.apiKey) return [];
    const limit = 30;
    const pos = page * limit;
    const url = `https://tenor.googleapis.com/v2/featured?key=${this.apiKey}&client_key=cartly&limit=${limit}&pos=${pos}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Tenor featured request failed");
      const json = await res.json();
      return this.mapTenorResults(json.results || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async categories(): Promise<string[]> {
    return ["Trending", "Reaction", "Love", "Happy", "Sad", "Sarcastic", "Laughing"];
  }

  private mapTenorResults(results: any[]): GifData[] {
    return results.map((item) => {
      // Tenor media formats: gif format is downsized, tinygif is fast preview
      const media = item.media_formats || {};
      const url = media.gif?.url || media.mediumgif?.url || "";
      const previewUrl = media.tinygif?.url || url;
      return {
        id: item.id || Math.random().toString(),
        title: item.title || "Tenor Image",
        url,
        previewUrl,
      };
    });
  }
}

export class FallbackGifProvider implements GifProvider {
  private tenor: TenorGifProvider;
  private giphy: GiphyGifProvider;

  constructor(tenorKey: string, giphyKey: string) {
    this.tenor = new TenorGifProvider(tenorKey);
    this.giphy = new GiphyGifProvider(giphyKey);
  }

  async search(query: string, page: number, type: "gifs" | "stickers" = "gifs"): Promise<GifData[]> {
    // Attempt Tenor, fall back to Giphy
    try {
      if (!this.tenor["apiKey"]) throw new Error("Tenor API key is empty");
      const results = await this.tenor.search(query, page, type);
      if (results && results.length > 0) return results;
      throw new Error("Empty results from Tenor");
    } catch (e) {
      console.warn("Tenor GIF search failed, falling back to Giphy:", e);
      return this.giphy.search(query, page, type);
    }
  }

  async trending(page: number, type: "gifs" | "stickers" = "gifs"): Promise<GifData[]> {
    try {
      if (!this.tenor["apiKey"]) throw new Error("Tenor API key is empty");
      const results = await this.tenor.trending(page, type);
      if (results && results.length > 0) return results;
      throw new Error("Empty results from Tenor");
    } catch (e) {
      console.warn("Tenor GIF trending failed, falling back to Giphy:", e);
      return this.giphy.trending(page, type);
    }
  }

  async categories(): Promise<string[]> {
    return this.giphy.categories();
  }
}
