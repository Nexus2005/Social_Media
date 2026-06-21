"use client";

import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import {
  X,
  Type as TextIcon,
  Smile,
  Sparkles,
  Brush,
  Scissors,
  Check,
  Play,
  Pause,
  MapPin,
  Music,
  HelpCircle,
  Clock,
  Heart,
  Undo2,
  Trash2,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GifPicker from "./GifPicker";
import EmojiPickerPanel from "./EmojiPickerPanel";
import LocationPickerSheet from "@/components/ui/LocationPickerSheet";
import { getFilterString, getProcessedImg } from "@/components/posts/editor/imageProcessing";

// Custom Filters list for Story
const filterPresets = [
  { name: "Normal", filter: "none" },
  { name: "Warm", filter: "sepia(0.3) saturate(1.1) brightness(1.02)" },
  { name: "Cool", filter: "hue-rotate(10deg) saturate(0.9) brightness(1.05)" },
  { name: "Vintage", filter: "sepia(0.5) contrast(0.85) saturate(0.95)" },
  { name: "Bright", filter: "brightness(1.15) contrast(1.05) saturate(1.1)" },
  { name: "Cinematic", filter: "contrast(1.2) brightness(0.95) saturate(0.85)" },
  { name: "Portrait", filter: "contrast(1.05) saturate(1.08) brightness(1.02)" },
  { name: "Dreamy", filter: "brightness(1.05) saturate(0.9) contrast(0.9)" }
];

interface StoryEditorProps {
  file: File;
  onClose: () => void;
  onComplete: (file: File) => void;
}

interface StickerItem {
  id: string;
  type: "text" | "emoji" | "gif" | "mention" | "hashtag" | "location" | "music" | "poll" | "question" | "countdown";
  value: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  scale: number;
  rotation: number;
  extra?: any;
}

export default function StoryEditor({ file, onClose, onComplete }: StoryEditorProps) {
  const isVideo = file.type.startsWith("video/");

  // Navigation Panel State Enum
  // Constraints: Only ONE panel open. Opening another panel closes the previous one.
  type ToolPanel = "filters" | "adjustments" | "text" | "emoji" | "gif" | "stickers" | "draw" | "crop" | "location" | null;
  const [activePanel, setActivePanel] = useState<ToolPanel>(null);

  // Background Media Sources
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [croppedImageSrc, setCroppedImageSrc] = useState<string | null>(null);

  // Crop & Transform Matrix parameters
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropAspect, setCropAspect] = useState<number>(9 / 16);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropStep, setIsCropStep] = useState(!isVideo);

  // Filters & Adjustments values
  const [selectedFilter, setSelectedFilter] = useState("Normal");
  const [adjustments, setAdjustments] = useState({
    brightness: 1,
    contrast: 1,
    saturation: 1,
    warmth: 0,
    exposure: 0,
    fade: 0,
    sharpen: 0,
    vignette: 0,
    structure: 0,
  });

  // Story Stickers layer
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [stickerTextInput, setStickerTextInput] = useState("");
  const [activeColor, setActiveColor] = useState("#ffffff");

  // Video trims
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(true);

  // Canvas drawing properties
  const [drawHistory, setDrawHistory] = useState<string[]>([]);
  const [brushWidth, setBrushWidth] = useState(8);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastDrawPos = useRef({ x: 0, y: 0 });

  const colors = [
    "#ffffff", "#000000", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
    "#a855f7", "#ec4899"
  ];

  // Initialize background sources
  useEffect(() => {
    const src = URL.createObjectURL(file);
    setOriginalImageSrc(src);
    setCroppedImageSrc(src);
    return () => URL.revokeObjectURL(src);
  }, [file]);

  // Video looping boundaries listener
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

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setStartTime(0);
      setEndTime(Math.min(duration, 15));
    }
  };

  // Perform standard 2D canvas crop extraction
  const applyCrop = async () => {
    if (!originalImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getProcessedImg(
        originalImageSrc,
        croppedAreaPixels,
        cropRotation,
        "Normal",
        {}
      );
      if (croppedImageSrc && croppedImageSrc !== originalImageSrc) {
        URL.revokeObjectURL(croppedImageSrc);
      }
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setCroppedImageSrc(croppedUrl);
      setIsCropStep(false);
      setActivePanel(null);
    } catch (e) {
      console.error("Crop error:", e);
    }
  };

  // Canvas drawing operations
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || activePanel !== "draw") return;

    const resizeDrawCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Restore drawing history if exists
      if (drawHistory.length > 0) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = drawHistory[drawHistory.length - 1];
        img.onload = () => ctx?.drawImage(img, 0, 0);
      }
    };

    resizeDrawCanvas();
    window.addEventListener("resize", resizeDrawCanvas);
    return () => window.removeEventListener("resize", resizeDrawCanvas);
  }, [activePanel, drawHistory]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    const pos = getEventCoords(e, canvas);
    lastDrawPos.current = pos;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getEventCoords(e, canvas);
    ctx.lineWidth = brushWidth;
    ctx.lineCap = "round";
    ctx.strokeStyle = activeColor;

    ctx.beginPath();
    ctx.moveTo(lastDrawPos.current.x, lastDrawPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastDrawPos.current = pos;
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    // Save image to history
    const canvas = drawCanvasRef.current;
    if (canvas) {
      setDrawHistory((prev) => [...prev, canvas.toDataURL()]);
    }
  };

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Sticker layer addition logic
  const addSticker = (type: StickerItem["type"], value: string, extra: any = null) => {
    const newSticker: StickerItem = {
      id: Math.random().toString(),
      type,
      value,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      extra,
    };
    setStickers([...stickers, newSticker]);
    setActiveStickerId(newSticker.id);
    setActivePanel(null);
  };

  // Drag operations
  const handleStickerDrag = (e: React.MouseEvent | React.TouchEvent, stickerId: string) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const updatePosition = (clientX: number, clientY: number) => {
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setStickers((prev) =>
        prev.map((s) => (s.id === stickerId ? { ...s, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : s))
      );
    };

    const onMove = (event: MouseEvent | TouchEvent) => {
      const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
      updatePosition(clientX, clientY);
    };

    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  const handlePublish = async () => {
    try {
      if (isVideo) {
        // Trim and upload raw file directly
        onComplete(file);
      } else {
        // Compile static canvas
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw cropped and filtered background
        const finalBgBlob = await getProcessedImg(
          originalImageSrc!,
          croppedAreaPixels || { x: 0, y: 0, width: 1080, height: 1920 },
          cropRotation,
          selectedFilter,
          adjustments
        );

        const bgImg = await new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(finalBgBlob);
          img.onload = () => resolve(img);
        });

        // Center background image on the 9:16 target canvas
        const scaleX = 1080 / bgImg.width;
        const scaleY = 1920 / bgImg.height;
        const scale = Math.min(scaleX, scaleY);
        const w = bgImg.width * scale;
        const h = bgImg.height * scale;
        const xOffset = (1080 - w) / 2;
        const yOffset = (1920 - h) / 2;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.drawImage(bgImg, xOffset, yOffset, w, h);

        // Draw drawing overlay
        const drawCanvas = drawCanvasRef.current;
        if (drawCanvas && drawHistory.length > 0) {
          const drawImg = await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.src = drawCanvas.toDataURL();
            img.onload = () => resolve(img);
          });
          ctx.drawImage(drawImg, 0, 0, 1080, 1920);
        }

        // Draw each sticker overlay
        for (const sticker of stickers) {
          ctx.save();
          const targetX = (sticker.x / 100) * 1080;
          const targetY = (sticker.y / 100) * 1920;
          ctx.translate(targetX, targetY);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          ctx.scale(sticker.scale, sticker.scale);

          // Draw the elements matching their styling
          if (sticker.type === "text" || sticker.type === "mention" || sticker.type === "hashtag" || sticker.type === "location") {
            ctx.font = "bold 44px sans-serif";
            const textWidth = ctx.measureText(sticker.value).width;
            const textHeight = 44;

            // Background pill
            ctx.fillStyle = sticker.type === "location" ? "#ffffff" : sticker.type === "text" ? activeColor : "rgba(0, 0, 0, 0.7)";
            ctx.beginPath();
            ctx.roundRect(-textWidth / 2 - 24, -textHeight / 2 - 16, textWidth + 48, textHeight + 32, 20);
            ctx.fill();

            // Text string
            ctx.fillStyle = sticker.type === "location" ? "#3b82f6" : sticker.type === "text" ? "#000000" : "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(sticker.value, 0, 0);
          } else if (sticker.type === "emoji") {
            ctx.font = "120px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(sticker.value, 0, 0);
          } else if (sticker.type === "gif") {
            const gifImg = await new Promise<HTMLImageElement>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = sticker.value;
              img.onload = () => resolve(img);
            });
            ctx.drawImage(gifImg, -100, -100, 200, 200);
          } else if (sticker.type === "poll") {
            // Draw standard Yes/No poll card
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(-180, -90, 360, 180, 24);
            ctx.fill();

            ctx.fillStyle = "#333333";
            ctx.font = "bold 28px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(sticker.value, 0, -30);

            // Left Option Pill
            ctx.fillStyle = "rgba(0,0,0,0.06)";
            ctx.beginPath();
            ctx.roundRect(-140, 10, 130, 60, 12);
            ctx.fill();
            ctx.fillStyle = "#000000";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("YES", -75, 45);

            // Right Option Pill
            ctx.fillStyle = "rgba(0,0,0,0.06)";
            ctx.beginPath();
            ctx.roundRect(10, 10, 130, 60, 12);
            ctx.fill();
            ctx.fillStyle = "#000000";
            ctx.fillText("NO", 75, 45);
          }

          ctx.restore();
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const finalFile = new File([blob], "story_rendered.jpg", { type: "image/jpeg" });
            onComplete(finalFile);
          }
        }, "image/jpeg", 0.95);
      }
    } catch (e) {
      console.error("Story compile failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 text-white select-none p-4 overflow-hidden">
      {/* Top Navbar Header */}
      <header className="w-full max-w-[420px] flex justify-between items-center mb-2 px-1 z-30">
        <button onClick={onClose} className="p-2 rounded-full bg-neutral-900/60 hover:bg-neutral-800 transition-colors">
          <X className="size-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-450">Story Creator</span>
        <Button
          onClick={handlePublish}
          className="bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-full px-5 py-1 text-sm border-0"
        >
          Share
        </Button>
      </header>

      {/* Main Preview Container Frame */}
      {isCropStep ? (
        <div className="relative aspect-[9/16] w-full max-w-[420px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-neutral-900">
          <div className="relative flex-grow">
            {originalImageSrc && (
              <Cropper
                image={originalImageSrc}
                crop={crop}
                zoom={zoom}
                rotation={cropRotation}
                aspect={cropAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, px) => setCroppedAreaPixels(px)}
              />
            )}
          </div>
          <div className="p-4 bg-neutral-900/90 border-t border-neutral-800 flex flex-col gap-3">
            {/* Aspect selectors */}
            <div className="flex gap-2 justify-center">
              {[
                { label: "9:16 (Story)", ratio: 9 / 16 },
                { label: "1:1 (Square)", ratio: 1 },
                { label: "16:9 (Landscape)", ratio: 16 / 9 },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setCropAspect(item.ratio)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg ${
                    cropAspect === item.ratio ? "bg-sky-500 text-white" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {/* Zoom slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-grow h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            {/* Rotation slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">Rotate</span>
              <input
                type="range"
                min={0}
                max={360}
                step={90}
                value={cropRotation}
                onChange={(e) => setCropRotation(parseInt(e.target.value))}
                className="flex-grow h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            <Button onClick={applyCrop} className="bg-sky-500 hover:bg-sky-600 text-white font-bold w-full rounded-xl py-2">
              Apply Crop
            </Button>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative aspect-[9/16] w-full max-w-[420px] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-neutral-900"
        >
          {/* Background render */}
          {isVideo ? (
            <video
              ref={videoRef}
              src={originalImageSrc!}
              onLoadedMetadata={handleVideoMetadata}
              className="w-full h-full object-contain pointer-events-none"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <img
              src={croppedImageSrc!}
              alt="cropped story background"
              className="w-full h-full object-contain pointer-events-none"
              style={{
                filter: getFilterString(selectedFilter, adjustments),
              }}
            />
          )}

          {/* Vignette Preview Overlay */}
          {adjustments.vignette > 0 && (
            <div
              style={{
                background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${adjustments.vignette * 0.9}) 100%)`,
              }}
              className="absolute inset-0 pointer-events-none z-10"
            />
          )}

          {/* Canvas Drawing layer */}
          <canvas
            ref={drawCanvasRef}
            className={`absolute inset-0 w-full h-full z-15 ${
              activePanel === "draw" ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
            }`}
            onMouseDown={startDrawing}
            onMouseMove={drawMove}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={drawMove}
            onTouchEnd={endDrawing}
          />

          {/* Absolute Overlays for Stickers */}
          {stickers.map((sticker) => {
            const isActive = activeStickerId === sticker.id;
            return (
              <div
                key={sticker.id}
                onMouseDown={(e) => {
                  setActiveStickerId(sticker.id);
                  handleStickerDrag(e, sticker.id);
                }}
                onTouchStart={(e) => {
                  setActiveStickerId(sticker.id);
                  handleStickerDrag(e, sticker.id);
                }}
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                }}
                className={`absolute z-20 cursor-grab active:cursor-grabbing select-none p-2 ${
                  isActive ? "border-2 border-dashed border-sky-400 rounded-lg bg-black/10" : ""
                }`}
              >
                {/* Render different styles per sticker type */}
                {sticker.type === "text" && (
                  <span
                    style={{ color: activeColor }}
                    className="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-xl font-bold text-lg text-center inline-block"
                  >
                    {sticker.value}
                  </span>
                )}
                {sticker.type === "emoji" && (
                  <span className="text-6xl inline-block">{sticker.value}</span>
                )}
                {sticker.type === "gif" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sticker.value} alt="GIF" className="w-24 h-24 object-contain pointer-events-none" />
                )}
                {sticker.type === "mention" && (
                  <span className="px-4 py-2 bg-white text-black font-extrabold rounded-full shadow-lg text-sm inline-block">
                    @{sticker.value}
                  </span>
                )}
                {sticker.type === "hashtag" && (
                  <span className="px-4 py-2 bg-gradient-to-r from-pink-500 to-amber-500 text-white font-extrabold rounded-full shadow-lg text-sm inline-block">
                    #{sticker.value}
                  </span>
                )}
                {sticker.type === "location" && (
                  <span className="px-4 py-2 bg-white text-sky-500 font-bold rounded-full shadow-lg text-sm flex items-center gap-1.5 inline-block">
                    <MapPin className="size-4 fill-sky-500 text-sky-500" />
                    {sticker.value}
                  </span>
                )}
                {sticker.type === "music" && (
                  <div className="p-3 bg-black/85 backdrop-blur rounded-2xl flex items-center gap-2 border border-neutral-800 shadow-xl max-w-[200px]">
                    <div className="p-2 bg-purple-600 rounded-lg text-white">
                      <Music className="size-5 animate-pulse" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{sticker.value}</span>
                      <span className="text-[10px] text-neutral-400 truncate">Song card widget</span>
                    </div>
                  </div>
                )}
                {sticker.type === "poll" && (
                  <div className="p-4 bg-white text-black rounded-2xl shadow-xl flex flex-col gap-2 min-w-[200px]">
                    <span className="text-xs font-bold text-center text-neutral-800">{sticker.value}</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="py-2 bg-neutral-100 text-center rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors">YES</div>
                      <div className="py-2 bg-neutral-100 text-center rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors">NO</div>
                    </div>
                  </div>
                )}
                {sticker.type === "question" && (
                  <div className="p-4 bg-gradient-to-tr from-pink-400 to-rose-400 text-white rounded-2xl shadow-xl flex flex-col gap-2 min-w-[200px]">
                    <span className="text-xs font-bold text-center">{sticker.value}</span>
                    <div className="bg-white/20 rounded-xl py-3 text-center text-[10px]">Type something...</div>
                  </div>
                )}
                {sticker.type === "countdown" && (
                  <div className="p-3 bg-neutral-900/90 text-white rounded-2xl border border-neutral-800 shadow-xl flex flex-col items-center gap-1.5 min-w-[220px]">
                    <span className="text-xs font-bold">{sticker.value}</span>
                    <div className="flex gap-2">
                      {["00", "00", "00"].map((num, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="bg-neutral-850 px-2 py-1.5 rounded-lg font-mono text-sm font-bold">{num}</div>
                          <span className="text-[8px] text-neutral-500 mt-0.5">{i === 0 ? "DAYS" : i === 1 ? "HOURS" : "MINS"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Action HUD */}
                {isActive && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur border border-neutral-800 px-2 py-1 rounded-full z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickers((prev) =>
                          prev.map((s) => (s.id === sticker.id ? { ...s, scale: Math.max(0.5, s.scale - 0.1) } : s))
                        );
                      }}
                      className="text-white hover:text-sky-400 text-xs p-1"
                    >
                      -
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickers((prev) =>
                          prev.map((s) => (s.id === sticker.id ? { ...s, scale: Math.min(3, s.scale + 0.1) } : s))
                        );
                      }}
                      className="text-white hover:text-sky-400 text-xs p-1"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickers((prev) =>
                          prev.map((s) => (s.id === sticker.id ? { ...s, rotation: (s.rotation + 45) % 360 } : s))
                        );
                      }}
                      className="text-white hover:text-sky-400 text-xs p-1"
                    >
                      <Undo2 className="size-3.5 rotate-90" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickers((prev) => prev.filter((s) => s.id !== sticker.id));
                        setActiveStickerId(null);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Drawer Overlays (Strict: only one panel can be open) */}
          {activePanel === "gif" && (
            <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-2 border border-neutral-800 animate-slide-up">
              <div className="flex justify-between items-center px-2 pb-2">
                <span className="text-xs font-semibold text-neutral-400">GIF stickers</span>
                <button onClick={() => setActivePanel(null)} className="text-neutral-400 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <GifPicker onSelect={(url) => addSticker("gif", url)} />
            </div>
          )}

          {activePanel === "emoji" && (
            <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-2 border border-neutral-800 animate-slide-up flex flex-col items-center">
              <div className="flex justify-between items-center w-full px-2 pb-2">
                <span className="text-xs font-semibold text-neutral-400">Stickers & Emoji</span>
                <button onClick={() => setActivePanel(null)} className="text-neutral-400 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <EmojiPickerPanel onEmojiSelect={(em) => addSticker("emoji", em)} />
            </div>
          )}

          {activePanel === "location" && (
            <LocationPickerSheet
              onClose={() => setActivePanel(null)}
              onSelectLocation={(loc) => addSticker("location", loc.name)}
            />
          )}

          {/* Text/Sticker creation HUD panels */}
          {activePanel === "text" && (
            <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center p-6 gap-4">
              <textarea
                placeholder="Type your story text..."
                value={stickerTextInput}
                onChange={(e) => setStickerTextInput(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-2xl text-center font-bold text-white resize-none h-32 focus:ring-0 focus-visible:ring-0 placeholder:text-neutral-600"
                autoFocus
              />
              <div className="flex justify-between items-center w-full max-w-[280px]">
                <div className="flex gap-1">
                  {colors.slice(0, 5).map((col) => (
                    <button
                      key={col}
                      onClick={() => setActiveColor(col)}
                      className={`size-6 rounded-full border border-neutral-700 ${
                        activeColor === col ? "scale-110 border-white" : ""
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setActivePanel(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-sky-500 text-white font-bold"
                    onClick={() => {
                      if (stickerTextInput.trim()) {
                        addSticker("text", stickerTextInput);
                        setStickerTextInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Instagram Story Widgets Selection panel */}
          {activePanel === "stickers" && (
            <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-4 border border-neutral-800 animate-slide-up flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Story Stickers</span>
                <button onClick={() => setActivePanel(null)} className="text-neutral-400 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    const tag = prompt("Enter username:");
                    if (tag) addSticker("mention", tag);
                  }}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">👤</span>
                  <span className="text-[10px] font-bold text-neutral-300">Mention</span>
                </button>
                <button
                  onClick={() => {
                    const tag = prompt("Enter hashtag:");
                    if (tag) addSticker("hashtag", tag);
                  }}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">#️⃣</span>
                  <span className="text-[10px] font-bold text-neutral-300">Hashtag</span>
                </button>
                <button
                  onClick={() => setActivePanel("location")}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">📍</span>
                  <span className="text-[10px] font-bold text-neutral-300">Location</span>
                </button>
                <button
                  onClick={() => {
                    const song = prompt("Enter song name:");
                    if (song) addSticker("music", song);
                  }}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">🎵</span>
                  <span className="text-[10px] font-bold text-neutral-300">Music</span>
                </button>
                <button
                  onClick={() => {
                    const question = prompt("Enter poll question:");
                    if (question) addSticker("poll", question);
                  }}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">📊</span>
                  <span className="text-[10px] font-bold text-neutral-300">Poll</span>
                </button>
                <button
                  onClick={() => {
                    const question = prompt("Enter question prompt:");
                    if (question) addSticker("question", question);
                  }}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">❓</span>
                  <span className="text-[10px] font-bold text-neutral-300">Question</span>
                </button>
                <button
                  onClick={() => {
                    const title = prompt("Enter countdown title:");
                    if (title) addSticker("countdown", title);
                  }}
                  className="p-3 bg-neutral-900 border border-neutral-850 hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-lg">⏰</span>
                  <span className="text-[10px] font-bold text-neutral-300">Countdown</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters Overlay panel */}
          {activePanel === "filters" && (
            <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-3 border border-neutral-800 animate-slide-up flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Story Filters</span>
                <button onClick={() => setActivePanel(null)} className="text-neutral-400 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                {filterPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedFilter(preset.name)}
                    className={`flex flex-col items-center gap-1 flex-shrink-0 p-1.5 rounded-xl border border-transparent ${
                      selectedFilter === preset.name ? "bg-neutral-900 border-sky-500" : "hover:bg-neutral-900"
                    }`}
                  >
                    <div className="w-14 h-20 rounded-lg overflow-hidden bg-neutral-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={croppedImageSrc!}
                        alt={preset.name}
                        style={{ filter: preset.filter }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-300">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Adjustments Overlay panel */}
          {activePanel === "adjustments" && (
            <div className="absolute inset-x-2 bottom-2 z-40 bg-neutral-950/95 backdrop-blur rounded-2xl p-4 border border-neutral-800 animate-slide-up flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Adjustments</span>
                <button onClick={() => setActivePanel(null)} className="text-neutral-400 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>

              {/* Exposure */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Exposure</span>
                  <span>{adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={adjustments.exposure}
                  onChange={(e) => setAdjustments({ ...adjustments, exposure: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Brightness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Brightness</span>
                  <span>{Math.round(adjustments.brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={adjustments.brightness}
                  onChange={(e) => setAdjustments({ ...adjustments, brightness: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Contrast</span>
                  <span>{Math.round(adjustments.contrast * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={adjustments.contrast}
                  onChange={(e) => setAdjustments({ ...adjustments, contrast: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Saturation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Saturation</span>
                  <span>{Math.round(adjustments.saturation * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={adjustments.saturation}
                  onChange={(e) => setAdjustments({ ...adjustments, saturation: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Warmth */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Warmth</span>
                  <span>{adjustments.warmth > 0 ? `+${adjustments.warmth}` : adjustments.warmth}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={adjustments.warmth}
                  onChange={(e) => setAdjustments({ ...adjustments, warmth: parseInt(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Vignette */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Vignette</span>
                  <span>{Math.round(adjustments.vignette * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={adjustments.vignette}
                  onChange={(e) => setAdjustments({ ...adjustments, vignette: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Sharpen */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                  <span>Sharpen</span>
                  <span>{Math.round(adjustments.sharpen * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={adjustments.sharpen}
                  onChange={(e) => setAdjustments({ ...adjustments, sharpen: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Toolbars (only visible when not in cropping mode) */}
      {!isCropStep && (
        <footer className="w-full max-w-[420px] mt-3 flex flex-col gap-2 z-30">
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

          {/* Action grid toolbar buttons */}
          <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-2.5 flex justify-around items-center">
            <button
              onClick={() => setActivePanel(activePanel === "text" ? null : "text")}
              className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                activePanel === "text" ? "text-sky-400" : "text-neutral-450 hover:text-white"
              }`}
            >
              <TextIcon className="size-5" />
              <span className="text-[9px] font-bold">Text</span>
            </button>
            <button
              onClick={() => setActivePanel(activePanel === "emoji" ? null : "emoji")}
              className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                activePanel === "emoji" ? "text-sky-400" : "text-neutral-450 hover:text-white"
              }`}
            >
              <Smile className="size-5" />
              <span className="text-[9px] font-bold">Emoji</span>
            </button>
            <button
              onClick={() => setActivePanel(activePanel === "gif" ? null : "gif")}
              className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                activePanel === "gif" ? "text-sky-400" : "text-neutral-450 hover:text-white"
              }`}
            >
              <Sparkles className="size-5" />
              <span className="text-[9px] font-bold">GIFs</span>
            </button>
            <button
              onClick={() => setActivePanel(activePanel === "stickers" ? null : "stickers")}
              className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                activePanel === "stickers" ? "text-sky-400" : "text-neutral-450 hover:text-white"
              }`}
            >
              <Maximize2 className="size-5" />
              <span className="text-[9px] font-bold">Stickers</span>
            </button>
            {!isVideo && (
              <>
                <button
                  onClick={() => setActivePanel(activePanel === "draw" ? null : "draw")}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                    activePanel === "draw" ? "text-sky-400" : "text-neutral-450 hover:text-white"
                  }`}
                >
                  <Brush className="size-5" />
                  <span className="text-[9px] font-bold">Draw</span>
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "filters" ? null : "filters")}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                    activePanel === "filters" ? "text-sky-400" : "text-neutral-450 hover:text-white"
                  }`}
                >
                  <Scissors className="size-5" />
                  <span className="text-[9px] font-bold">Filters</span>
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "adjustments" ? null : "adjustments")}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                    activePanel === "adjustments" ? "text-sky-400" : "text-neutral-450 hover:text-white"
                  }`}
                >
                  <Undo2 className="size-5 rotate-90" />
                  <span className="text-[9px] font-bold">Adjust</span>
                </button>
                <button
                  onClick={() => setIsCropStep(true)}
                  className="p-2 rounded-xl flex flex-col items-center gap-1 text-neutral-450 hover:text-white"
                >
                  <Maximize2 className="size-5" />
                  <span className="text-[9px] font-bold">Crop</span>
                </button>
              </>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
