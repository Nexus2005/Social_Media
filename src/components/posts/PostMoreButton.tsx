"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { PostData } from "@/lib/types";
import { Button } from "../ui/button";
import PostOptionsBottomSheet from "./PostOptionsBottomSheet";

interface PostMoreButtonProps {
  post: PostData;
  className?: string;
  onNotInterested: () => void;
}

export default function PostMoreButton({
  post,
  className,
  onNotInterested,
}: PostMoreButtonProps) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setShowOptions(true);
        }}
      >
        <MoreVertical className="size-5 text-white" />
      </Button>

      <PostOptionsBottomSheet
        post={post}
        open={showOptions}
        onClose={() => setShowOptions(false)}
        onNotInterested={onNotInterested}
      />
    </>
  );
}
