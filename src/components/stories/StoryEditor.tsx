"use client";

import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { X, Text as TextIcon, Smile, Sparkles, Brush, Scissors, ChevronLeft, Check, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import GifPicker from "./GifPicker";
import EmojiPickerPanel from "./EmojiPickerPanel";

// Crop image helper utility
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (error) => reject(error));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
}

interface StoryEditorProps {
  file: File;
  onClose: () => void;
  onComplete: (file: File) => void;
}

export default function StoryEditor({ file, onClose, onComplete }: StoryEditorProps) {
  const isVideo = file.type.startsWith("video/");
  
  // Image crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropStep, setIsCropStep] = useState(!isVideo); // Direct editor for videos
  const [editedImageSrc, setEditedImageSrc] = useState<string | null>(null);

  // Editor states
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeColor, setActiveColor] = useState("#ffffff");
  const [brushWidth, setBrushWidth] = useState(8);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Video trimming states
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const colors = [
    "#ffffff", "#000000", "#ef4444", "#f97316", 
    "#eab308", "#22c55e", "#06b6d4", "#3b82f6", 
    "#a855f7", "#ec4899"
  ];

  // Initialize cropped image source
  useEffect(() => {
    if (!isVideo) {
      const src = URL.createObjectURL(file);
      setEditedImageSrc(src);
      return () => URL.revokeObjectURL(src);
    }
  }, [file, isVideo]);

  // Initialize Fabric canvas for cropped images
  useEffect(() => {
    if (isCropStep || isVideo || !editedImageSrc || !canvasRef.current) return;

    let active = true;
    let fabricInstance: any;

    const initFabric = async () => {
      const fabric = await import("fabric");
      if (!active) return;

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const canvas = new fabric.Canvas(canvasEl, {
        width: 1080,
        height: 1920,
        backgroundColor: "#000000",
      });

      fabricCanvasRef.current = canvas;
      fabricInstance = canvas;

      // Load background image
      fabric.FabricImage.fromURL(editedImageSrc).then((img) => {
        if (!active) return;

        // Calculate aspect ratios to fit
        const scaleX = 1080 / img.width!;
        const scaleY = 1920 / img.height!;
        const scale = Math.max(scaleX, scaleY);

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: (1080 - img.width! * scale) / 2,
          top: (1920 - img.height! * scale) / 2,
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = img;
        canvas.renderAll();
      });

      // Responsive sizing mapping
      const resizeCanvas = () => {
        if (!containerRef.current || !canvas) return;
        const containerWidth = containerRef.current.clientWidth;
        const scale = containerWidth / 1080;
        canvas.setZoom(scale);
        canvas.setDimensions({
          width: containerWidth,
          height: containerWidth * (16 / 9),
        });
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    };

    initFabric();

    return () => {
      active = false;
      if (fabricInstance) {
        fabricInstance.dispose();
      }
    };
  }, [isCropStep, isVideo, editedImageSrc]);

  // Video duration configuration and clamping
  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setStartTime(0);
      setEndTime(Math.min(duration, 15));
    }
  };

  // Video looping listener
  useEffect(() => {
    if (!isVideo) return;
    
    const video = videoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
        if (videoPlaying) {
          video.play().catch(console.error);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVideo, startTime, endTime, videoPlaying]);

  // Crop image complete callback
  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Complete crop step and load editor
  const applyCrop = async () => {
    if (!editedImageSrc || !croppedAreaPixels) return;
    try {
      setIsSaving(true);
      const croppedBlob = await getCroppedImg(editedImageSrc, croppedAreaPixels);
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setEditedImageSrc(croppedUrl);
      setIsCropStep(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Add text layer
  const addText = async () => {
    if (!fabricCanvasRef.current) return;
    const fabric = await import("fabric");
    
    const textbox = new fabric.Textbox("Tap to edit", {
      left: 1080 / 2,
      top: 1920 / 2,
      width: 600,
      fontSize: 64,
      fill: activeColor,
      fontFamily: "Inter, sans-serif",
      textAlign: "center",
      originX: "center",
      originY: "center",
      cornerColor: "#3b82f6",
      cornerSize: 16,
      transparentCorners: false,
    });

    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.renderAll();
  };

  // Brush state updates
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (isDrawing) {
      canvas.isDrawingMode = true;
      import("fabric").then((fabric) => {
        const brush = new fabric.PencilBrush(canvas);
        brush.color = activeColor;
        brush.width = brushWidth;
        canvas.freeDrawingBrush = brush;
      });
    } else {
      canvas.isDrawingMode = false;
    }
  }, [isDrawing, activeColor, brushWidth]);

  // Add GIF/Sticker layer
  const addGiphySticker = async (url: string) => {
    if (!fabricCanvasRef.current) return;
    const fabric = await import("fabric");

    fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
      img.set({
        left: 1080 / 2,
        top: 1920 / 2,
        originX: "center",
        originY: "center",
        scaleX: 1.5,
        scaleY: 1.5,
        cornerColor: "#3b82f6",
        cornerSize: 16,
        transparentCorners: false,
      });
      fabricCanvasRef.current.add(img);
      fabricCanvasRef.current.setActiveObject(img);
      fabricCanvasRef.current.renderAll();
      setShowGifPicker(false);
    });
  };

  // Add Emoji layer
  const addEmoji = async (emoji: string) => {
    if (!fabricCanvasRef.current) return;
    const fabric = await import("fabric");

    const emojiObj = new fabric.Textbox(emoji, {
      left: 1080 / 2,
      top: 1920 / 2,
      fontSize: 120,
      textAlign: "center",
      originX: "center",
      originY: "center",
      cornerColor: "#3b82f6",
      cornerSize: 16,
      transparentCorners: false,
    });

    fabricCanvasRef.current.add(emojiObj);
    fabricCanvasRef.current.setActiveObject(emojiObj);
    fabricCanvasRef.current.renderAll();
    setShowEmojiPicker(false);
  };

  // Export final edited asset & publish
  const handlePublish = async () => {
    setIsSaving(true);
    try {
      if (isVideo) {
        // Video trim pipeline
        if (!videoRef.current) return;
        
        // Build a media stream capture for browser-side video trimming
        const stream = (videoRef.current as any).captureStream ? (videoRef.current as any).captureStream(30) : null;
        
        if (stream) {
          const chunks: Blob[] = [];
          const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            const trimmedBlob = new Blob(chunks, { type: "video/webm" });
            const trimmedFile = new File([trimmedBlob], "story_trimmed.webm", { type: "video/webm" });
            onComplete(trimmedFile);
          };

          // Play the video and record
          videoRef.current.currentTime = startTime;
          videoRef.current.play().catch(console.error);
          mediaRecorder.start();

          setTimeout(() => {
            mediaRecorder.stop();
            if (videoRef.current) videoRef.current.pause();
          }, (endTime - startTime) * 1000);
        } else {
          // Fallback if browser doesn't support captureStream, upload raw video
          onComplete(file);
        }
      } else {
        // Image canvas export
        if (!fabricCanvasRef.current) return;
        
        // Reset zoom to 1 to render 1080x1920 HD output
        const canvas = fabricCanvasRef.current;
        canvas.setZoom(1);
        canvas.setDimensions({ width: 1080, height: 1920 });

        const dataUrl = canvas.toDataURL({
          format: "jpeg",
          quality: 0.95,
        });

        // Convert dataUrl to File
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const finalFile = new File([blob], "story_compiled.jpg", { type: "image/jpeg" });
        onComplete(finalFile);
      }
    } catch (err) {
      console.error("Story export error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isCropStep) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white select-none">
        {/* Top Navbar */}
        <header className="flex justify-between items-center px-4 py-3 border-b border-neutral-900 bg-neutral-950">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-900">
            <X className="size-6" />
          </button>
          <h2 className="text-sm font-semibold tracking-wide uppercase">Crop Story</h2>
          <Button
            onClick={applyCrop}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold size-sm flex gap-1 rounded-lg"
          >
            <Check className="size-4" /> Done
          </Button>
        </header>

        {/* Cropper Frame */}
        <div className="relative flex-grow bg-black">
          {editedImageSrc && (
            <Cropper
              image={editedImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={9 / 16}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        {/* Sliders Footer */}
        <footer className="p-6 bg-neutral-950 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 text-white select-none p-4 overflow-hidden">
      {/* Top Navbar */}
      <header className="w-full max-w-[420px] flex justify-between items-center mb-2 px-1 z-30">
        <button onClick={onClose} className="p-2 rounded-full bg-neutral-900/60 hover:bg-neutral-800 transition-colors">
          <X className="size-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Story Creator</span>
        <Button
          onClick={handlePublish}
          disabled={isSaving}
          className="bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-semibold rounded-full px-5 py-1 text-sm border-0"
        >
          {isSaving ? "Saving..." : "Share"}
        </Button>
      </header>

      {/* Preview Canvas Stage */}
      <div 
        ref={containerRef}
        className="relative aspect-[9/16] w-full max-w-[420px] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-neutral-900"
      >
        {isVideo ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={URL.createObjectURL(file)}
              onLoadedMetadata={handleVideoMetadata}
              className="w-full h-full object-contain pointer-events-none"
              autoPlay
              muted
              playsInline
            />
            {/* Video Play/Pause Overlay */}
            <button
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (videoPlaying) {
                  video.pause();
                } else {
                  video.play().catch(console.error);
                }
                setVideoPlaying(!videoPlaying);
              }}
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/10 group active:bg-black/30 transition-colors"
            >
              {!videoPlaying && (
                <div className="p-4 rounded-full bg-black/60 backdrop-blur-sm animate-scale-up">
                  <Play className="size-10 fill-white text-white" />
                </div>
              )}
            </button>
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full pointer-events-auto" />
        )}

        {/* Gif Picker Slide Overlay */}
        {showGifPicker && (
          <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-2 animate-slide-up border border-neutral-800">
            <div className="flex justify-between items-center px-2 pb-2">
              <span className="text-xs font-semibold text-neutral-400">Search Giphy</span>
              <button onClick={() => setShowGifPicker(false)} className="text-neutral-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <GifPicker onSelect={addGiphySticker} />
          </div>
        )}

        {/* Emoji Picker Slide Overlay */}
        {showEmojiPicker && (
          <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-2 animate-slide-up border border-neutral-800 flex flex-col items-center">
            <div className="flex justify-between items-center w-full px-2 pb-2">
              <span className="text-xs font-semibold text-neutral-400">Pick Emoji</span>
              <button onClick={() => setShowEmojiPicker(false)} className="text-neutral-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <EmojiPickerPanel onEmojiSelect={addEmoji} />
          </div>
        )}
      </div>

      {/* Editor Toolbars */}
      <footer className="w-full max-w-[420px] mt-4 flex flex-col gap-4 z-30">
        {/* Trimming slider for videos */}
        {isVideo && videoDuration > 15 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold text-neutral-400">
              <span>Trim Clip (Max 15s)</span>
              <span>
                {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex-grow flex gap-2">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-neutral-500">Start</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, videoDuration - 15)}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => {
                      const newStart = parseFloat(e.target.value);
                      setStartTime(newStart);
                      setEndTime(Math.min(videoDuration, newStart + 15));
                      if (videoRef.current) videoRef.current.currentTime = newStart;
                    }}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-neutral-500">End</span>
                  <input
                    type="range"
                    min={startTime + 1}
                    max={Math.min(videoDuration, startTime + 15)}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(parseFloat(e.target.value));
                    }}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image tools toolbar */}
        {!isVideo && (
          <div className="flex flex-col gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-3">
            {/* Color Palette */}
            <div className="flex justify-between items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setActiveColor(color);
                    // Update active text selection color if active
                    if (fabricCanvasRef.current) {
                      const activeObj = fabricCanvasRef.current.getActiveObject();
                      if (activeObj && activeObj.type === "textbox") {
                        activeObj.set("fill", color);
                        fabricCanvasRef.current.renderAll();
                      }
                    }
                  }}
                  className={`size-6 rounded-full border border-neutral-700 transition-transform ${
                    activeColor === color ? "scale-120 border-white" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Brush Width Slider if drawing */}
            {isDrawing && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-12 font-semibold">Size: {brushWidth}px</span>
                <input
                  type="range"
                  min={2}
                  max={30}
                  step={1}
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                  className="flex-grow h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            )}

            {/* Actions Grid */}
            <div className="grid grid-cols-5 gap-2 border-t border-neutral-800 pt-2.5">
              <button
                onClick={addText}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                title="Add Text"
              >
                <TextIcon className="size-5 mb-1" />
                <span className="text-[10px]">Text</span>
              </button>

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800 transition-colors ${
                  showEmojiPicker ? "bg-neutral-800 text-sky-500" : "text-neutral-400 hover:text-white"
                }`}
                title="Add Emoji"
              >
                <Smile className="size-5 mb-1" />
                <span className="text-[10px]">Emoji</span>
              </button>

              <button
                onClick={() => setShowGifPicker(!showGifPicker)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800 transition-colors ${
                  showGifPicker ? "bg-neutral-800 text-sky-500" : "text-neutral-400 hover:text-white"
                }`}
                title="Add Giphy Sticker"
              >
                <Sparkles className="size-5 mb-1" />
                <span className="text-[10px]">Giphy</span>
              </button>

              <button
                onClick={() => setIsDrawing(!isDrawing)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800 transition-colors ${
                  isDrawing ? "bg-neutral-800 text-sky-500" : "text-neutral-400 hover:text-white"
                }`}
                title="Draw"
              >
                <Brush className="size-5 mb-1" />
                <span className="text-[10px]">Draw</span>
              </button>

              <button
                onClick={() => setIsCropStep(true)}
                className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                title="Crop"
              >
                <Scissors className="size-5 mb-1" />
                <span className="text-[10px]">Crop</span>
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
