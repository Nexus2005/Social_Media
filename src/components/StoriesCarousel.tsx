"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import CreateStoryDialog from "./CreateStoryDialog";
import StoryViewer from "./StoryViewer";
import { Skeleton } from "./ui/skeleton";

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

export default function StoriesCarousel() {
  const { user: sessionUser } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [viewerUserIndex, setViewerUserIndex] = useState<number | null>(null);

  // Fetch stories with react-query
  const { data: groupedStories = [], isLoading, error } = useQuery<UserStories[]>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json<UserStories[]>(),
  });

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [groupedStories]);

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const offset = direction === "left" ? -320 : 320;
      containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-4 sm:bg-card sm:rounded-xl sm:border sm:border-border/40 w-full">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-shrink-0">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:bg-card text-destructive text-sm sm:rounded-xl sm:border sm:border-border/40 text-center">
        Failed to load stories
      </div>
    );
  }

  // Separate logged-in user stories from others to show them first
  const loggedInUserStories = groupedStories.find((item) => item.user.id === sessionUser.id);
  const otherStories = groupedStories.filter((item) => item.user.id !== sessionUser.id);

  // Prepend logged-in user stories to viewer sequence if they have stories
  const viewerStoriesList = loggedInUserStories
    ? [loggedInUserStories, ...otherStories]
    : otherStories;

  return (
    <div className="relative group/carousel w-full sm:rounded-xl bg-transparent sm:bg-card p-3 sm:p-4 sm:shadow-sm sm:border sm:border-border/40 select-none">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="hidden sm:flex absolute left-4 top-1/2 z-10 size-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-md border hover:bg-neutral-100 transition-all active:scale-95"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="hidden sm:flex absolute right-4 top-1/2 z-10 size-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-md border hover:bg-neutral-100 transition-all active:scale-95"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      {/* Stories Scroll Container */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {/* LOGGED IN USER CIRCLE */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 relative">
          <div
            onClick={() => {
              if (loggedInUserStories) {
                // Open story viewer at index 0 (self)
                setViewerUserIndex(0);
              } else {
                // Open create story dialog
                setCreateStoryOpen(true);
              }
            }}
            className="cursor-pointer relative"
          >
            {/* Gradient Outline Ring if has stories */}
            <div
              className={`rounded-full p-[2.5px] transition-transform duration-200 active:scale-95 ${
                loggedInUserStories
                  ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600"
                  : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            >
              <div className="bg-card p-[2px] rounded-full">
                <div className="relative size-14 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-border/10 flex items-center justify-center font-bold text-lg text-muted-foreground uppercase">
                  {sessionUser.avatarUrl ? (
                    <Image
                      src={sessionUser.avatarUrl}
                      alt="Your avatar"
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    sessionUser.username[0]
                  )}
                </div>
              </div>
            </div>

            {/* Blue Plus Icon Overlay */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening viewer
                setCreateStoryOpen(true);
              }}
              className="absolute bottom-0 right-0 bg-sky-500 hover:bg-sky-600 border-[2px] border-card text-white rounded-full p-0.5 size-[20px] flex items-center justify-center transition-colors active:scale-90"
              title="Add Story"
            >
              <Plus className="size-3 stroke-[3px]" />
            </button>
          </div>
          <span className="text-[12px] text-muted-foreground w-16 text-center truncate">
            Your Story
          </span>
        </div>

        {/* OTHER USERS CIRCLES */}
        {otherStories.map((item, idx) => {
          // In the viewer, idx will be idx + 1 if loggedInUserStories is prepended
          const viewerIndex = loggedInUserStories ? idx + 1 : idx;

          return (
            <div
              key={item.user.id}
              onClick={() => setViewerUserIndex(viewerIndex)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              {/* Gradient Outline Border Ring */}
              <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[2.5px] rounded-full transition-transform duration-200 active:scale-95">
                <div className="bg-card p-[2px] rounded-full">
                  <div className="relative size-14 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-border/10 flex items-center justify-center font-bold text-lg text-muted-foreground uppercase">
                    {item.user.avatarUrl ? (
                      <Image
                        src={item.user.avatarUrl}
                        alt={item.user.username}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      item.user.username[0]
                    )}
                  </div>
                </div>
              </div>
              {/* Username Label */}
              <span className="text-[12px] text-muted-foreground w-16 text-center truncate">
                {item.user.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* CREATE STORY DIALOG */}
      <CreateStoryDialog open={createStoryOpen} onClose={() => setCreateStoryOpen(false)} />

      {/* STORY VIEWER */}
      {viewerUserIndex !== null && (
        <StoryViewer
          groupedStories={viewerStoriesList}
          initialUserIndex={viewerUserIndex}
          open={viewerUserIndex !== null}
          onClose={() => setViewerUserIndex(null)}
        />
      )}
    </div>
  );
}
