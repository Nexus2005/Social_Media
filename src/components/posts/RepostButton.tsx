"use client";

import { useState } from "react";
import { PostData } from "@/lib/types";
import { cn } from "@/lib/utils";
import kyInstance from "@/lib/ky";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "@/app/(main)/SessionProvider";
import { MessageSquareQuote, PenLine } from "lucide-react";
import { RepostIcon } from "@/components/icons/InstagramIcons";
import { useToast } from "../ui/use-toast";
import QuotePostDialog from "./QuotePostDialog";
import { motion } from "framer-motion";
import StandardDrawer from "../ui/StandardDrawer";

interface RepostButtonProps {
  post: PostData;
  variant?: "feed" | "reel" | "reel-desktop";
  onDesktopClick?: () => void;
  active?: boolean;
}

interface RepostInfo {
  reposts: number;
  isRepostedByUser: boolean;
}

export default function RepostButton({ post, variant = "feed", onDesktopClick, active }: RepostButtonProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const queryKey: QueryKey = ["repost-info", post.id];
  const [showRepostSheet, setShowRepostSheet] = useState(false);

  const initialState: RepostInfo = {
    reposts: post._count.reposts,
    isRepostedByUser: post.reposts.some((r) => r.userId === user.id),
  };

  // Wait, let's fetch the actual state from DB so it stays in sync
  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance.get(`/api/posts/${post.id}/repost`).json<RepostInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const createParticles = (parent: HTMLElement) => {
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement("div");
      particle.className = "orbit-particle";
      parent.appendChild(particle);
      
      const angle = (i / 8) * Math.PI * 2;
      const velocity = 35 + Math.random() * 20;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity;

      particle.style.opacity = "1";
      particle.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 0 }
      ], {
        duration: 800,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "forwards"
      });
      
      setTimeout(() => particle.remove(), 800);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      data.isRepostedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/repost`)
        : kyInstance.post(`/api/posts/${post.id}/repost`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousState = queryClient.getQueryData<RepostInfo>(queryKey);

      queryClient.setQueryData<RepostInfo>(queryKey, () => ({
        reposts:
          (previousState?.reposts || 0) + (previousState?.isRepostedByUser ? -1 : 1),
        isRepostedByUser: !previousState?.isRepostedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
    onSuccess: () => {
      // Invalidate the post feeds to refresh repost list
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      
      // Trigger particle effects if it was reposted
      if (data.isRepostedByUser) {
        const btnDesktop = document.getElementById(`repostBtn-desktop-${post.id}`);
        const btnMobile = document.getElementById(`repostBtn-mobile-${post.id}`);
        if (btnDesktop) createParticles(btnDesktop);
        if (btnMobile) createParticles(btnMobile);
        
        // Haptic feedback
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([20, 50, 20]);
        }
      }
    },
  });

  if (variant === "reel-desktop") {
    return (
      <>
        <div className="flex flex-col items-center gap-1.5">
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --orbit-speed: 0.8s;
            }

            .repost-trigger {
              position: relative;
              background: transparent;
              cursor: pointer;
              display: flex;
              justify-content: center;
              align-items: center;
              border: none;
              outline: none;
              transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
              -webkit-tap-highlight-color: transparent;
              border-radius: 50%;
            }

            /* Mobile size */
            .repost-trigger-mobile {
              width: 40px;
              height: 40px;
              background: rgba(243, 244, 246, 0.8);
              border: 1px solid rgba(0, 0, 0, 0.05);
              box-shadow: 
                  0 4px 10px rgba(0,0,0,0.05),
                  inset 0 -1px 2px rgba(0,0,0,0.02),
                  inset 0 1px 2px rgba(255,255,255,1);
            }
            .repost-trigger-mobile .symbol-svg {
              width: 20px;
              height: 20px;
            }

            /* Desktop size */
            .repost-trigger-desktop {
              width: 48px;
              height: 48px;
              background: rgba(243, 244, 246, 0.8);
              border: 1px solid rgba(0, 0, 0, 0.05);
              box-shadow: 
                  0 4px 10px rgba(0,0,0,0.05),
                  inset 0 -1px 2px rgba(0,0,0,0.02),
                  inset 0 1px 2px rgba(255,255,255,1);
            }
            .repost-trigger-desktop .symbol-svg {
              width: 22px;
              height: 22px;
            }

            .repost-trigger .symbol-svg {
              fill: none;
              stroke: #1a1a1a;
              stroke-width: 2.5;
              stroke-linecap: round;
              stroke-linejoin: round;
              transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease;
            }

            /* Dark mode overrides */
            .dark .repost-trigger-mobile, .dark .repost-trigger-desktop {
              background: rgba(27, 28, 38, 0.4);
              border: 1px solid rgba(255, 255, 255, 0.05);
              box-shadow: 
                  0 4px 10px rgba(0,0,0,0.2),
                  inset 0 -1px 2px rgba(0,0,0,0.1),
                  inset 0 1px 2px rgba(255,255,255,0.05);
            }
            .dark .repost-trigger .symbol-svg {
              stroke: #ffffff;
            }

            /* Luminous Aura for hover */
            .repost-trigger::before {
              content: '';
              position: absolute;
              inset: -4px;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
              border-radius: 50%;
              opacity: 0;
              transition: opacity 0.4s ease;
              z-index: -1;
            }
            .dark .repost-trigger::before {
              background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
            }

            .repost-trigger:hover {
              transform: translateY(-2px) scale(1.04);
            }
            .repost-trigger:hover::before {
              opacity: 1;
            }

            /* Success Pulse Ring */
            .pulse-ring {
              position: absolute;
              inset: 0;
              border: 2px solid #1a1a1a;
              border-radius: 50%;
              pointer-events: none;
              opacity: 0;
            }
            .dark .pulse-ring {
              border-color: #ffffff;
            }

            /* Interaction States */
            .repost-trigger.active {
              transform: scale(0.92);
            }

            .repost-trigger.loading .symbol-svg {
              animation: orbitRotation var(--orbit-speed) infinite linear;
            }

            /* Completed State - Light Mode (turns black/dark) */
            .repost-trigger.completed {
              background: #1a1a1a;
              box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
              border-color: transparent;
            }
            .repost-trigger.completed .symbol-svg {
              stroke: #ffffff !important;
              transform: rotate(360deg) scale(1.05);
            }
            .repost-trigger.completed .pulse-ring {
              animation: porcelainPulse 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
            }

            /* Completed State - Dark Mode (turns white/light) */
            .dark .repost-trigger.completed {
              background: #ffffff;
              box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
              border-color: transparent;
            }
            .dark .repost-trigger.completed .symbol-svg {
              stroke: #1a1a1a !important;
              transform: rotate(360deg) scale(1.05);
            }

            /* Animations */
            @keyframes orbitRotation {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes porcelainPulse {
              0% {
                  transform: scale(1);
                  opacity: 1;
                  border-width: 3px;
              }
              100% {
                  transform: scale(2.2);
                  opacity: 0;
                  border-width: 1px;
              }
            }

            /* Particle Orbiting Effect */
            .orbit-particle {
              position: absolute;
              width: 3px;
              height: 3px;
              background: #ffffff;
              border-radius: 50%;
              opacity: 0;
              pointer-events: none;
              z-index: 50;
            }
          `}} />
          <button
            id={`repostBtn-desktop-${post.id}`}
            onClick={() => {
              if (onDesktopClick) {
                onDesktopClick();
              } else {
                setShowRepostSheet(true);
              }
            }}
            className={cn(
              "repost-trigger repost-trigger-desktop",
              isPending && "loading active",
              data.isRepostedByUser && "completed",
              active && "ring-4 ring-indigo-500/20"
            )}
            title="Repost"
          >
            <div className="pulse-ring"></div>
            <svg className="symbol-svg" viewBox="0 0 24 24">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
          <span className="text-[10px] font-bold text-zinc-300 select-none">
            {data.reposts > 0 ? data.reposts.toLocaleString() : "0"}
          </span>
        </div>

        <StandardDrawer
          open={showRepostSheet}
          onClose={() => setShowRepostSheet(false)}
          hideHeader
          className="bg-zinc-950 border-t border-zinc-800 text-white sm:max-w-[420px]"
        >
          <div className="flex flex-col py-6 px-4 gap-1.5 select-none text-start bg-zinc-950">
            <button
              onClick={() => {
                mutate();
                setShowRepostSheet(false);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <RepostIcon
                className={cn(
                  "size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white",
                  data.isRepostedByUser && "text-green-500 group-hover:text-green-400"
                )}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  {data.isRepostedByUser ? "Undo repost" : "Repost"}
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                  Share this post with your followers
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowRepostSheet(false);
                setShowQuoteDialog(true);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <PenLine className="size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white" strokeWidth={2} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  Quote
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                  Add a comment, photo or GIF before you share this post
                </span>
              </div>
            </button>
          </div>
        </StandardDrawer>

        <QuotePostDialog
          post={post}
          open={showQuoteDialog}
          onClose={() => setShowQuoteDialog(false)}
        />
      </>
    );
  }

  if (variant === "reel") {
    return (
      <>
        <div className="flex flex-col items-center">
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --orbit-speed: 0.8s;
            }

            .repost-trigger {
              position: relative;
              background: transparent;
              cursor: pointer;
              display: flex;
              justify-content: center;
              align-items: center;
              border: none;
              outline: none;
              transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
              -webkit-tap-highlight-color: transparent;
              border-radius: 50%;
            }

            /* Mobile size */
            .repost-trigger-mobile {
              width: 40px;
              height: 40px;
              background: rgba(243, 244, 246, 0.8);
              border: 1px solid rgba(0, 0, 0, 0.05);
              box-shadow: 
                  0 4px 10px rgba(0,0,0,0.05),
                  inset 0 -1px 2px rgba(0,0,0,0.02),
                  inset 0 1px 2px rgba(255,255,255,1);
            }
            .repost-trigger-mobile .symbol-svg {
              width: 20px;
              height: 20px;
            }

            /* Desktop size */
            .repost-trigger-desktop {
              width: 48px;
              height: 48px;
              background: rgba(243, 244, 246, 0.8);
              border: 1px solid rgba(0, 0, 0, 0.05);
              box-shadow: 
                  0 4px 10px rgba(0,0,0,0.05),
                  inset 0 -1px 2px rgba(0,0,0,0.02),
                  inset 0 1px 2px rgba(255,255,255,1);
            }
            .repost-trigger-desktop .symbol-svg {
              width: 22px;
              height: 22px;
            }

            .repost-trigger .symbol-svg {
              fill: none;
              stroke: #1a1a1a;
              stroke-width: 2.5;
              stroke-linecap: round;
              stroke-linejoin: round;
              transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease;
            }

            /* Dark mode overrides */
            .dark .repost-trigger-mobile, .dark .repost-trigger-desktop {
              background: rgba(27, 28, 38, 0.4);
              border: 1px solid rgba(255, 255, 255, 0.05);
              box-shadow: 
                  0 4px 10px rgba(0,0,0,0.2),
                  inset 0 -1px 2px rgba(0,0,0,0.1),
                  inset 0 1px 2px rgba(255,255,255,0.05);
            }
            .dark .repost-trigger .symbol-svg {
              stroke: #ffffff;
            }

            /* Luminous Aura for hover */
            .repost-trigger::before {
              content: '';
              position: absolute;
              inset: -4px;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
              border-radius: 50%;
              opacity: 0;
              transition: opacity 0.4s ease;
              z-index: -1;
            }
            .dark .repost-trigger::before {
              background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
            }

            .repost-trigger:hover {
              transform: translateY(-2px) scale(1.04);
            }
            .repost-trigger:hover::before {
              opacity: 1;
            }

            /* Success Pulse Ring */
            .pulse-ring {
              position: absolute;
              inset: 0;
              border: 2px solid #1a1a1a;
              border-radius: 50%;
              pointer-events: none;
              opacity: 0;
            }
            .dark .pulse-ring {
              border-color: #ffffff;
            }

            /* Interaction States */
            .repost-trigger.active {
              transform: scale(0.92);
            }

            .repost-trigger.loading .symbol-svg {
              animation: orbitRotation var(--orbit-speed) infinite linear;
            }

            /* Completed State - Light Mode (turns black/dark) */
            .repost-trigger.completed {
              background: #1a1a1a;
              box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
              border-color: transparent;
            }
            .repost-trigger.completed .symbol-svg {
              stroke: #ffffff !important;
              transform: rotate(360deg) scale(1.05);
            }
            .repost-trigger.completed .pulse-ring {
              animation: porcelainPulse 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
            }

            /* Completed State - Dark Mode (turns white/light) */
            .dark .repost-trigger.completed {
              background: #ffffff;
              box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
              border-color: transparent;
            }
            .dark .repost-trigger.completed .symbol-svg {
              stroke: #1a1a1a !important;
              transform: rotate(360deg) scale(1.05);
            }

            /* Animations */
            @keyframes orbitRotation {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes porcelainPulse {
              0% {
                  transform: scale(1);
                  opacity: 1;
                  border-width: 3px;
              }
              100% {
                  transform: scale(2.2);
                  opacity: 0;
                  border-width: 1px;
              }
            }

            /* Particle Orbiting Effect */
            .orbit-particle {
              position: absolute;
              width: 3px;
              height: 3px;
              background: #ffffff;
              border-radius: 50%;
              opacity: 0;
              pointer-events: none;
              z-index: 50;
            }
          `}} />
          <button
            id={`repostBtn-mobile-${post.id}`}
            onClick={() => setShowRepostSheet(true)}
            className={cn(
              "repost-trigger repost-trigger-mobile",
              isPending && "loading active",
              data.isRepostedByUser && "completed"
            )}
            title="Repost"
          >
            <div className="pulse-ring"></div>
            <svg className="symbol-svg" viewBox="0 0 24 24">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
          <span className="text-[11px] font-semibold mt-0.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {data.reposts > 0 ? data.reposts.toLocaleString() : "Repost"}
          </span>
        </div>

        <StandardDrawer
          open={showRepostSheet}
          onClose={() => setShowRepostSheet(false)}
          hideHeader
          className="bg-zinc-950 border-t border-zinc-800 text-white sm:max-w-[420px]"
        >
          <div className="flex flex-col py-6 px-4 gap-1.5 select-none text-start bg-zinc-950">
            <button
              onClick={() => {
                mutate();
                setShowRepostSheet(false);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <RepostIcon
                className={cn(
                  "size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white",
                  data.isRepostedByUser && "text-green-500 group-hover:text-green-400"
                )}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  {data.isRepostedByUser ? "Undo repost" : "Repost"}
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                  Share this post with your followers
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowRepostSheet(false);
                setShowQuoteDialog(true);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <PenLine className="size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white" strokeWidth={2} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  Quote
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                  Add a comment, photo or GIF before you share this post
                </span>
              </div>
            </button>
          </div>
        </StandardDrawer>

        <QuotePostDialog
          post={post}
          open={showQuoteDialog}
          onClose={() => setShowQuoteDialog(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowRepostSheet(true)}
        className="h-11 px-2 flex items-center gap-2 hover:opacity-80 transition-opacity text-instagram-lightText dark:text-instagram-darkText"
        title="Repost"
      >
        <RepostIcon
          className={cn(
            "size-6",
            data.isRepostedByUser && "text-green-500"
          )}
        />
        {data.reposts > 0 && (
          <span className="text-[15px] font-semibold tabular-nums text-instagram-lightText dark:text-instagram-darkText">
            {data.reposts}
          </span>
        )}
      </button>

      <StandardDrawer
        open={showRepostSheet}
        onClose={() => setShowRepostSheet(false)}
        hideHeader
        className="bg-zinc-950 border-t border-zinc-800 text-white sm:max-w-[420px]"
      >
        <div className="flex flex-col py-6 px-4 gap-1.5 select-none text-start bg-zinc-950">
          <button
            onClick={() => {
              mutate();
              setShowRepostSheet(false);
            }}
            className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
          >
            <RepostIcon
              className={cn(
                "size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white",
                data.isRepostedByUser && "text-green-500 group-hover:text-green-400"
              )}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[16px] text-white leading-tight">
                {data.isRepostedByUser ? "Undo repost" : "Repost"}
              </span>
              <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                Share this post with your followers
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              setShowRepostSheet(false);
              setShowQuoteDialog(true);
            }}
            className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
          >
            <PenLine className="size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white" strokeWidth={2} />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[16px] text-white leading-tight">
                Quote
              </span>
              <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                Add a comment, photo or GIF before you share this post
              </span>
            </div>
          </button>
        </div>
      </StandardDrawer>

      <QuotePostDialog
        post={post}
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
      />
    </>
  );
}
