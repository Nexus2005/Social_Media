/**
 * EncryptionService
 * Placeholder service for End-to-End Encryption (E2EE) mapping the future V2 rollout.
 * Currently disabled for V1, passing through raw strings.
 */
export const EncryptionService = {
  /**
   * Encrypts plain text message using a shared key.
   * Currently a pass-through in V1.
   */
  async encryptMessage(text: string, key: string): Promise<string> {
    // V2: Implement AES-GCM encryption
    return text;
  },

  /**
   * Decrypts encrypted cipher text using a shared key.
   * Currently a pass-through in V1.
   */
  async decryptMessage(cipher: string, key: string): Promise<string> {
    // V2: Implement AES-GCM decryption
    return cipher;
  },

  /**
   * Generates public/private key pair for a conversation member.
   * Currently returns dummy strings in V1.
   */
  async generateConversationKeys(): Promise<{ publicKey: string; privateKey: string }> {
    // V2: Implement Web Crypto API ECDH key pair generation
    return {
      publicKey: "v1-placeholder-public-key",
      privateKey: "v1-placeholder-private-key",
    };
  },

  /**
   * Rotates conversation keys.
   * Currently a no-op in V1.
   */
  async rotateKeys(): Promise<void> {
    // V2: Implement key rotation logic
    return;
  }
};
