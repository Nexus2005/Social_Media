"use client";

import { Button } from "@/components/ui/button";
import { UserData } from "@/lib/types";
import { useState } from "react";
import EditProfileDialog from "./EditProfileDialog";
import ShareProfileDialog from "@/components/posts/ShareProfileDialog";
import { useToast } from "@/components/ui/use-toast";
import { Share2 } from "lucide-react";

interface ProfileHeaderActionsProps {
  user: UserData;
}

export default function ProfileHeaderActions({ user }: ProfileHeaderActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();

  return (
    <div className="w-full flex items-center gap-2">
      <Button 
        variant="ghost" 
        onClick={() => setShowDialog(true)}
        className="h-9 rounded-[10px] bg-[#262626] hover:bg-zinc-700 text-[#FFFFFF] text-xs font-semibold flex-1 transition-colors border border-[#363636]"
      >
        Edit profile
      </Button>

      <Button
        variant="ghost"
        onClick={() => setShowShareDialog(true)}
        className="h-9 rounded-[10px] bg-[#262626] hover:bg-zinc-700 text-[#FFFFFF] text-xs font-semibold flex-1 transition-colors flex items-center justify-center gap-2 border border-[#363636]"
      >
        <Share2 className="size-4.5 text-[#FFFFFF]" strokeWidth={1.75} />
        <span>Share profile</span>
      </Button>

      <EditProfileDialog
        user={user}
        open={showDialog}
        onOpenChange={setShowDialog}
      />

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
