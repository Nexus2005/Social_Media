export interface ProviderConfig {
  name: string;
  enabled: boolean;
  timeoutMs: number;
  retryLimit: number;
}

export class ConfigManager {
  private static geminiKeys: string[] = [];
  private static groqKeys: string[] = [];

  static initialize() {
    this.geminiKeys = [];
    this.groqKeys = [];

    // 1. Discover Gemini keys automatically
    if (process.env.GEMINI_API_KEY) {
      this.geminiKeys.push(process.env.GEMINI_API_KEY);
    }
    for (let i = 1; i <= 20; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key && !this.geminiKeys.includes(key)) {
        this.geminiKeys.push(key);
      }
    }

    // 2. Discover Groq keys automatically
    if (process.env.GROQ_API_KEY) {
      this.groqKeys.push(process.env.GROQ_API_KEY);
    }
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GROQ_API_KEY_${i}`];
      if (key && !this.groqKeys.includes(key)) {
        this.groqKeys.push(key);
      }
    }
  }

  static getGeminiKeys(): string[] {
    if (this.geminiKeys.length === 0) {
      this.initialize();
    }
    return this.geminiKeys;
  }

  static getGroqKeys(): string[] {
    if (this.groqKeys.length === 0) {
      this.initialize();
    }
    return this.groqKeys;
  }

  static getProviderConfig(providerName: string): ProviderConfig {
    const defaultConfigs: Record<string, ProviderConfig> = {
      gemini: {
        name: "gemini",
        enabled: true,
        timeoutMs: 8000,
        retryLimit: 2,
      },
      nvidia: {
        name: "nvidia",
        enabled: !!process.env.NVIDIA_API_KEY,
        timeoutMs: 10000,
        retryLimit: 2,
      },
      groq: {
        name: "groq",
        enabled: true,
        timeoutMs: 6000,
        retryLimit: 2,
      },
      mistral: {
        name: "mistral",
        enabled: !!process.env.MISTRAL_API_KEY,
        timeoutMs: 8000,
        retryLimit: 2,
      },
      cohere: {
        name: "cohere",
        enabled: !!process.env.COHERE_API_KEY,
        timeoutMs: 8000,
        retryLimit: 2,
      },
    };

    return defaultConfigs[providerName.toLowerCase()] || {
      name: providerName,
      enabled: false,
      timeoutMs: 5000,
      retryLimit: 1,
    };
  }
}
