"use client";

function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= 2 * 1024 * 1024 || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(file);
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      
      // Retry for transient codes (503 Service Unavailable, 504 Gateway Timeout, 429 Too Many Requests)
      if (res.status === 503 || res.status === 504 || res.status === 429) {
        if (i === retries - 1) return res;
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Upload failed after retries");
}

export class UploadService {
  /**
   * Upload post attachments (e.g. photos/videos) with image compression and retry checks
   */
  static async uploadPostAttachment(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ mediaId: string; url: string }> {
    const processedFile = await compressImage(file);
    const formData = new FormData();
    formData.append("endpoint", "attachment");
    formData.append("files", processedFile);

    // Get dimensions if possible
    const dims = await this.getMediaDimensions(processedFile);
    if (dims) {
      formData.append(
        "metadata",
        JSON.stringify([
          {
            name: processedFile.name,
            width: dims.width,
            height: dims.height,
          },
        ])
      );
    }

    const res = await fetchWithRetry("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data[0]) {
      throw new Error("Invalid response structure from upload handler");
    }

    if (onProgress) onProgress(100);

    return {
      mediaId: data[0].serverData.mediaId,
      url: data[0].url,
    };
  }

  /**
   * Upload story files with retry checks
   */
  static async uploadStoryAttachment(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ storyId: string; url: string }> {
    const formData = new FormData();
    formData.append("endpoint", "story");
    formData.append("files", file);

    const res = await fetchWithRetry("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Story upload failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data[0]) {
      throw new Error("Invalid response from story upload");
    }

    if (onProgress) onProgress(100);

    return {
      storyId: data[0].serverData.storyId,
      url: data[0].url,
    };
  }

  /**
   * Registers a built-in background URL into the database Media table directly
   */
  static async uploadSystemBackground(bgUrl: string): Promise<{ mediaId: string; url: string }> {
    const formData = new FormData();
    formData.append("endpoint", "system-bg");
    formData.append("bgUrl", bgUrl);

    const res = await fetchWithRetry("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "System background registration failed");
    }

    const data = await res.json();
    if (!data || !data[0]) {
      throw new Error("Invalid response for background registration");
    }

    return {
      mediaId: data[0].serverData.mediaId,
      url: data[0].url,
    };
  }

  private static getMediaDimensions(
    file: File
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(null);
        return;
      }
      if (file.type.startsWith("image/")) {
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => resolve(null);
      } else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    });
  }
}
