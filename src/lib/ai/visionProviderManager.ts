import { ConfigManager } from "./configManager";

export class VisionProviderManager {
  private static cooldownKeys = new Map<string, number>(); // key -> expiration timestamp
  private static currentKeyIndex = 0;

  private static getHealthyGeminiKey(excludeKeys: Set<string>): string | null {
    const keys = ConfigManager.getGeminiKeys();
    const now = Date.now();
    const len = keys.length;

    if (len === 0) return null;

    for (let i = 0; i < len; i++) {
      const idx = (this.currentKeyIndex + i) % len;
      const key = keys[idx];

      if (excludeKeys.has(key)) {
        continue;
      }

      const cooldownUntil = this.cooldownKeys.get(key) || 0;
      if (cooldownUntil <= now) {
        if (cooldownUntil > 0) {
          this.cooldownKeys.delete(key);
          console.log(`[VisionProviderManager] Gemini key ending in ...${key.slice(-5)} recovered from cooldown.`);
        }
        // Save the index for next round-robin selection to advance
        this.currentKeyIndex = (idx + 1) % len;
        return key;
      }
    }
    return null;
  }

  static async analyzeImages(base64Images: string[], promptText: string): Promise<any> {
    const startTime = Date.now();
    if (base64Images.length === 0) {
      throw new Error("No images provided to analyzeImages");
    }

    const usedKeys = new Set<string>();
    let geminiKey = this.getHealthyGeminiKey(usedKeys);
    let attempts = 0;
    const maxAttempts = ConfigManager.getGeminiKeys().length;

    while (geminiKey && attempts < maxAttempts) {
      attempts++;
      usedKeys.add(geminiKey);
      try {
        console.log(`[VisionProviderManager] Querying Gemini (Multi-Image) using key ending in ...${geminiKey.slice(-5)} (Attempt ${attempts}/${maxAttempts})`);
        
        const parts: any[] = [
          { text: promptText },
          ...base64Images.map(img => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: img,
            },
          })),
        ];

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts,
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
          console.log(`[VisionProviderManager] Gemini Multi-Image call succeeded in ${latency}ms.`);
          
          const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            return JSON.parse(textResponse.trim());
          }
          throw new Error("Empty response structure from Gemini API");
        }

        if (response.status === 429 || response.status === 403) {
          const errorText = await response.text();
          console.warn(`[VisionProviderManager] Gemini key rate limited/quota issue (status ${response.status}): ${errorText}`);
          this.cooldownKeys.set(geminiKey, Date.now() + 60000);
        } else if (response.status === 503) {
          console.warn(`[VisionProviderManager] Gemini server overloaded (status 503). Proceeding to rotate immediately.`);
        } else {
          const errorText = await response.text();
          console.warn(`[VisionProviderManager] Gemini request failed with status ${response.status}: ${errorText}`);
          this.cooldownKeys.set(geminiKey, Date.now() + 15000);
        }
      } catch (err) {
        console.error(`[VisionProviderManager] Network/Unexpected error with Gemini key:`, err);
        this.cooldownKeys.set(geminiKey, Date.now() + 15000);
      }

      geminiKey = this.getHealthyGeminiKey(usedKeys);
    }

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
                  ...base64Images.map(img => ({
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${img}` },
                  })),
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

    return await this.analyzeImage(base64Images[0], promptText);
  }

  /**
   * Sends image to the healthiest available Vision provider (rotating Gemini keys -> NVIDIA fallback).
   */
  static async analyzeImage(base64Image: string, promptText: string): Promise<any> {
    const config = ConfigManager.getProviderConfig("gemini");
    const startTime = Date.now();

    // 1. Try Gemini key rotation
    const usedKeys = new Set<string>();
    let geminiKey = this.getHealthyGeminiKey(usedKeys);
    let attempts = 0;
    const maxAttempts = ConfigManager.getGeminiKeys().length;

    while (geminiKey && attempts < maxAttempts) {
      attempts++;
      usedKeys.add(geminiKey);
      try {
        console.log(`[VisionProviderManager] Querying Gemini using key ending in ...${geminiKey.slice(-5)} (Attempt ${attempts}/${maxAttempts})`);
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

        // Handle rate limits (429) or quota issues vs server overloads (503)
        if (response.status === 429 || response.status === 403) {
          const errorText = await response.text();
          console.warn(`[VisionProviderManager] Gemini key rate limited/quota issue (status ${response.status}): ${errorText}`);
          // Put key on a strict 60-second cooldown block
          this.cooldownKeys.set(geminiKey, Date.now() + 60000);
        } else if (response.status === 503) {
          console.warn(`[VisionProviderManager] Gemini server overloaded (status 503). Proceeding to rotate immediately.`);
          // Do not cooldown, just let it loop and rotate keys immediately
        } else {
          const errorText = await response.text();
          console.warn(`[VisionProviderManager] Gemini request failed with status ${response.status}: ${errorText}`);
          // Put key on a brief 15-second cooldown block
          this.cooldownKeys.set(geminiKey, Date.now() + 15000);
        }
      } catch (err) {
        console.error(`[VisionProviderManager] Network/Unexpected error with Gemini key:`, err);
        // Put key on a brief 15-second cooldown block
        this.cooldownKeys.set(geminiKey, Date.now() + 15000);
      }

      // Fetch next healthy, unused key
      geminiKey = this.getHealthyGeminiKey(usedKeys);
    }

    // 2. Fallback to NVIDIA Vision
    const nvidiaConfig = ConfigManager.getProviderConfig("nvidia");
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    if (nvidiaConfig.enabled && nvidiaKey) {
      console.log("[VisionProviderManager] All Gemini keys exhausted or overloaded. Falling back to NVIDIA Vision API...");
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
