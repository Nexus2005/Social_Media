"use client";

import { useState, useEffect, useRef } from "react";

export default function IntroProvider({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const hasPlayed = sessionStorage.getItem("cartly_intro_played");
    if (!hasPlayed) {
      setShowIntro(true);
    }
  }, []);

  const handleVideoEnd = () => {
    setFadeOut(true);
    setTimeout(() => {
      sessionStorage.setItem("cartly_intro_played", "true");
      setShowIntro(false);
    }, 500); // Matches the Tailwind transition-opacity duration-500
  };

  // Programmatic play & autoplay block detection
  useEffect(() => {
    if (showIntro && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay blocked, attempting to play muted:", error);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch((err) => {
              console.error("Muted autoplay also blocked, skipping intro:", err);
              handleVideoEnd();
            });
          }
        });
      }
    }
  }, [showIntro]);

  // Safety fallback timeout to prevent stuck blank screens (e.g. slow network loading)
  useEffect(() => {
    if (showIntro) {
      const safetyTimeout = setTimeout(() => {
        console.warn("Safety timeout reached, unmounting intro...");
        handleVideoEnd();
      }, 12000); // 12 seconds fallback for the 8s video

      return () => clearTimeout(safetyTimeout);
    }
  }, [showIntro]);

  if (!isMounted) {
    return <>{children}</>;
  }

  if (showIntro) {
    return (
      <>
        <div
          className={`fixed inset-0 bg-black z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500 ease-in-out ${
            fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Skip Button */}
          <button
            onClick={handleVideoEnd}
            className="absolute top-4 right-4 z-[10000] px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-full text-white text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer"
          >
            Skip
          </button>

          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            src="/Cartly Intro.mp4"
            autoPlay
            muted={false}
            playsInline
            controls={false}
            onEnded={handleVideoEnd}
          />
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}

