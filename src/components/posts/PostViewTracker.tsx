"use client";

import { useEffect, useRef } from "react";

interface PostViewTrackerProps {
  postId: string;
}

export default function PostViewTracker({ postId }: PostViewTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && timerRef.current === null) {
          // Fire-and-forget view ping after 1s of visibility
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            fetch(`/api/posts/${postId}/views`, {
              method: "POST",
              signal: controller.signal,
              keepalive: true,
            })
              .catch(() => {}) // Silently ignore all errors
              .finally(() => clearTimeout(timeoutId));
          }, 1000);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [postId]);

  return <div ref={ref} className="h-0 w-0 absolute pointer-events-none" />;
}
