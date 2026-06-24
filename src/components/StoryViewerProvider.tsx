"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import StoryViewer from "./StoryViewer";

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

interface StoryViewerContextType {
  showStory: (userId: string) => boolean;
  groupedStories: UserStories[];
}

const StoryViewerContext = createContext<StoryViewerContextType | null>(null);

export function StoryViewerProvider({ children }: { children: React.ReactNode }) {
  const { user: sessionUser } = useSession();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch stories with react-query
  const { data: groupedStories = [] } = useQuery<UserStories[]>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json<UserStories[]>(),
    staleTime: 60 * 1000,
  });

  // Re-order stories: logged-in user first
  const viewerStoriesList = useMemo(() => {
    const loggedInUserStories = groupedStories.find((item) => item.user.id === sessionUser?.id);
    const otherStories = groupedStories.filter((item) => item.user.id !== sessionUser?.id);
    return loggedInUserStories
      ? [loggedInUserStories, ...otherStories]
      : otherStories;
  }, [groupedStories, sessionUser?.id]);

  const showStory = useCallback((userId: string): boolean => {
    const idx = viewerStoriesList.findIndex((item) => item.user.id === userId);
    if (idx !== -1) {
      setActiveUserId(userId);
      setOpen(true);
      return true;
    }
    return false;
  }, [viewerStoriesList]);

  const activeUserIndex = useMemo(() => {
    if (!activeUserId) return -1;
    return viewerStoriesList.findIndex((item) => item.user.id === activeUserId);
  }, [activeUserId, viewerStoriesList]);

  const value = useMemo(() => ({
    showStory,
    groupedStories,
  }), [showStory, groupedStories]);

  return (
    <StoryViewerContext.Provider value={value}>
      {children}
      {open && activeUserIndex !== -1 && (
        <StoryViewer
          groupedStories={viewerStoriesList}
          initialUserIndex={activeUserIndex}
          open={open}
          onClose={() => {
            setOpen(false);
            setActiveUserId(null);
          }}
        />
      )}
    </StoryViewerContext.Provider>
  );
}

export function useStoryViewer() {
  const context = useContext(StoryViewerContext);
  if (!context) {
    throw new Error("useStoryViewer must be used within a StoryViewerProvider");
  }
  return context;
}
