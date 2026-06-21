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

export interface ExtractedFrame {
  path: string;
  timestamp: number;
}

// Extract exactly 6 static JPG frames matching target percentages (10%, 25%, 40%, 55%, 70%, 85%)
export async function extractFramesFromVideo(videoPath: string): Promise<ExtractedFrame[]> {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const duration = await getVideoDuration(videoPath);
  console.log(`Video duration: ${duration}s. Extracting 6 evenly spaced frames.`);

  const percentages = [0.10, 0.25, 0.40, 0.55, 0.70, 0.85];
  const frames: ExtractedFrame[] = percentages.map((p) => {
    const timestamp = parseFloat((duration * p).toFixed(2));
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const filename = `frame-${timestamp}-${baseName}.jpg`;
    return {
      path: path.join(tmpDir, filename),
      timestamp,
    };
  });

  return new Promise((resolve, reject) => {
    const baseName = path.basename(videoPath, path.extname(videoPath));
    ffmpeg(videoPath)
      .on("end", () => {
        console.log(`Extracted ${frames.length} frames successfully.`);
        resolve(frames);
      })
      .on("error", (err) => {
        console.error("FFmpeg extraction error:", err);
        reject(err);
      })
      .screenshots({
        timestamps: frames.map((f) => f.timestamp),
        filename: `frame-%s-${baseName}.jpg`,
        folder: tmpDir,
      });
  });
}
