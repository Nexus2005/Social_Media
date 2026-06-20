"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the EmojiPicker to keep package sizes optimized
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[350px] w-[350px] bg-neutral-900 border border-neutral-800 rounded-2xl">
      <Loader2 className="size-6 animate-spin text-neutral-500" />
    </div>
  ),
});

interface EmojiPickerPanelProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPickerPanel({ onEmojiSelect }: EmojiPickerPanelProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
      <EmojiPicker
        theme={"dark" as any}
        skinTonesDisabled
        searchDisabled={false}
        width={320}
        height={380}
        onEmojiClick={(emojiData) => {
          if (emojiData && emojiData.emoji) {
            onEmojiSelect(emojiData.emoji);
          }
        }}
      />
    </div>
  );
}
