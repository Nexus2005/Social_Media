"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import Image from "next/image";

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  createdAt: string;
}

interface UserStories {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  stories: Story[];
}

interface StoryViewerProps {
  groupedStories: UserStories[];
  initialUserIndex: number;
  open: boolean;
  onClose: () => void;
}

export default function StoryViewer({
  groupedStories,
  initialUserIndex,
  open,
  onClose,
}: StoryViewerProps) {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const storyDuration = 5000; // 5 seconds for images

  const currentUserStories = groupedStories[userIndex];
  const currentStory = currentUserStories?.stories[storyIndex];

  // Reset story index when switching users
  useEffect(() => {
    setStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
  }, [userIndex]);

  // Handle story transition logic
  const handleNext = useCallback(() => {
    if (!currentUserStories) return;

    if (storyIndex < currentUserStories.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (userIndex < groupedStories.length - 1) {
      setUserIndex((prev) => prev + 1);
    } else {
      onClose(); // Last story of the last user, close viewer
    }
  }, [storyIndex, userIndex, currentUserStories, groupedStories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (userIndex > 0) {
      const prevUserIndex = userIndex - 1;
      setUserIndex(prevUserIndex);
      // Start at the last story of the previous user
      setStoryIndex(groupedStories[prevUserIndex].stories.length - 1);
      setProgress(0);
    } else {
      // Very first story, just restart progress
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [storyIndex, userIndex, groupedStories]);

  // Progress Bar Animation Loop
  useEffect(() => {
    if (!open || !currentStory || isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const isVideo = currentStory.mediaType === "VIDEO";

    if (isVideo) {
      // For videos, progress is linked directly to timeupdate event
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    // For images, increment progress every 50ms
    const intervalTime = 50;
    const step = (intervalTime / storyDuration) * 100;

    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current!);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [open, userIndex, storyIndex, isPaused, currentStory, handleNext]);

  // Video Time Update listener
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isPaused) return;

    const currentProgress = (video.currentTime / video.duration) * 100;
    setProgress(currentProgress);
  };

  // Video Finished listener
  const handleVideoEnded = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // Handle Video Autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (video && currentStory?.mediaType === "VIDEO" && !isPaused) {
      video.play().catch((err) => {
        console.error("Autoplay failed:", err);
      });
    }
  }, [currentStory, userIndex, storyIndex, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleNext, handlePrev, onClose]);

  if (!open || !currentUserStories || !currentStory) return null;

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Left 30% goes back, right 70% goes forward
    if (clickX < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused((prev) => {
      const nextPause = !prev;
      if (videoRef.current) {
        if (nextPause) videoRef.current.pause();
        else videoRef.current.play().catch(console.error);
      }
      return nextPause;
    });
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/95 backdrop-blur-sm select-none">
      {/* Background click to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Prev User Arrow Button */}
      {userIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUserIndex((prev) => prev - 1);
          }}
          className="absolute left-10 hidden md:flex items-center justify-center size-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white z-10"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}

      {/* Story Stage Container */}
      <div
        ref={videoRef as any}
        onClick={handleScreenClick}
        className="relative w-full max-w-[420px] h-full sm:h-[90vh] sm:max-h-[760px] bg-black sm:rounded-xl overflow-hidden flex items-center justify-center z-10 shadow-2xl"
      >
        {/* Progress Bar Indicators at the top */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-30 pointer-events-none">
          {currentUserStories.stories.map((s, idx) => {
            let width = "0%";
            if (idx < storyIndex) width = "100%";
            else if (idx === storyIndex) width = `${progress}%`;

            return (
              <div
                key={s.id}
                className="h-[2px] flex-grow bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ width }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-7 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-20">
          <div className="flex items-center gap-2.5">
            <div className="relative size-8 rounded-full overflow-hidden border border-white/20">
              {currentUserStories.user.avatarUrl ? (
                <Image
                  src={currentUserStories.user.avatarUrl}
                  alt={currentUserStories.user.username}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-700 flex items-center justify-center font-bold text-xs uppercase">
                  {currentUserStories.user.username[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[13px] leading-tight drop-shadow">
                {currentUserStories.user.username}
              </span>
              <span className="text-[10px] text-white/70 leading-none drop-shadow">
                {formatRelativeDate(new Date(currentStory.createdAt))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Play/Pause Button */}
            <button
              onClick={togglePause}
              className="text-white hover:text-white/80 p-1 rounded-full transition-colors"
            >
              {isPaused ? <Play className="size-4 fill-white" /> : <Pause className="size-4 fill-white" />}
            </button>

            {/* Mute Button */}
            {currentStory.mediaType === "VIDEO" && (
              <button
                onClick={toggleMute}
                className="text-white hover:text-white/80 p-1 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:text-white/80 p-1 rounded-full transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Media Render (Image or Video) */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStory.mediaType === "IMAGE" ? (
            <div className="relative w-full h-full">
              <Image
                src={currentStory.mediaUrl}
                alt="Story"
                fill
                sizes="420px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              muted={isMuted}
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Next User Arrow Button */}
      {userIndex < groupedStories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUserIndex((prev) => prev + 1);
          }}
          className="absolute right-10 hidden md:flex items-center justify-center size-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white z-10"
        >
          <ChevronRight className="size-6" />
        </button>
      )}
    </div>
  );
}
