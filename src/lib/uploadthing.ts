import { useState } from "react";

interface UploadOptions {
  onBeforeUploadBegin?: (files: File[]) => File[] | Promise<File[]>;
  onUploadProgress?: (progress: number) => void;
  onClientUploadComplete?: (res: any[]) => void;
  onUploadError?: (error: Error) => void;
}

export function useUploadThing(
  endpoint: "avatar" | "banner" | "attachment" | "story",
  options?: UploadOptions
) {
  const [isUploading, setIsUploading] = useState(false);

  const startUpload = async (files: File[], metadata?: any) => {
    setIsUploading(true);
    try {
      let filesToUpload = files;
      if (options?.onBeforeUploadBegin) {
        const result = options.onBeforeUploadBegin(files);
        filesToUpload = result instanceof Promise ? await result : result;
      }

      const uploadedFiles = [];
      for (const file of filesToUpload) {
        // 1. Fetch pre-signed upload URL from our API route
        const presignRes = await fetch(
          `/api/upload?endpoint=${endpoint}&filename=${encodeURIComponent(
            file.name
          )}&contentType=${encodeURIComponent(file.type)}`
        );
        if (!presignRes.ok) {
          const errData = await presignRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to generate upload signature");
        }
        const { signedUrl, publicUrl, fileKey } = await presignRes.json();

        // 2. Upload file directly to Supabase Storage via XHR to track progress
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);

        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && options?.onUploadProgress) {
              const progress = Math.round((event.loaded / event.total) * 100);
              options.onUploadProgress(progress);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Direct upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error("Network error during direct upload"));
          };
        });

        xhr.send(file);
        await uploadPromise;

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          fileKey,
          type: file.type,
        });
      }

      // 3. Register the uploaded files to save DB metadata
      const registerRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint,
          files: uploadedFiles,
          metadata,
        }),
      });

      if (!registerRes.ok) {
        const errData = await registerRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register uploaded files in database");
      }

      const res = await registerRes.json();

      if (options?.onClientUploadComplete) {
        options.onClientUploadComplete(res);
      }
      return res;
    } catch (error: any) {
      if (options?.onUploadError) {
        options.onUploadError(error);
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    startUpload,
    isUploading,
  };
}
