import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

// Utility to get video duration using ffprobe
export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata.format?.duration;
      resolve(duration || 0);
    });
  });
}

// Extract static JPG frames every 2 seconds
export async function extractFramesFromVideo(videoPath: string): Promise<string[]> {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const duration = await getVideoDuration(videoPath);
  console.log(`Video duration: ${duration}s. Extracting frames every 2s.`);

  const timestamps: number[] = [];
  for (let t = 0; t < duration; t += 2) {
    timestamps.push(t);
  }

  // Ensure we get at least one frame
  if (timestamps.length === 0) {
    timestamps.push(0);
  }

  return new Promise((resolve, reject) => {
    const fileNames: string[] = [];
    const baseName = path.basename(videoPath, path.extname(videoPath));

    ffmpeg(videoPath)
      .on("filenames", (filenames) => {
        filenames.forEach((file) => {
          fileNames.push(path.join(tmpDir, file));
        });
      })
      .on("end", () => {
        console.log(`Extracted ${fileNames.length} frames successfully.`);
        resolve(fileNames);
      })
      .on("error", (err) => {
        console.error("FFmpeg extraction error:", err);
        reject(err);
      })
      .screenshots({
        timestamps,
        filename: `frame-%s-${baseName}.jpg`,
        folder: tmpDir,
      });
  });
}
