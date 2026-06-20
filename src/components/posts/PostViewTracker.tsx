"use client";

import { useEffect, useRef } from "react";
import kyInstance from "@/lib/ky";

interface PostViewTrackerProps {
  postId: string;
}

export default function PostViewTracker({ postId }: PostViewTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => {
            kyInstance.post(`/api/posts/${postId}/views`).catch((err) => {
              console.error("Failed to log view:", err);
            });
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
