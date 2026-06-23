"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { X, Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause, Heart, Send, Share2, Search, Copy, Check, Loader2, MessageSquare } from "lucide-react";
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
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; left: number; rotate: number; drift: number }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sharing states
  const [searchQuery, setSearchQuery] = useState("");
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/95 backdrop-blur-sm select-none">
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
        className="relative w-full max-w-[420px] h-full sm:h-[90vh] sm:max-h-[760px] bg-black sm:rounded-xl overflow-hidden flex items-center justify-center z-10 shadow-2xl"
      >
        {/* Progress Bar Indicators at the top */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-30 pointer-events-none">
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
        <div className="absolute top-0 left-0 right-0 p-4 pt-7 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-20">
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

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Play/Pause Button */}
            <button
              onClick={togglePause}
              className="text-white hover:text-white/80 p-1 rounded-full transition-colors"
            >
              {isPaused ? <Play className="size-4 fill-white" /> : <Pause className="size-4 fill-white" />}
            </button>

            {/* Mute Button */}
            {currentStory.mediaType === "VIDEO" && (
              <button
                onClick={toggleMute}
                className="text-white hover:text-white/80 p-1 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:text-white/80 p-1 rounded-full transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Media Render (Image or Video) */}
        <div className="w-full h-full flex items-center justify-center">
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

        {/* Instant Emojis reactions panel */}
        {showEmojis && (
          <div 
            className="absolute bottom-16 left-4 right-4 z-40 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 animate-fade-in pointer-events-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Quick Reactions</span>
            <div className="grid grid-cols-6 gap-3">
              {["😂", "😮", "😍", "😢", "👏", "🔥"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendMessage(emoji)}
                  className="text-3xl hover:scale-125 transition-transform duration-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Reply/Action Bar */}
        <div 
          className="absolute bottom-4 left-4 right-4 z-40 flex items-center gap-3 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Send Message Input Bar */}
          <div className="flex-1 flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-3 py-1.5 h-10 relative">
            <input
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
              className="flex-grow bg-transparent text-white text-sm outline-none placeholder:text-zinc-500"
            />
            {inputText.trim() && (
              <button 
                onClick={() => handleSendMessage(inputText)}
                className="text-primary hover:text-primary-foreground font-semibold text-xs transition-colors shrink-0"
              >
                Send
              </button>
            )}
          </div>

          {/* Floating Hearts Container */}
          <div className="relative flex items-center justify-center shrink-0">
            {floatingHearts.map((heart) => (
              <Heart
                key={heart.id}
                style={{
                  left: `${heart.left}px`,
                  "--rotate-angle": `${heart.rotate}deg`,
                  "--drift-x": `${heart.drift}px`,
                } as React.CSSProperties}
                className="animate-floating-heart size-6 text-red-500 fill-red-500"
              />
            ))}
            
            {/* Heart Button */}
            <button
              onClick={handleLikeClick}
              className="text-white hover:scale-110 active:scale-95 transition-transform p-1 shrink-0"
            >
              <Heart className="size-6 hover:text-red-500 hover:fill-red-500 transition-colors" />
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={() => {
              setIsPaused(true);
              setShowShareSheet(true);
            }}
            className="text-white hover:scale-110 active:scale-95 transition-transform p-1 shrink-0"
          >
            <Send className="size-6" />
          </button>
        </div>

        {/* Share Bottom Sheet drawer */}
        {showShareSheet && (
          <div 
            className="absolute inset-0 z-50 bg-black/60 flex flex-col justify-end pointer-events-auto shadow-2xl"
            onClick={() => {
              setShowShareSheet(false);
              setIsPaused(false);
            }}
          >
            {/* Sheet Content Card */}
            <div 
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[75%] p-4 flex flex-col gap-3.5 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Handle bar */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
              
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-white text-base">Share Story</span>
                <button 
                  onClick={() => {
                    setShowShareSheet(false);
                    setIsPaused(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800/60 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700"
                />
              </div>

              {/* Contacts List */}
              <div className="flex-grow overflow-y-auto max-h-[220px] scrollbar-none flex flex-col gap-2">
                {loadingContacts ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-zinc-500" />
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact: any) => (
                    <button
                      key={contact.id}
                      onClick={() => handleShareToUser(contact)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/50 text-start transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative size-9 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                          {contact.image || contact.avatarUrl ? (
                            <img src={contact.image || contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase text-zinc-300">
                              {(contact.name || contact.username)[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">{contact.name || contact.displayName}</span>
                          <span className="text-xs text-zinc-500">@{contact.username}</span>
                        </div>
                      </div>
                      <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors">
                        Send
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="flex h-20 items-center justify-center text-xs text-zinc-500">
                    No contacts found.
                  </div>
                )}
              </div>

              {/* Sharing apps links */}
              <div className="border-t border-zinc-800/80 pt-3 flex justify-around gap-2 text-center text-white">
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-1.5 group">
                  <div className="size-11 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    {copied ? <Check className="size-5 text-green-500" /> : <Copy className="size-5" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 group-hover:text-white truncate max-w-[64px]">Copy link</span>
                </button>

                <button onClick={handleWhatsAppShare} className="flex flex-col items-center gap-1.5 group">
                  <div className="size-11 rounded-full bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 text-green-500 transition-colors">
                    <svg className="size-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.022-.08-.117-.146-.217-.196-.093-.047-.565-.278-.654-.311-.089-.033-.153-.05-.217.05-.064.098-.246.311-.301.373-.056.06-.112.067-.21.017-.1-.05-.413-.152-.788-.485-.29-.258-.487-.578-.544-.677-.056-.1-.006-.153.044-.203.046-.046.1-.116.15-.174.05-.058.067-.1.1-.166.033-.066.017-.123-.008-.174-.025-.05-.217-.52-.298-.714-.078-.189-.158-.163-.217-.163h-.185c-.066 0-.173.025-.264.124-.092.1-.35.341-.35.833s.358.966.408 1.033c.05.068.705 1.076 1.708 1.51.24.104.427.166.574.213.242.076.462.066.636.04.194-.029.565-.231.644-.454.079-.223.079-.413.056-.453zm-5.422 7.42-.004.004-.017.01c-.136.08-.29.124-.45.124H11.5c-4.963 0-9-4.037-9-9s4.037-9 9-9 9 4.037 9 9c0 1.954-.627 3.82-1.808 5.378l.002.002.008.016.033.072.115.25.105.228a.56.56 0 0 1 .05.21c0 .17-.075.33-.21.45L17.464 21.6l-.008.008a1.2 1.2 0 0 1-.84.392H16.5c-.244 0-.482-.075-.688-.22l-.128-.09-.344-.242a.56.56 0 0 0-.21-.05c-.07 0-.14.015-.205.045l-.453.21a9.04 9.04 0 0 1-2.43 1.157z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-zinc-400 group-hover:text-white truncate max-w-[64px]">WhatsApp</span>
                </button>

                <button onClick={handleSystemShare} className="flex flex-col items-center gap-1.5 group">
                  <div className="size-11 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <Share2 className="size-5" />
                  </div>
                  <span className="text-[10px] text-zinc-400 group-hover:text-white truncate max-w-[64px]">Share</span>
                </button>
              </div>
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
