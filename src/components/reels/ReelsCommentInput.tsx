"use client";

import { PostData } from "@/lib/types";
import { Loader2, SendHorizonal, Image as ImageIcon, Smile, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useSubmitCommentMutation } from "../comments/mutations";
import kyInstance from "@/lib/ky";
import { toast } from "../ui/use-toast";

interface ReelsCommentInputProps {
  post: PostData;
  parentCommentId?: string;
  onSuccess?: () => void;
}

export default function ReelsCommentInput({ post, parentCommentId, onSuccess }: ReelsCommentInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [triggerType, setTriggerType] = useState<"mention" | "hashtag" | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useSubmitCommentMutation(post.id);

  const quickEmojis = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim()) return;

    mutation.mutate(
      {
        postId: post.id,
        postUserId: post.user.id,
        content: input,
        parentCommentId: parentCommentId,
      },
      {
        onSuccess: () => {
          setInput("");
          setSuggestions([]);
          setTriggerType(null);
          if (onSuccess) onSuccess();
        },
      },
    );
  }

  const handleInputChange = async (val: string) => {
    setInput(val);

    const words = val.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@") && lastWord.length > 1) {
      const q = lastWord.slice(1);
      setTriggerType("mention");
      try {
        const res = await kyInstance.get(`/api/search/autocomplete?q=${q}`).json<{ users: any[] }>();
        setSuggestions(res.users || []);
      } catch (err) {
        console.error(err);
      }
    } else if (lastWord.startsWith("#") && lastWord.length > 1) {
      const q = lastWord.slice(1);
      setTriggerType("hashtag");
      const popularTags = ["nextjs", "react", "programming", "javascript", "developer", "webdev", "tech", "social"];
      const filtered = popularTags.filter((t) => t.toLowerCase().includes(q.toLowerCase()));
      setSuggestions(filtered);
    } else {
      setTriggerType(null);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const words = input.split(/\s+/);
    words.pop(); // Remove current word
    if (triggerType === "mention") {
      words.push(`@${suggestion.username}`);
    } else if (triggerType === "hashtag") {
      words.push(`#${suggestion}`);
    }
    setInput(words.join(" ") + " ");
    setTriggerType(null);
    setSuggestions([]);
    
    // Regain focus
    inputRef.current?.focus();
  };

  const handleQuickEmojiClick = (emoji: string) => {
    setInput((prev) => prev + emoji);
    // Focus the input natively
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handlePlaceholderMedia = (type: "image" | "gif") => {
    toast({
      description: `${type === "image" ? "Image uploads" : "GIF selections"} will be available in a future update.`,
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none bg-[#090909]">
      
      {/* 1. Instagram-style Horizontal Quick Emojis scroll row */}
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1.5 border-b border-zinc-900/60 justify-between select-none">
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleQuickEmojiClick(emoji)}
            className="text-[20px] transition-transform duration-100 active:scale-75 hover:scale-115 flex-shrink-0 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input container row with inline media and suggestions */}
      <div className="relative w-full">
        {/* Autocomplete suggestions popover */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
            {triggerType === "mention" ? (
              suggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(user)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-neutral-900 transition-colors text-white"
                >
                  <img
                    src={user.avatarUrl || "/avatar-placeholder.png"}
                    alt={user.displayName}
                    className="size-6 rounded-full object-cover"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold truncate">{user.displayName}</span>
                    <span className="text-[10px] text-zinc-500 truncate">@{user.username}</span>
                  </div>
                </button>
              ))
            ) : (
              suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectSuggestion(tag)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-neutral-900 transition-colors text-white font-semibold"
                >
                  #{tag}
                </button>
              ))
            )}
          </div>
        )}

        <form className="flex w-full items-center gap-2.5" onSubmit={onSubmit}>
          {/* Rounded Pill text field box containing text input & media icons */}
          <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 rounded-2xl px-3.5 py-2 h-[42px] relative transition-all duration-200">
            <input
              ref={inputRef}
              type="text"
              placeholder="Write a comment..."
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-white text-[15px] outline-none placeholder:text-zinc-500 pr-2"
            />
            
            {/* Inline Action Icons for Images and GIFs */}
            <div className="flex items-center gap-2.5 text-zinc-400 shrink-0 select-none">
              <button
                type="button"
                onClick={() => handlePlaceholderMedia("image")}
                className="hover:text-zinc-200 active:scale-95 transition-all cursor-pointer"
                title="Attach Image"
              >
                <ImageIcon className="size-4.5" />
              </button>
              
              <button
                type="button"
                onClick={() => handlePlaceholderMedia("gif")}
                className="hover:text-zinc-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Attach GIF"
              >
                <span className="text-[9px] font-black border border-current px-1 rounded-sm leading-none py-0.5 tracking-wide">GIF</span>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="ghost"
            size="icon"
            disabled={!input.trim() || mutation.isPending}
            className="hover:bg-zinc-900/60 text-primary hover:text-primary/90 rounded-full w-[42px] h-[42px] shrink-0"
          >
            {!mutation.isPending ? (
              <SendHorizonal className="size-5" />
            ) : (
              <Loader2 className="size-5 animate-spin text-primary" />
            )}
          </Button>
        </form>
      </div>

    </div>
  );
}
