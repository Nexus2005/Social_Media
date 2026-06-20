"use client";

import { useState, useEffect } from "react";

export default function IntroProvider({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
          <video
            className="w-full h-full object-cover"
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
