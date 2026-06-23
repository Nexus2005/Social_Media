"use client";

export interface DraftMessage {
  conversationId: string;
  userId: string;
  draftText: string;
  attachments: any[];
  updatedAt: number;
}

class DraftStorageProvider {
  private dbName = "cartly-chat-drafts";
  private storeName = "drafts";
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return null;
    }
    if (this.db) {
      return this.db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "conversationId" });
        }
      };
      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      request.onerror = (e) => {
        reject((e.target as IDBOpenDBRequest).error);
      };
    });
  }

  public async getDraft(conversationId: string): Promise<DraftMessage | null> {
    try {
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(conversationId);
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error("IndexedDB getDraft failed:", e);
      return null;
    }
  }

  public async saveDraft(
    conversationId: string,
    userId: string,
    draftText: string,
    attachments: any[] = []
  ): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const data: DraftMessage = {
          conversationId,
          userId,
          draftText,
          attachments,
          updatedAt: Date.now(),
        };
        const request = store.put(data);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error("IndexedDB saveDraft failed:", e);
    }
  }

  public async deleteDraft(conversationId: string): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(conversationId);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error("IndexedDB deleteDraft failed:", e);
    }
  }
}

export const draftStorage = new DraftStorageProvider();
