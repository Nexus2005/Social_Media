"use client";

import { useEffect, useRef } from "react";

interface PostViewTrackerProps {
  postId: string;
}

export default function PostViewTracker({ postId }: PostViewTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    tracked.current = false;
  }, [postId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          const timer = setTimeout(() => {
            // Fire-and-forget: use native fetch with a short timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            fetch(`/api/posts/${postId}/views`, {
              method: "POST",
              signal: controller.signal,
            })
              .catch(() => {}) // Silently ignore all errors
              .finally(() => clearTimeout(timeoutId));
          }, 1000);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [postId]);

  return <div ref={ref} className="h-0 w-0 absolute pointer-events-none" />;
}

