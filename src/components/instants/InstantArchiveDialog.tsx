"use client";

import React, { useState } from "react";
import { X, Calendar, Image as ImageIcon, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import Image from "next/image";

interface Instant {
  id: string;
  mediaUrl: string;
  audience: string;
  createdAt: string;
}

interface InstantArchiveDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InstantArchiveDialog({
  open,
  onClose,
}: InstantArchiveDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compiling, setCompiling] = useState(false);

  // Fetch private archive snaps
  const { data: snaps = [], isLoading, error } = useQuery<Instant[]>({
    queryKey: ["instants-archive"],
    queryFn: () => kyInstance.get("/api/instants/archive").json<Instant[]>(),
    enabled: open,
    staleTime: 30 * 1000,
  });

  if (!open) return null;

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Compile selected snaps into standard Instagram Story recap slides
  const handleCompileRecap = async () => {
    if (!selectedIds.length || compiling) return;
    setCompiling(true);

    try {
      const res = await fetch("/api/instants/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instantIds: selectedIds }),
      });

      if (!res.ok) throw new Error("Compilation failed");

      toast({
        description: `Posted ${selectedIds.length} snaps as Story Recap!`,
      });

      // Clear selection and close
      setSelectedIds([]);
      
      // Invalidate stories queries to reload the stories feed with the new slides
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to compile story recap.",
      });
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4">
      <div className="relative w-full max-w-2xl h-[90vh] sm:h-[80vh] sm:max-h-[640px] flex flex-col justify-between bg-zinc-950 rounded-3xl border border-zinc-900 overflow-hidden text-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#7c3aed]" />
            <h2 className="text-lg font-bold tracking-tight">Instants Archive</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-[#7c3aed]" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-400 my-16">
              Failed to load archive snaps.
            </p>
          ) : snaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ImageIcon className="size-12 text-zinc-700 mb-3" />
              <h3 className="font-semibold text-zinc-400">No Sent snaps</h3>
              <p className="text-xs text-zinc-600 max-w-xs mt-1">
                Instants you capture and share will show up in your private archive here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {snaps.map((snap) => {
                const isSelected = selectedIds.includes(snap.id);
                const date = new Date(snap.createdAt);
                const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
                
                return (
                  <div
                    key={snap.id}
                    onClick={() => handleToggleSelect(snap.id)}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border border-zinc-900 hover:scale-98 transition-transform group shadow-md"
                  >
                    <Image
                      src={snap.mediaUrl}
                      alt="Archived snap"
                      fill
                      sizes="(max-width: 640px) 33vw, 150px"
                      className="object-cover"
                      unoptimized
                    />

                    {/* Date Tag */}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-semibold text-zinc-300">
                      {dateStr}
                    </div>

                    {/* Selection overlay indicator */}
                    <div className={`absolute inset-0 bg-black/30 transition-all ${
                      isSelected ? "bg-black/10 ring-4 ring-[#7c3aed]/80 ring-inset" : "group-hover:bg-black/10"
                    }`} />

                    {isSelected && (
                      <div className="absolute top-2 right-2 size-5 bg-[#7c3aed] text-white rounded-full flex items-center justify-center shadow-lg border border-white/10 animate-scale-up">
                        <Check className="size-3.5 stroke-[3px]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {snaps.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/80 shrink-0 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">
              {selectedIds.length > 0
                ? `${selectedIds.length} snaps selected`
                : "Select snaps to compile a story recap"}
            </span>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                className="hover:bg-zinc-900 hover:text-white"
                disabled={compiling}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompileRecap}
                disabled={!selectedIds.length || compiling}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold gap-2 px-5 py-4 rounded-xl"
              >
                {compiling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Post Story Recap
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
