"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

import kyInstance from "@/lib/ky";

interface VideoPlayerProps {
  src: string;
  className?: string;
  postId?: string;
}

export default function VideoPlayer({ src, className, postId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [overlayIcon, setOverlayIcon] = useState<"play" | "pause" | null>(null);

  // Play/pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setOverlayIcon("play");
      }).catch((err) => {
        console.error("Failed to play video:", err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
      setOverlayIcon("pause");
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOverlayIcon(null);
    }, 600);
  };

  // Mute/unmute toggle
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent play/pause trigger
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Viewport-aware autoplay and pause on scroll
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => {
            setIsPlaying(true);
          }).catch(() => {
            // If autoplay fails, mark as paused
            setIsPlaying(false);
          });
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Sync state if video events trigger play/pause outside of click
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlayEvent = () => setIsPlaying(true);
    const handlePauseEvent = () => setIsPlaying(false);

    video.addEventListener("play", handlePlayEvent);
    video.addEventListener("pause", handlePauseEvent);

    return () => {
      video.removeEventListener("play", handlePlayEvent);
      video.removeEventListener("pause", handlePauseEvent);
    };
  }, []);

  // Track watch time and completion rate
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !postId) return;

    let totalWatchTime = 0;
    let lastTime = video.currentTime;
    let completedSent = false;

    const handleTimeUpdate = () => {
      if (video.paused) return;
      const current = video.currentTime;
      const diff = Math.max(0, current - lastTime);
      if (diff < 1) {
        totalWatchTime += diff;
      }
      lastTime = current;

      if (video.duration > 0) {
        const progress = current / video.duration;
        if (progress >= 0.9 && !completedSent) {
          completedSent = true;
          kyInstance
            .post(`/api/posts/${postId}/views`, {
              json: { watchDuration: Math.round(totalWatchTime), completed: true },
            })
            .catch((err) => console.error("Error logging completion view:", err));
        }
      }
    };

    const handlePauseOrUnmount = () => {
      if (totalWatchTime > 0) {
        kyInstance
          .post(`/api/posts/${postId}/views`, {
            json: { watchDuration: Math.round(totalWatchTime), completed: completedSent },
          })
          .catch((err) => console.error("Error logging watch duration:", err));
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePauseOrUnmount);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePauseOrUnmount);
      handlePauseOrUnmount();
    };
  }, [postId]);

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={cn(
        "relative mx-auto w-full rounded-2xl overflow-hidden bg-black flex justify-center items-center group/player select-none cursor-pointer",
        className
      )}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes playPausePulse {
            0% { transform: scale(0.6); opacity: 0; }
            40% { transform: scale(1.1); opacity: 0.9; }
            100% { transform: scale(1); opacity: 0; }
          }
          .animate-play-pause-icon {
            animation: playPausePulse 0.6s ease-out forwards;
          }
        `
      }} />

      <video
        ref={videoRef}
        src={src}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />

      {/* Central Pulsing Play/Pause Icon Overlay */}
      {overlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-10">
          <div className="p-4 bg-black/60 rounded-full text-white animate-play-pause-icon">
            {overlayIcon === "play" ? (
              <Play className="size-8 fill-white" />
            ) : (
              <Pause className="size-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Speaker Button (Mute/Unmute) */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-2 bg-black/65 hover:bg-black/85 rounded-full text-white transition-all opacity-80 hover:opacity-100 hover:scale-105 z-20"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="size-4" />
        ) : (
          <Volume2 className="size-4" />
        )}
      </button>

      {/* Center play state hint overlay (appears only when video is paused and no active pulse animation is running) */}
      {!isPlaying && !overlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none transition-opacity duration-300">
          <div className="p-4 bg-black/40 rounded-full text-white">
            <Play className="size-10 fill-white translate-x-[2px]" />
          </div>
        </div>
      )}
    </div>
  );
}
