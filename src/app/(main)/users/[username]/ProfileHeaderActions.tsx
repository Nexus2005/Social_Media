"use client";

import { Button } from "@/components/ui/button";
import { UserData } from "@/lib/types";
import { useState } from "react";
import EditProfileDialog from "./EditProfileDialog";
import { Store, BarChart3 } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface ProfileHeaderActionsProps {
  user: UserData;
}

export default function ProfileHeaderActions({ user }: ProfileHeaderActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const activeTab = searchParams.get("tab") || "posts";

  const handleTabChange = (tabName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab === tabName) {
      params.delete("tab"); // toggle off back to posts if clicked again
    } else {
      params.set("tab", tabName);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button 
        variant="outline" 
        onClick={() => setShowDialog(true)}
        className="rounded-xl border-border/40 hover:bg-muted/40 font-bold text-xs"
      >
        Edit profile
      </Button>

      <Button
        variant={activeTab === "creator-studio" ? "default" : "outline"}
        onClick={() => handleTabChange("creator-studio")}
        className="rounded-xl border-border/40 font-bold text-xs gap-1.5"
      >
        <Store className="size-3.5" />
        <span>Creator Studio</span>
      </Button>

      <Button
        variant={activeTab === "insights" ? "default" : "outline"}
        onClick={() => handleTabChange("insights")}
        className="rounded-xl border-border/40 font-bold text-xs gap-1.5"
      >
        <BarChart3 className="size-3.5" />
        <span>Insights</span>
      </Button>

      <EditProfileDialog
        user={user}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
