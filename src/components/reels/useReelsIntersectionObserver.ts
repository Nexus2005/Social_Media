import { useEffect } from "react";

export default function useReelsIntersectionObserver(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setIsPlaying: (playing: boolean) => void,
  isMuted: boolean
) {
  // Autoplay/pause on intersection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = isMuted;
          video
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn("Reel autoplay prevented:", err);
              setIsPlaying(false);
            });
        } else {
          video.pause();
          video.currentTime = 0; // Rewind to start
          setIsPlaying(false);
        }
      },
      {
        threshold: 0.6, // Trigger when 60% of the video container is visible
      }
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, [videoRef, setIsPlaying, isMuted]);

  // Sync mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, videoRef]);
}
