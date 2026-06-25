"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { PostData } from "@/lib/types";
import { Button } from "../ui/button";
import PostOptionsBottomSheet from "./PostOptionsBottomSheet";
import DeletePostDialog from "./DeletePostDialog";
import QuotePostDialog from "./QuotePostDialog";
import EditPostDialog from "./EditPostDialog";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

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
        onDeleteClick={() => setShowDeleteDialog(true)}
        onEditClick={() => setShowEditDialog(true)}
        onQuoteClick={() => setShowQuoteDialog(true)}
      />

      <DeletePostDialog
        post={post}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />

      <QuotePostDialog
        post={post}
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
      />

      <EditPostDialog
        post={post}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
      />
    </>
  );
}
