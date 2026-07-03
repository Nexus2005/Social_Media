import { ConfigManager } from "./configManager";

export class VisionProviderManager {
  private static cooldownKeys = new Map<string, number>(); // key -> expiration timestamp

  private static getHealthyGeminiKey(): string | null {
    const keys = ConfigManager.getGeminiKeys();
    const now = Date.now();

    for (const key of keys) {
      const cooldownUntil = this.cooldownKeys.get(key) || 0;
      if (cooldownUntil <= now) {
        // Key recovered or never rate-limited
        if (cooldownUntil > 0) {
          this.cooldownKeys.delete(key);
          console.log(`[VisionProviderManager] Gemini key ending in ...${key.slice(-5)} recovered from cooldown.`);
        }
        return key;
      }
    }
    return null;
  }

  /**
   * Sends image to the healthiest available Vision provider (rotating Gemini keys -> NVIDIA fallback).
   */
  static async analyzeImage(base64Image: string, promptText: string): Promise<any> {
    const config = ConfigManager.getProviderConfig("gemini");
    const startTime = Date.now();

    // 1. Try Gemini key rotation
    let geminiKey = this.getHealthyGeminiKey();
    let attempts = 0;
    const maxAttempts = ConfigManager.getGeminiKeys().length;

    while (geminiKey && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[VisionProviderManager] Querying Gemini using key ending in ...${geminiKey.slice(-5)}`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const latency = Date.now() - startTime;
          console.log(`[VisionProviderManager] Gemini call succeeded in ${latency}ms.`);
          
          const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            return JSON.parse(textResponse.trim());
          }
          throw new Error("Empty response structure from Gemini API");
        }

        // Handle rate limits (429) or quota issues
        if (response.status === 429 || response.status === 403) {
          const errorText = await response.text();
          console.warn(`[VisionProviderManager] Gemini key rate limited/quota issue (status ${response.status}): ${errorText}`);
          // Put key on 60-second cooldown
          this.cooldownKeys.set(geminiKey, Date.now() + 60000);
        } else {
          const errorText = await response.text();
          throw new Error(`Gemini API returned code ${response.status}: ${errorText}`);
        }
      } catch (err) {
        console.error(`[VisionProviderManager] Attempt ${attempts} using Gemini key failed:`, err);
      }

      // Fetch next healthy key
      geminiKey = this.getHealthyGeminiKey();
    }

    // 2. Fallback to NVIDIA Vision
    const nvidiaConfig = ConfigManager.getProviderConfig("nvidia");
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    if (nvidiaConfig.enabled && nvidiaKey) {
      console.log("[VisionProviderManager] All Gemini keys exhausted. Falling back to NVIDIA Vision API...");
      try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.NVIDIA_VISION_MODEL || "nvidia/llama-3.2-11b-vision-instruct",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: promptText },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                  },
                ],
              },
            ],
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) {
            const cleaned = content.replace(/```json|```/g, "").trim();
            return JSON.parse(cleaned);
          }
        } else {
          const errText = await response.text();
          throw new Error(`NVIDIA Vision API responded with status ${response.status}: ${errText}`);
        }
      } catch (nvidiaErr) {
        console.error("[VisionProviderManager] NVIDIA Vision fallback failed:", nvidiaErr);
      }
    }

    throw new Error("All vision VLM providers (Gemini & NVIDIA) failed or are unconfigured.");
  }
}
