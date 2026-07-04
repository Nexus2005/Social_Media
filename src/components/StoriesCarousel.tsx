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
    <div className="relative group/carousel w-full bg-white dark:bg-instagram-darkBg border-b border-instagram-lightBorder dark:border-instagram-darkBorder select-none pt-3 pb-1 px-4 sm:py-3 sm:px-0 transition-colors duration-200">
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
        className="flex gap-[14px] overflow-x-auto scroll-smooth scrollbar-none"
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
              className={`rounded-full p-[3px] transition-transform duration-200 active:scale-95 ${
                loggedInUserStories
                  ? "bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]"
                  : "bg-neutral-800"
              }`}
            >
              <div className="bg-white dark:bg-instagram-darkBg p-[2px] rounded-full">
                <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center font-bold text-lg text-muted-foreground uppercase">
                  {sessionUser.avatarUrl ? (
                    <Image
                      src={sessionUser.avatarUrl}
                      alt="Your avatar"
                      fill
                      sizes="72px"
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
              className="absolute bottom-0 right-0 bg-[#0095f6] hover:bg-[#1877f2] border-[3px] border-white dark:border-instagram-darkBg text-white rounded-full size-[24px] flex items-center justify-center transition-colors active:scale-90"
              title="Add Story"
            >
              <Plus className="size-3.5 stroke-[3px]" />
            </button>
          </div>
          <span className="text-[12px] font-medium text-instagram-lightText dark:text-instagram-darkText w-[76px] text-center truncate">
            Your story
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
              <div className="bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] p-[3px] rounded-full transition-transform duration-200 active:scale-95">
                <div className="bg-white dark:bg-instagram-darkBg p-[2px] rounded-full">
                  <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center font-bold text-lg text-muted-foreground uppercase">
                    {item.user.avatarUrl ? (
                      <Image
                        src={item.user.avatarUrl}
                        alt={item.user.username}
                        fill
                        sizes="72px"
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
              <span className="text-[12px] font-medium text-instagram-lightText dark:text-instagram-darkText w-[76px] text-center truncate">
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
