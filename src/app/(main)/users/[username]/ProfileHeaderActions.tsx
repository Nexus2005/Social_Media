"use client";

import { Button } from "@/components/ui/button";
import { UserData } from "@/lib/types";
import { useState } from "react";
import ShareProfileDialog from "@/components/posts/ShareProfileDialog";
import { useToast } from "@/components/ui/use-toast";
import { Share2 } from "lucide-react";
import Link from "next/link";

interface ProfileHeaderActionsProps {
  user: UserData;
}

export default function ProfileHeaderActions({ user }: ProfileHeaderActionsProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex items-center gap-2.5">
      <Link href={`/users/${user.username}/customization`}>
        <Button 
          variant="ghost" 
          className="h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium transition-all border border-black/10 dark:border-white/5 shadow-sm px-5"
        >
          Edit profile
        </Button>
      </Link>

      <Button
        variant="ghost"
        onClick={() => setShowShareDialog(true)}
        className="h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5 border border-black/10 dark:border-white/5 shadow-sm px-5"
      >
        <Share2 className="size-3.5" strokeWidth={2.25} />
        <span>Share profile</span>
      </Button>

      <ShareProfileDialog
        profile={{
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </div>
  );
}
