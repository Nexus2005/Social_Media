"use client";

import { Button } from "@/components/ui/button";
import { UserData } from "@/lib/types";
import { useState } from "react";
import EditProfileDialog from "./EditProfileDialog";
import { useToast } from "@/components/ui/use-toast";
import { Share2 } from "lucide-react";

interface ProfileHeaderActionsProps {
  user: UserData;
}

export default function ProfileHeaderActions({ user }: ProfileHeaderActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/users/${user.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      description: "Profile link copied to clipboard",
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        onClick={() => setShowDialog(true)}
        className="h-9 px-4 rounded-lg border-border bg-[#0A0A0A] hover:bg-[#111111] text-[#FFFFFF] text-sm font-semibold transition-colors"
      >
        Edit profile
      </Button>

      <Button
        variant="outline"
        onClick={handleShare}
        className="h-9 px-4 rounded-lg border-border bg-[#0A0A0A] hover:bg-[#111111] text-[#FFFFFF] text-sm font-semibold transition-colors flex items-center gap-2"
      >
        <Share2 className="size-5 text-[#A1A1AA]" strokeWidth={1.75} />
        <span>Share profile</span>
      </Button>

      <EditProfileDialog
        user={user}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
