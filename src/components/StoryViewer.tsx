"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { X, Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause, Heart, Send, Share2, Search, Copy, Check, Loader2, MessageSquare, MoreHorizontal, Eye } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import Image from "next/image";
import { useSession } from "@/app/(main)/SessionProvider";
import { useChat } from "@/app/(main)/ChatProvider";
import kyInstance from "@/lib/ky";
import { useQueryClient } from "@tanstack/react-query";

interface StoryViewData {
  id: string;
  viewedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface StoryLikeData {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  createdAt: string;
  isLiked?: boolean;
  views?: StoryViewData[];
  likes?: StoryLikeData[];
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
  const { user: loggedInUser } = useSession();
  const chatClient = useChat();

  const queryClient = useQueryClient();

  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Story Reply UI states
  const [inputText, setInputText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showViewsDrawer, setShowViewsDrawer] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; left: number; rotate: number; drift: number }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [likedState, setLikedState] = useState<Record<string, boolean>>({});

  // Sharing states
  const [searchQuery, setSearchQuery] = useState("");
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);
  const [stageHeight, setStageHeight] = useState<string>("100%");
  const [isMobile, setIsMobile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const storyDuration = 5000; // 5 seconds for images

  const currentUserStories = groupedStories[userIndex];
  const currentStory = currentUserStories?.stories[storyIndex] || currentUserStories?.stories[0];

  const isCurrentlyLiked = likedState[currentStory?.id] ?? currentStory?.isLiked ?? false;

  // Sync like state when story changes
  useEffect(() => {
    if (currentStory) {
      setLikedState((prev) => ({
        ...prev,
        [currentStory.id]: currentStory.isLiked ?? false,
      }));
    }
  }, [currentStory?.id, currentStory?.isLiked]);

  // Reset story index when switching users
  useEffect(() => {
    setStoryIndex(0);
  }, [userIndex]);

  // Reset states when switching stories
  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
    setInputText("");
    setShowEmojis(false);
    setShowShareSheet(false);
    setShowOptionsSheet(false);
    setShowViewsDrawer(false);
  }, [userIndex, storyIndex]);

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
      setStoryIndex(groupedStories[prevUserIndex].stories.length - 1);
      setProgress(0);
    } else {
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [storyIndex, userIndex, groupedStories]);

  // Progress Bar Animation Loop
  useEffect(() => {
    if (!open || !currentStory || isPaused || showEmojis || showShareSheet || showViewsDrawer) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const isVideo = currentStory.mediaType === "VIDEO";
    if (isVideo) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

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
  }, [open, userIndex, storyIndex, isPaused, showEmojis, showShareSheet, currentStory, handleNext]);

  // Video Time Update listener
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isPaused || showEmojis || showShareSheet) return;

    const currentProgress = (video.currentTime / video.duration) * 100;
    setProgress(currentProgress);
  };

  // Video Finished listener
  const handleVideoEnded = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // Handle Video Autoplay & pause on interactions
  useEffect(() => {
    const video = videoRef.current;
    if (video && currentStory?.mediaType === "VIDEO") {
      const shouldPlay = !isPaused && !showEmojis && !showShareSheet && !showViewsDrawer;
      if (shouldPlay) {
        video.play().catch((err) => {
          console.error("Autoplay failed:", err);
        });
      } else {
        video.pause();
      }
    }
  }, [currentStory, userIndex, storyIndex, isPaused, showEmojis, showShareSheet]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      // Do not navigate if input is focused
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleNext, handlePrev, onClose]);

  // Detect mobile width (sm breakpoint is 640px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Adjust bottom layout offset based on soft keyboard height dynamically
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const offset = window.innerHeight - viewport.height;
        setKeyboardHeight(offset > 80 ? offset : 0);
        setViewportOffsetTop(viewport.offsetTop || 0);
        window.scrollTo(0, 0);
      }
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  // Set fixed Stage Container height when keyboard is active to prevent resizing and shifting
  useEffect(() => {
    if (!open) return;
    setStageHeight(`${window.innerHeight}px`);

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const offset = window.innerHeight - viewport.height;
        // Only update base stage height when keyboard is not visible
        if (offset <= 80) {
          setStageHeight(`${window.innerHeight}px`);
        }
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, [open]);

  // Lock body/html scroll when story viewer is open
  useEffect(() => {
    if (!open) return;

    const originalBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      height: document.body.style.height,
      width: document.body.style.width,
      top: document.body.style.top,
    };
    const originalHtmlStyles = {
      overflow: document.documentElement.style.overflow,
      position: document.documentElement.style.position,
      height: document.documentElement.style.height,
      width: document.documentElement.style.width,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.height = "100%";
    document.body.style.width = "100%";
    document.body.style.top = "0";

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "fixed";
    document.documentElement.style.height = "100%";
    document.documentElement.style.width = "100%";

    return () => {
      Object.assign(document.body.style, originalBodyStyles);
      Object.assign(document.documentElement.style, originalHtmlStyles);
    };
  }, [open]);

  // Prevent window scroll offset when story is active/focused
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [open]);

  // Record view on mount / story change if not own story
  useEffect(() => {
    if (!open || !currentStory || !currentUserStories) return;
    if (currentUserStories.user.id === loggedInUser.id) return;

    const recordView = async () => {
      try {
        await kyInstance.post(`/api/stories/${currentStory.id}/view`);
      } catch (err) {
        console.error("Failed to record story view:", err);
      }
    };
    recordView();
  }, [open, currentStory?.id, currentUserStories?.user?.id, loggedInUser.id]);

  // Fetch active contacts when share drawer is opened
  useEffect(() => {
    if (!showShareSheet || !chatClient || !loggedInUser) return;

    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const filter = { members: { $in: [loggedInUser.id] } };
        const list = await chatClient.queryChannels(filter, { last_message_at: -1 }, { limit: 8 });
        
        const users = list.map((c) => {
          const m = Object.values(c.state.members || {});
          return m.find((member) => member.user?.id !== loggedInUser.id)?.user;
        }).filter(Boolean);
        
        setContactedUsers(users);
      } catch (err) {
        console.error("Failed to fetch contacted users:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    
    fetchContacts();
  }, [showShareSheet, chatClient, loggedInUser]);

  // Local filter for searched people in the share sheet
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contactedUsers;
    return contactedUsers.filter((u) => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contactedUsers, searchQuery]);

  if (!open || !currentUserStories || !currentStory) return null;

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

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

  // Direct Message reply deliverer
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !chatClient || !loggedInUser || !currentUserStories?.user) return;
    
    const targetUserId = currentUserStories.user.id;
    setInputText("");
    setShowEmojis(false);
    setIsPaused(false);

    try {
      const channel = chatClient.channel("messaging", {
        members: [loggedInUser.id, targetUserId],
      });
      await channel.watch();

      await channel.sendMessage({
        text: text,
        attachments: [
          {
            type: "story-reply",
            storyId: currentStory.id,
            mediaUrl: currentStory.mediaUrl,
            mediaType: currentStory.mediaType,
            username: currentUserStories.user.username,
          }
        ]
      });

      setToastMessage("Message sent");
      setTimeout(() => setToastMessage(null), 2000);
    } catch (err) {
      console.error("Failed to send story reply:", err);
    }
  };

  // Direct Message share deliverer
  const handleShareToUser = async (user: any) => {
    if (!chatClient || !loggedInUser) return;
    try {
      const channel = chatClient.channel("messaging", {
        members: [loggedInUser.id, user.id],
      });
      await channel.watch();
      
      await channel.sendMessage({
        text: "Sent a story",
        attachments: [
          {
            type: "story-reply",
            storyId: currentStory.id,
            mediaUrl: currentStory.mediaUrl,
            mediaType: currentStory.mediaType,
            username: currentUserStories.user.username,
          }
        ]
      });
      
      setToastMessage("Shared successfully");
      setTimeout(() => setToastMessage(null), 2000);
      setShowShareSheet(false);
      setIsPaused(false);
    } catch (err) {
      console.error("Failed to share story:", err);
    }
  };

  // Flying hearts spawner & database update
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentStory) return;

    // Trigger floating heart
    const newHeart = {
      id: Date.now() + Math.random(),
      left: Math.random() * 40 - 20, 
      rotate: Math.random() * 40 - 20, 
      drift: Math.random() * 60 - 30, 
    };
    
    setFloatingHearts((prev) => [...prev, newHeart]);
    
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1500);

    const wasLiked = isCurrentlyLiked;
    const newLiked = !wasLiked;

    // Optimistically update local state
    setLikedState((prev) => ({
      ...prev,
      [currentStory.id]: newLiked,
    }));

    try {
      const response = await kyInstance.post(`/api/stories/${currentStory.id}/like`).json<{ liked: boolean }>();
      
      // Update cache
      queryClient.setQueryData<UserStories[]>(["stories"], (old) => {
        if (!old) return old;
        return old.map((userStories) => {
          return {
            ...userStories,
            stories: userStories.stories.map((story) => {
              if (story.id === currentStory.id) {
                let updatedLikes = story.likes || [];
                if (response.liked) {
                  const alreadyLiked = updatedLikes.some((l) => l.user.id === loggedInUser.id);
                  if (!alreadyLiked) {
                    updatedLikes = [
                      ...updatedLikes,
                      {
                        id: "temp-" + Date.now(),
                        createdAt: new Date().toISOString(),
                        user: {
                          id: loggedInUser.id,
                          username: loggedInUser.username,
                          displayName: loggedInUser.displayName,
                          avatarUrl: loggedInUser.avatarUrl,
                        },
                      },
                    ];
                  }
                } else {
                  updatedLikes = updatedLikes.filter((l) => l.user.id !== loggedInUser.id);
                }

                return {
                  ...story,
                  isLiked: response.liked,
                  likes: updatedLikes,
                };
              }
              return story;
            }),
          };
        });
      });
    } catch (err) {
      console.error("Failed to toggle story like:", err);
      // Revert optimistic update
      setLikedState((prev) => ({
        ...prev,
        [currentStory.id]: wasLiked,
      }));
    }
  };

  const handleMuteUser = () => {
    setToastMessage(`Muted @${currentUserStories.user.username}`);
    setTimeout(() => setToastMessage(null), 2000);
    setShowOptionsSheet(false);
    
    // Skip to next user stories
    if (userIndex < groupedStories.length - 1) {
      setUserIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleReportStory = () => {
    setToastMessage("Story reported");
    setTimeout(() => setToastMessage(null), 2000);
    setShowOptionsSheet(false);
    setIsPaused(false);
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await kyInstance.delete(`/api/stories/${currentStory.id}`);

      setToastMessage("Story deleted");
      setTimeout(() => setToastMessage(null), 2000);
      setShowOptionsSheet(false);

      const currentStoriesCount = currentUserStories.stories.length;
      const isLastStoryOfUser = storyIndex === currentStoriesCount - 1;

      // Update cache
      queryClient.setQueryData<UserStories[]>(["stories"], (old) => {
        if (!old) return old;
        return old.map((userStories) => {
          if (userStories.user.id === loggedInUser.id) {
            return {
              ...userStories,
              stories: userStories.stories.filter((s) => s.id !== currentStory.id),
            };
          }
          return userStories;
        }).filter((userStories) => userStories.stories.length > 0);
      });

      if (currentStoriesCount > 1) {
        if (isLastStoryOfUser) {
          setStoryIndex(storyIndex - 1);
        } else {
          // Shifting: index stays same, progress resets
          setProgress(0);
        }
      } else {
        if (userIndex < groupedStories.length - 1) {
          setUserIndex((prev) => prev + 1);
        } else {
          onClose();
        }
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
      setToastMessage("Failed to delete story");
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // Copy Link deep link builder
  const handleCopyLink = () => {
    const link = `${window.location.origin}/stories?userId=${currentUserStories.user.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setToastMessage("Link copied");
    setTimeout(() => {
      setCopied(false);
      setToastMessage(null);
    }, 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out @${currentUserStories.user.username}'s story on Cartly!`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleXShare = () => {
    const text = encodeURIComponent(`Check out @${currentUserStories.user.username}'s story on Cartly!`);
    const url = encodeURIComponent(`${window.location.origin}/stories?userId=${currentUserStories.user.id}`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleSmsShare = () => {
    const text = encodeURIComponent(`Check out @${currentUserStories.user.username}'s story on Cartly! ${window.location.origin}/stories?userId=${currentUserStories.user.id}`);
    window.open(`sms:?&body=${text}`, "_blank");
  };

  const handleSystemShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Story by @${currentUserStories.user.username}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen h-[100dvh] z-50 flex items-center justify-center bg-neutral-950/95 backdrop-blur-sm select-none overflow-hidden">
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
        onClick={handleScreenClick}
        style={{ height: isMobile ? stageHeight : undefined }}
        className="relative w-full max-w-[420px] h-[100dvh] sm:h-[90vh] sm:max-h-[760px] bg-black sm:rounded-xl overflow-hidden flex items-center justify-center z-10 shadow-2xl"
      >
        {/* Pinned Top Container (Header & Progress Bars) */}
        <div 
          className="absolute top-0 left-0 w-full z-50 pointer-events-none"
        >
          {/* Progress Bar Indicators at the top */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 pointer-events-none">
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
          <div className="w-full p-4 pt-7 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white pointer-events-auto">
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

            <div className="flex items-center gap-2">
              {/* Eye (Views) Button for Own Stories */}
              {currentUserStories.user.id === loggedInUser.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(true);
                    setShowViewsDrawer(true);
                  }}
                  className="text-white hover:text-white/80 p-1 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 mr-1"
                  title="View statistics"
                >
                  <Eye className="size-5 hover:opacity-85 transition-opacity" />
                  <span className="text-[12px] font-semibold">
                    {currentStory.views?.length || 0}
                  </span>
                </button>
              )}

              {/* Play/Pause Button */}
              <button
                onClick={togglePause}
                className="text-white hover:text-white/80 p-1 rounded-full transition-colors cursor-pointer"
              >
                {isPaused ? <Play className="size-4 fill-white" /> : <Pause className="size-4 fill-white" />}
              </button>

              {/* Mute Button */}
              {currentStory.mediaType === "VIDEO" && (
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-white/80 p-1 rounded-full transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              )}

              {/* Options Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                  setShowOptionsSheet(true);
                }}
                className="text-white hover:text-white/80 p-1.5 rounded-full transition-colors cursor-pointer"
                title="More options"
              >
                <MoreHorizontal className="size-5" />
              </button>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-white hover:text-white/80 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Render (Image or Video) */}
        <div 
          className="w-full h-full flex items-center justify-center"
        >
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

        {/* Views & Likes Bottom Sheet drawer */}
        {showViewsDrawer && currentUserStories.user.id === loggedInUser.id && (
          <div 
            className="absolute left-0 right-0 z-[60] bg-black/60 flex flex-col justify-end pointer-events-auto shadow-2xl transition-all duration-75 ease-out"
            style={{
              top: `${viewportOffsetTop}px`,
              height: window.visualViewport ? `${window.visualViewport.height}px` : "100%"
            }}
            onClick={() => {
              setShowViewsDrawer(false);
              setIsPaused(false);
            }}
          >
            {/* Sheet Content Card */}
            <div 
              className="bg-[#121212] border-t border-zinc-800 rounded-t-3xl max-h-[60%] p-4.5 flex flex-col gap-4 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Handle bar */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
              
              <div className="relative flex items-center justify-center mt-1 py-1">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-bold text-white text-[17px]">Viewers</span>
                  <span className="text-[12px] text-zinc-400 font-semibold">
                    {currentStory.views?.length || 0} views
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setShowViewsDrawer(false);
                    setIsPaused(false);
                  }}
                  className="absolute right-1 text-zinc-400 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Viewers List */}
              <div className="flex-grow overflow-y-auto max-h-[300px] min-h-[150px] scrollbar-none px-1 space-y-4">
                {currentStory.views && currentStory.views.length > 0 ? (
                  currentStory.views.map((view) => {
                    const viewer = view.user;
                    const liked = currentStory.likes?.some((l) => l.user.id === viewer.id);
                    return (
                      <div key={view.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 rounded-full overflow-hidden bg-neutral-800 border border-zinc-800 shrink-0">
                            {viewer.avatarUrl ? (
                              <Image 
                                src={viewer.avatarUrl} 
                                alt={viewer.username} 
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-sm uppercase text-zinc-300">
                                {viewer.username[0]}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-white">
                              {viewer.displayName || viewer.username}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              @{viewer.username} • {formatRelativeDate(new Date(view.viewedAt))}
                            </span>
                          </div>
                        </div>

                        {/* Heart icon if they liked it */}
                        {liked && (
                          <div className="flex items-center justify-center w-8 h-8 mr-1 shrink-0">
                            <Heart className="size-5 text-red-500 fill-red-500 animate-pulse-once" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-zinc-500 gap-2">
                    <Eye className="size-8 stroke-[1.5px]" />
                    <span>No views yet</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instant Emojis reactions panel (Instagram-style overlay) */}
        {showEmojis && (
          <div 
            className="absolute inset-0 z-30 bg-black/45 backdrop-blur-[6px] flex flex-col justify-center items-center pointer-events-auto transition-all duration-75 ease-out"
            style={{ 
              paddingBottom: `${keyboardHeight}px`
            }}
            onClick={() => {
              setShowEmojis(false);
              setIsPaused(false);
              document.getElementById("story-input")?.blur();
            }}
          >
            {/* Emojis Grid (Centered) */}
            <div 
              className="flex flex-col items-center justify-center gap-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="grid grid-cols-3 gap-x-12 gap-y-10">
                {["😂", "😮", "😍", "😢", "👏", "🔥"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendMessage(emoji)}
                    className="text-[52px] transition-transform duration-150 active:scale-90 hover:scale-115 cursor-pointer flex items-center justify-center w-16 h-16 animate-pulse-once"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Reply/Action Bar (Instagram-style Pill Input + Right Actions) */}
        <div 
          className="absolute bottom-4 left-4 right-4 z-40 flex items-center gap-3 pointer-events-auto transition-transform duration-75 ease-out"
          style={{ transform: `translateY(${-keyboardHeight}px)` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Send Message Input Pill */}
          <div className="flex-1 flex items-center bg-transparent border border-white/35 hover:border-white/50 focus-within:border-white/60 focus-within:bg-black/10 rounded-full px-4 py-2 h-[42px] relative transition-all duration-200 min-w-0">
            <input
              id="story-input"
              type="text"
              placeholder="Send message"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => {
                setIsPaused(true);
                setShowEmojis(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowEmojis(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage(inputText);
                }
              }}
              className="w-full min-w-0 bg-transparent text-white text-[16px] md:text-sm outline-none placeholder:text-white/60 pr-2 clip-path"
            />
            {inputText.trim() && (
              <button 
                onClick={() => handleSendMessage(inputText)}
                className="text-primary hover:text-primary-foreground font-semibold text-xs transition-colors shrink-0 pl-1"
              >
                Send
              </button>
            )}
          </div>

          {/* Action Icons tightly aligned right outside of text input, perfectly vertical-centered */}
          <div className="flex items-center gap-3 shrink-0 h-[42px]">
            {/* Floating Hearts + Heart/Like Button */}
            <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
              {floatingHearts.map((heart) => (
                <Heart
                  key={heart.id}
                  style={{
                    left: `${heart.left}px`,
                    "--rotate-angle": `${heart.rotate}deg`,
                    "--drift-x": `${heart.drift}px`,
                  } as React.CSSProperties}
                  className="absolute bottom-full mb-2 animate-floating-heart size-6 text-red-500 fill-red-500 pointer-events-none"
                />
              ))}
              
              <button
                onClick={handleLikeClick}
                className={`hover:scale-110 active:scale-95 transition-transform flex items-center justify-center w-full h-full ${
                  isCurrentlyLiked ? "text-red-500" : "text-white"
                }`}
                title="Like Story"
              >
                <Heart 
                  className={`size-6 transition-colors ${
                    isCurrentlyLiked ? "fill-red-500 text-red-500 animate-pulse-once" : "hover:text-red-500 hover:fill-red-500"
                  }`} 
                  strokeWidth={2} 
                />
              </button>
            </div>

            {/* Paper Airplane (Share) Button */}
            <button
              onClick={() => {
                setIsPaused(true);
                setShowShareSheet(true);
              }}
              className="text-white hover:scale-110 active:scale-95 transition-transform flex items-center justify-center w-8 h-8 shrink-0"
              title="Share Story"
            >
              <Send className="size-6 hover:opacity-85 transition-opacity" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Share Bottom Sheet drawer */}
        {showShareSheet && (
          <div 
            className="absolute left-0 right-0 z-[60] bg-black/60 flex flex-col justify-end pointer-events-auto shadow-2xl transition-all duration-75 ease-out"
            style={{
              top: `${viewportOffsetTop}px`,
              height: window.visualViewport ? `${window.visualViewport.height}px` : "100%"
            }}
            onClick={() => {
              setShowShareSheet(false);
              setIsPaused(false);
            }}
          >
            {/* Sheet Content Card */}
            <div 
              className="bg-[#121212] border-t border-zinc-800 rounded-t-3xl max-h-[80%] p-4.5 flex flex-col gap-4 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Handle bar */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
              
              <div className="relative flex items-center justify-center mt-1 px-1 py-1">
                <span className="font-bold text-white text-[17px]">Share</span>
                <button 
                  onClick={() => {
                    setShowShareSheet(false);
                    setIsPaused(false);
                  }}
                  className="absolute right-1 text-zinc-400 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative px-1">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-550" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#262626] border border-transparent rounded-xl py-2 pl-10 pr-4 text-[16px] md:text-[14px] text-white placeholder:text-zinc-550 outline-none focus:border-zinc-700"
                />
              </div>

              {/* Contacts Grid (3-column) */}
              <div className="flex-grow overflow-y-auto max-h-[260px] min-h-[180px] scrollbar-none px-1">
                {loadingContacts ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : filteredContacts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-y-6 gap-x-3 py-2 justify-items-center">
                    {filteredContacts.map((contact: any) => {
                      // High-fidelity online status and verification mock logic
                      const isUserOnline = contact.online ?? (contact.id.charCodeAt(0) % 2 === 0);
                      const avatarText = (contact.name || contact.displayName || contact.username || "?")[0];

                      return (
                        <button
                          key={contact.id}
                          onClick={() => handleShareToUser(contact)}
                          className="flex flex-col items-center text-center gap-1.5 group w-full max-w-[90px] transition-transform active:scale-95"
                        >
                          <div className="relative size-12 rounded-full bg-[#2a87d0] border border-zinc-800 shrink-0 shadow-md flex items-center justify-center">
                            {contact.image || contact.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={contact.image || contact.avatarUrl} 
                                alt={contact.name} 
                                className="w-full h-full object-cover rounded-full" 
                              />
                            ) : (
                              <span className="font-bold text-[16px] uppercase text-white select-none">
                                {avatarText}
                              </span>
                            )}
                            
                            {/* Online Status Dot */}
                            {isUserOnline && (
                              <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-[#121212] rounded-full shadow-sm" />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-center gap-0.5 w-full px-1">
                            <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate">
                              {contact.name || contact.displayName || contact.username}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-zinc-500">
                    No contacts found.
                  </div>
                )}
              </div>

              {/* High-fidelity Brand Assets sharing row */}
              <div className="border-t border-zinc-800/80 pt-4 pb-2 flex items-center text-center text-white overflow-x-auto scrollbar-none gap-6 px-4 flex-nowrap">
                {[
                  { id: "copy", name: "Copy link", iconUrl: "/icons/social-media/icons8-link.gif", action: handleCopyLink },
                  { id: "whatsapp", name: "WhatsApp", iconUrl: "/icons/social-media/whatsapp.svg", action: handleWhatsAppShare },
                  { id: "x", name: "X", iconUrl: "/icons/social-media/x.svg", action: handleXShare },
                  { id: "sms", name: "SMS", iconUrl: "/icons/social-media/sms.svg", action: handleSmsShare },
                  { id: "whatsapp-status", name: "Status", iconUrl: "/icons/social-media/whatsapp-status.svg", action: handleWhatsAppShare },
                  { id: "share", name: "Share", iconUrl: "/icons/social-media/share.svg", action: handleSystemShare }
                ].map((channel) => (
                  <button 
                    key={channel.id}
                    onClick={channel.action}
                    className="flex flex-col items-center gap-1.5 group select-none transition-transform active:scale-95 shrink-0"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md">
                      {channel.id === "copy" && copied ? (
                        <div className="w-full h-full bg-[#262626] flex items-center justify-center rounded-full">
                          <Check className="size-5 text-green-500" />
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={channel.iconUrl} 
                          alt={channel.name} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white truncate max-w-[70px] leading-tight">
                      {channel.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Report / Mute Options Bottom Sheet */}
        {showOptionsSheet && (
          <div 
            className="absolute left-0 right-0 z-[60] bg-black/60 flex flex-col justify-end pointer-events-auto transition-all duration-75 ease-out"
            style={{
              top: `${viewportOffsetTop}px`,
              height: window.visualViewport ? `${window.visualViewport.height}px` : "100%"
            }}
            onClick={() => {
              setShowOptionsSheet(false);
              setIsPaused(false);
            }}
          >
            <div 
              className="bg-[#1c1c1e] border-t border-zinc-800 rounded-t-3xl p-4.5 flex flex-col gap-1.5 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Handle Bar */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />
              
              {currentUserStories.user.id === loggedInUser.id ? (
                /* Own Story options: Delete */
                <button 
                  onClick={handleDeleteStory}
                  className="w-full py-4 text-center text-sm font-bold text-red-500 hover:bg-zinc-850/40 active:bg-zinc-850/60 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Delete Story
                </button>
              ) : (
                /* Other user story options: Report & Mute */
                <>
                  <button 
                    onClick={handleReportStory}
                    className="w-full py-4 text-center text-sm font-bold text-red-500 hover:bg-zinc-850/40 active:bg-zinc-850/60 rounded-xl transition-colors cursor-pointer"
                  >
                    Report
                  </button>
                  
                  <div className="h-px bg-zinc-800/60 my-0.5" />
                  
                  <button 
                    onClick={handleMuteUser}
                    className="w-full py-4 text-center text-sm font-semibold text-white hover:bg-zinc-850/40 active:bg-zinc-850/60 rounded-xl transition-colors cursor-pointer"
                  >
                    Mute
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-zinc-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in shrink-0">
          <MessageSquare className="size-3.5 text-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
