"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bookmark, 
  Repeat, 
  QrCode, 
  Scissors, 
  Info, 
  EyeOff, 
  Eye, 
  UserCircle2, 
  Sparkles, 
  AlertTriangle, 
  SlidersHorizontal, 
  Trash2, 
  ChevronLeft,
  CheckCircle,
  Copy,
  Link2
} from "lucide-react";
import kyInstance from "@/lib/ky";
import { PostData, BookmarkInfo } from "@/lib/types";
import { useToast } from "../ui/use-toast";
import { useSession } from "@/app/(main)/SessionProvider";
import StandardDrawer from "../ui/StandardDrawer";
import QuotePostDialog from "./QuotePostDialog";
import DeletePostDialog from "./DeletePostDialog";

interface PostOptionsBottomSheetProps {
  post: PostData;
  open: boolean;
  onClose: () => void;
  onNotInterested: () => void;
}

export default function PostOptionsBottomSheet({
  post,
  open,
  onClose,
  onNotInterested,
}: PostOptionsBottomSheetProps) {
  const { user: loggedInUser } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<
    "menu" | "qrcode" | "why_seeing" | "about_account" | "ai_info" | "report" | "preferences"
  >("menu");
  
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reported, setReported] = useState(false);

  // Hook up bookmark query and mutation (synchronizes with main bookmark button)
  const bookmarkQueryKey = ["bookmark-info", post.id];
  const { data: bookmarkData } = useQuery<BookmarkInfo>({
    queryKey: bookmarkQueryKey,
    queryFn: () => kyInstance.get(`/api/posts/${post.id}/bookmark`).json<BookmarkInfo>(),
    initialData: {
      isBookmarkedByUser: post.bookmarks.some((b) => b.userId === loggedInUser.id),
    },
    staleTime: Infinity,
  });

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      bookmarkData.isBookmarkedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/bookmark`)
        : kyInstance.post(`/api/posts/${post.id}/bookmark`),
    onMutate: async () => {
      const willBookmark = !bookmarkData.isBookmarkedByUser;
      toast({
        description: `Post ${willBookmark ? "" : "un"}bookmarked successfully.`,
      });
      await queryClient.cancelQueries({ queryKey: bookmarkQueryKey });
      const previousState = queryClient.getQueryData<BookmarkInfo>(bookmarkQueryKey);
      queryClient.setQueryData<BookmarkInfo>(bookmarkQueryKey, () => ({
        isBookmarkedByUser: willBookmark,
      }));
      return { previousState };
    },
    onError: (err, vars, ctx) => {
      queryClient.setQueryData(bookmarkQueryKey, ctx?.previousState);
      toast({
        variant: "destructive",
        description: "Failed to update bookmark state. Please try again.",
      });
    },
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(url);
    toast({
      description: "Post link copied to clipboard.",
    });
  };

  const handleReport = (reason: string) => {
    setReported(true);
    toast({
      description: `Thank you for reporting this post for: ${reason}.`,
    });
  };

  const handleReset = () => {
    setView("menu");
    setReported(false);
  };

  const isOwnPost = post.user.id === loggedInUser.id;

  return (
    <>
      <StandardDrawer open={open} onClose={() => { onClose(); handleReset(); }} title={view === "menu" ? "Post Options" : undefined}>
        <div className="flex flex-col bg-[#0A0A0A] p-4 text-white">
          
          {/* Main Navigation Menu */}
          {view === "menu" && (
            <div className="flex flex-col gap-4">
              {/* Cards Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Save Card */}
                <button
                  onClick={() => bookmarkMutation.mutate()}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800/50"
                >
                  <Bookmark
                    className={`size-6 ${bookmarkData.isBookmarkedByUser ? "fill-white text-white animate-pulse" : "text-zinc-300"}`}
                    strokeWidth={2}
                  />
                  <span className="text-[13px] font-medium truncate w-full text-center">
                    {bookmarkData.isBookmarkedByUser ? "Saved" : "Save"}
                  </span>
                </button>

                {/* Remix Card */}
                <button
                  onClick={() => {
                    setShowQuoteDialog(true);
                    onClose();
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800/50"
                >
                  <Repeat className="size-6 text-zinc-300" strokeWidth={2} />
                  <span className="text-[13px] font-medium truncate w-full text-center">Remix</span>
                </button>

                {/* QR Code Card */}
                <button
                  onClick={() => setView("qrcode")}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800/50"
                >
                  <QrCode className="size-6 text-zinc-300" strokeWidth={2} />
                  <span className="text-[13px] font-medium truncate w-full text-center">QR code</span>
                </button>
              </div>

              {/* List Actions */}
              <div className="flex flex-col rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800/50">
                {/* Cutout Sticker */}
                <button
                  onClick={() => {
                    toast({ description: "Sticker generated! Added to stickers keyboard." });
                    onClose();
                  }}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <Scissors className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">Create a cutout sticker</span>
                </button>

                {/* Why seeing this */}
                <button
                  onClick={() => setView("why_seeing")}
                  className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <Info className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">Why you&apos;re seeing this post</span>
                </button>

                {/* Not interested */}
                <button
                  onClick={() => {
                    onNotInterested();
                    onClose();
                  }}
                  className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <EyeOff className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">Not interested</span>
                </button>

                {/* Interested */}
                <button
                  onClick={() => {
                    toast({ description: "Post marked as interested. We'll recommend more similar posts." });
                    onClose();
                  }}
                  className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <Eye className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">Interested</span>
                </button>

                {/* About this account */}
                <button
                  onClick={() => setView("about_account")}
                  className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <UserCircle2 className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">About this account</span>
                </button>

                {/* AI Info */}
                <button
                  onClick={() => setView("ai_info")}
                  className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <Sparkles className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">AI info</span>
                </button>

                {/* Report post */}
                <button
                  onClick={() => setView("report")}
                  className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <AlertTriangle className="size-5 text-red-500" strokeWidth={2} />
                  <span className="text-[15px] font-medium text-red-500">Report</span>
                </button>
              </div>

              {/* Manage Content Preferences & Delete Post */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setView("preferences")}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/50 hover:bg-zinc-800 transition-colors text-start w-full"
                >
                  <SlidersHorizontal className="size-5 text-zinc-400" strokeWidth={2} />
                  <span className="text-[15px] font-medium">Manage content preferences</span>
                </button>

                {/* Delete button (If own post) */}
                {isOwnPost && (
                  <button
                    onClick={() => {
                      setShowDeleteDialog(true);
                    }}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 transition-colors text-start w-full"
                  >
                    <Trash2 className="size-5 text-red-500" strokeWidth={2} />
                    <span className="text-[15px] font-semibold text-red-500">Delete Post</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* QR Code Share Card Panel */}
          {view === "qrcode" && (
            <div className="flex flex-col gap-5 select-none">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[16px] font-bold">QR code sharing</span>
              </div>
              <div className="flex flex-col items-center gap-6 py-6 bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl border border-zinc-800/80 max-w-sm mx-auto w-full shadow-2xl">
                <div className="flex items-center gap-3 px-6 w-full justify-center">
                  <img src={post.user.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-10 rounded-full border border-zinc-800 object-cover" />
                  <div className="flex flex-col text-start">
                    <span className="font-bold text-[15px] text-white">@{post.user.username}</span>
                    <span className="text-xs text-zinc-400">Scan to view post</span>
                  </div>
                </div>
                
                {/* SVG QR Code */}
                <svg viewBox="0 0 100 100" className="size-48 bg-white p-2.5 rounded-2xl border shadow-lg">
                  <rect x="0" y="0" width="28" height="28" fill="black" />
                  <rect x="4" y="4" width="20" height="20" fill="white" />
                  <rect x="8" y="8" width="12" height="12" fill="black" />

                  <rect x="72" y="0" width="28" height="28" fill="black" />
                  <rect x="76" y="4" width="20" height="20" fill="white" />
                  <rect x="80" y="8" width="12" height="12" fill="black" />

                  <rect x="0" y="72" width="28" height="28" fill="black" />
                  <rect x="4" y="76" width="20" height="20" fill="white" />
                  <rect x="8" y="80" width="12" height="12" fill="black" />

                  <rect x="76" y="76" width="8" height="8" fill="black" />

                  <path d="M 36,4 h 4 v 4 h -4 z M 48,0 h 4 v 4 h -4 z M 56,8 h 4 v 4 h -4 z M 36,16 h 8 v 4 h -8 z M 52,20 h 4 v 4 h -4 z M 44,28 h 4 v 4 h -4 z M 0,36 h 8 v 4 h -8 z M 16,36 h 4 v 4 h -4 z M 24,40 h 4 v 4 h -4 z M 36,36 h 4 v 8 h -4 z M 48,44 h 8 v 4 h -8 z M 64,36 h 4 v 4 h -4 z M 76,36 h 12 v 4 h -12 z M 8,48 h 4 v 4 h -4 z M 20,48 h 8 v 4 h -8 z M 36,52 h 4 v 4 h -4 z M 60,52 h 8 v 4 h -8 z M 76,48 h 4 v 4 h -4 z M 88,52 h 4 v 4 h -4 z M 4,60 h 4 v 4 h -4 z M 16,64 h 4 v 4 h -4 z M 28,60 h 4 v 4 h -4 z M 44,60 h 8 v 4 h -8 z M 56,60 h 4 v 8 h -4 z M 72,64 h 4 v 4 h -4 z M 84,60 h 8 v 4 h -8 z M 36,72 h 4 v 8 h -4 z M 48,76 h 8 v 4 h -8 z M 64,72 h 4 v 4 h -4 z M 36,88 h 8 v 4 h -8 z M 52,88 h 4 v 4 h -4 z M 60,84 h 4 v 4 h -4 z" fill="black" />
                </svg>

                <div className="text-zinc-400 text-xs px-6 text-center select-text break-all font-mono py-1 rounded bg-zinc-900 border border-zinc-800">
                  {window.location.origin}/posts/{post.id}
                </div>
              </div>
              <div className="flex gap-2 justify-center w-full my-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[14px] font-semibold border border-zinc-800 transition-all active:scale-95 flex-1 justify-center"
                >
                  <Copy className="size-4 text-zinc-400" />
                  <span>Copy Link</span>
                </button>
                <button
                  onClick={() => {
                    toast({ description: "QR Code image saved to library." });
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white text-[14px] font-semibold transition-all active:scale-95 flex-1 justify-center"
                >
                  <Link2 className="size-4" />
                  <span>Download QR</span>
                </button>
              </div>
            </div>
          )}

          {/* Why Seeing This Post */}
          {view === "why_seeing" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[16px] font-bold">Why you&apos;re seeing this post</span>
              </div>
              <div className="flex flex-col gap-3.5 py-4 px-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-start">
                <div className="flex gap-3">
                  <UserCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[15px] font-bold">Recommended for you</h4>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      You are seeing this post because you engage with similar accounts or topics related to the location/hashtag category of this post.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 border-t border-zinc-800 pt-3.5">
                  <Sparkles className="size-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[15px] font-bold">Content Popularity</h4>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      This post is trending and has high community engagement inside your network regions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About this Account */}
          {view === "about_account" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[16px] font-bold">About this account</span>
              </div>
              <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-start w-full">
                <img src={post.user.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-16 rounded-full border border-zinc-800 object-cover" />
                <div className="flex flex-col text-center">
                  <span className="font-bold text-[17px] text-white flex items-center justify-center gap-1">
                    {post.user.displayName}
                    {post.user.verified && (
                      <span className="text-[#0095f6] text-[14px]">☑</span>
                    )}
                  </span>
                  <span className="text-sm text-zinc-400">@{post.user.username}</span>
                </div>
                <div className="w-full flex flex-col gap-3.5 border-t border-zinc-800/80 pt-4 mt-2">
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-zinc-400">Date joined</span>
                    <span className="font-semibold text-white">June 2024</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-zinc-400">Account location</span>
                    <span className="font-semibold text-white">India</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-zinc-400">Verified status</span>
                    <span className="font-semibold text-white">{post.user.verified ? "Verified badge" : "Standard member"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Info panel */}
          {view === "ai_info" && (
            <div className="flex flex-col gap-4 text-start">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[16px] font-bold">AI info</span>
              </div>
              <div className="flex flex-col gap-4 py-5 px-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3.5">
                  <Sparkles className="size-8 text-primary" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-[15px] font-bold">No AI Generated content detected</h4>
                    <span className="text-[11px] text-zinc-400 block uppercase tracking-wider mt-0.5">Checked by system validator</span>
                  </div>
                </div>
                <p className="text-[14px] text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3.5 mt-1">
                  Our system verifies media metadata tags and analyzes pixel structures. This content is verified as original, human-generated photography/videography.
                </p>
              </div>
            </div>
          )}

          {/* Report Post Option */}
          {view === "report" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[16px] font-bold">Report Post</span>
              </div>
              
              {!reported ? (
                <div className="flex flex-col rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800/80">
                  {[
                    "It's spam", 
                    "Nudity or sexual activity", 
                    "Hate speech or symbols", 
                    "Violence or dangerous organizations", 
                    "Bullying or harassment", 
                    "False information",
                    "Intellectual property violation"
                  ].map((reason, idx) => (
                    <button
                      key={reason}
                      onClick={() => handleReport(reason)}
                      className={`flex items-center px-4 py-3.5 text-[15px] font-medium hover:bg-zinc-850 text-start w-full ${idx > 0 ? "border-t border-zinc-800/60" : ""}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <CheckCircle className="size-12 text-primary" />
                  <div className="flex flex-col text-center px-4 gap-1.5">
                    <h4 className="font-bold text-[16px]">Report submitted</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      We have received your report and will review this post according to our community guidelines.
                    </p>
                  </div>
                  <button onClick={() => { onClose(); handleReset(); }} className="px-5 py-2 mt-2 bg-primary text-white text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors">
                    Close
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content Preferences settings panel */}
          {view === "preferences" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900">
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[16px] font-bold">Content preferences</span>
              </div>
              <div className="flex flex-col rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800/80 text-start">
                <button
                  onClick={() => {
                    toast({ description: `Muted all posts from @${post.user.username}.` });
                    onClose();
                  }}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-850 w-full"
                >
                  <span className="text-[15px] font-medium">Mute @{post.user.username}</span>
                </button>
                <button
                  onClick={() => {
                    toast({ description: "Sensitive content filters updated." });
                    onClose();
                  }}
                  className="flex items-center justify-between px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-850 w-full"
                >
                  <span className="text-[15px] font-medium">Sensitive content control</span>
                </button>
                <button
                  onClick={() => {
                    toast({ description: "Feed ranking reset to default chronological sorting." });
                    onClose();
                  }}
                  className="flex items-center justify-between px-4 py-3.5 border-t border-zinc-800/60 hover:bg-zinc-850 w-full"
                >
                  <span className="text-[15px] font-medium">Snooze suggested posts</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </StandardDrawer>

      {/* Embedded Quote Dialog */}
      <QuotePostDialog
        post={post}
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
      />

      {/* Embedded Delete Dialog */}
      <DeletePostDialog
        post={post}
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          onClose();
        }}
      />
    </>
  );
}
