"use client";

import { logout } from "@/app/(auth)/actions";
import { LogOut, HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsClient() {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      toast({
        description: "Logging out...",
      });
      await logout();
    } catch (e) {
      toast({
        variant: "destructive",
        description: "Failed to logout. Please try again.",
      });
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[12px] uppercase font-bold tracking-wider text-muted-foreground px-1">More info & support</h2>
      
      <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
        {/* Help/Support */}
        <div 
          id="item-help-settings"
          onClick={() => {
            toast({
              description: "Support desk is coming soon!",
            });
          }}
          className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors select-none group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="size-5 text-foreground group-hover:scale-105 transition-transform" strokeWidth={2} />
            <span className="text-[15px] font-medium">Help & Support</span>
          </div>
        </div>

        {/* Logout */}
        <button
          id="btn-logout-settings"
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-500/5 hover:text-red-500 active:bg-red-500/10 transition-colors select-none group text-left text-red-500 border-0"
        >
          <div className="flex items-center gap-3">
            <LogOut className="size-5 text-red-500 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            <span className="text-[15px] font-semibold">Logout</span>
          </div>
        </button>
      </div>
    </section>
  );
}
