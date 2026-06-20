import { useState } from "react";

interface UploadOptions {
  onBeforeUploadBegin?: (files: File[]) => File[] | Promise<File[]>;
  onUploadProgress?: (progress: number) => void;
  onClientUploadComplete?: (res: any[]) => void;
  onUploadError?: (error: Error) => void;
}

export function useUploadThing(
  endpoint: "avatar" | "attachment" | "story",
  options?: UploadOptions
) {
  const [isUploading, setIsUploading] = useState(false);

  const startUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      let filesToUpload = files;
      if (options?.onBeforeUploadBegin) {
        const result = options.onBeforeUploadBegin(files);
        filesToUpload = result instanceof Promise ? await result : result;
      }

      const formData = new FormData();
      formData.append("endpoint", endpoint);
      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      const promise = new Promise<any[]>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && options?.onUploadProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            options.onUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch (err) {
              reject(new Error("Failed to parse response"));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error"));
        };
      });

      xhr.send(formData);
      const res = await promise;

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
