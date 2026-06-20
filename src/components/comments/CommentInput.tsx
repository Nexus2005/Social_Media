"use client";

import { PostData } from "@/lib/types";
import { Loader2, SendHorizonal } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useSubmitCommentMutation } from "./mutations";
import kyInstance from "@/lib/ky";

interface CommentInputProps {
  post: PostData;
}

export default function CommentInput({ post }: CommentInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [triggerType, setTriggerType] = useState<"mention" | "hashtag" | null>(null);

  const mutation = useSubmitCommentMutation(post.id);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim()) return;

    mutation.mutate(
      {
        postId: post.id,
        postUserId: post.user.id,
        content: input,
      },
      {
        onSuccess: () => {
          setInput("");
          setSuggestions([]);
          setTriggerType(null);
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
    words.pop(); // Remove the current typing word
    if (triggerType === "mention") {
      words.push(`@${suggestion.username}`);
    } else if (triggerType === "hashtag") {
      words.push(`#${suggestion}`);
    }
    setInput(words.join(" ") + " ");
    setTriggerType(null);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full">
      {/* Autocomplete suggestions popover */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-zinc-950 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
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
                  <span className="text-[10px] text-zinc-550 truncate">@{user.username}</span>
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

      <form className="flex w-full items-center gap-2" onSubmit={onSubmit}>
        <Input
          placeholder="Write a comment..."
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          autoFocus
          className="bg-neutral-900/60 border-neutral-800 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          disabled={!input.trim() || mutation.isPending}
          className="hover:bg-neutral-800/40 text-primary hover:text-primary/90 rounded-full"
        >
          {!mutation.isPending ? (
            <SendHorizonal className="size-5" />
          ) : (
            <Loader2 className="size-5 animate-spin text-primary" />
          )}
        </Button>
      </form>
    </div>
  );
}
