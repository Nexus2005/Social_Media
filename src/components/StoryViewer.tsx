"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { X, Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause, Heart, Send, Share2, Search, Copy, Check, Loader2, MessageSquare, MoreHorizontal } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import Image from "next/image";
import { useSession } from "@/app/(main)/SessionProvider";
import { useChat } from "@/app/(main)/ChatProvider";

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
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; left: number; rotate: number; drift: number }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const currentStory = currentUserStories?.stories[storyIndex];

  // Reset states when switching users
  useEffect(() => {
    setStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
    setInputText("");
    setShowEmojis(false);
    setShowShareSheet(false);
    setShowOptionsSheet(false);
  }, [userIndex]);

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
    if (!open || !currentStory || isPaused || showEmojis || showShareSheet) {
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
      const shouldPlay = !isPaused && !showEmojis && !showShareSheet;
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

  // Flying hearts spawner
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
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
          style={{ transform: `translateY(${viewportOffsetTop}px)` }}
          className="absolute top-0 left-0 w-full z-50 transition-transform duration-75 ease-out pointer-events-none"
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
          style={{ transform: `translateY(${viewportOffsetTop}px)` }}
          className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
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

        {/* Instant Emojis reactions panel (Instagram-style overlay) */}
        {showEmojis && (
          <div 
            className="absolute left-0 right-0 z-30 bg-black/45 backdrop-blur-[6px] flex flex-col justify-center items-center pointer-events-auto transition-all duration-75 ease-out"
            style={{ 
              top: `${viewportOffsetTop}px`,
              height: window.visualViewport ? `${window.visualViewport.height}px` : "100%"
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
          style={{ transform: `translateY(${viewportOffsetTop - keyboardHeight}px)` }}
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
                className="text-white hover:scale-110 active:scale-95 transition-transform flex items-center justify-center w-full h-full"
                title="Like Story"
              >
                <Heart className="size-6 hover:text-red-500 hover:fill-red-500 transition-colors" strokeWidth={2} />
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
                          <div className="relative size-16.5 rounded-full bg-zinc-800 border border-zinc-800 shrink-0 shadow-md">
                            {contact.image || contact.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={contact.image || contact.avatarUrl} 
                                alt={contact.name} 
                                className="w-full h-full object-cover rounded-full" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-[20px] uppercase text-zinc-300 rounded-full">
                                {avatarText}
                              </div>
                            )}
                            
                            {/* Online Status Dot */}
                            {isUserOnline && (
                              <span className="absolute bottom-0.5 right-0.5 size-3.5 bg-green-500 border-2 border-[#121212] rounded-full" />
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
              
              {/* Report Action */}
              <button 
                onClick={handleReportStory}
                className="w-full py-4 text-center text-sm font-bold text-red-500 hover:bg-zinc-850/40 active:bg-zinc-850/60 rounded-xl transition-colors"
              >
                Report
              </button>
              
              <div className="h-px bg-zinc-800/60 my-0.5" />
              
              {/* Mute Action */}
              <button 
                onClick={handleMuteUser}
                className="w-full py-4 text-center text-sm font-semibold text-white hover:bg-zinc-850/40 active:bg-zinc-850/60 rounded-xl transition-colors"
              >
                Mute
              </button>
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
