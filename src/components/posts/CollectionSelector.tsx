"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { Loader2, Plus, Folder } from "lucide-react";

interface CollectionItem {
  id: string;
  name: string;
  items: { postId: string }[];
}

interface CollectionSelectorProps {
  postId: string;
  open: boolean;
  onClose: () => void;
}

export default function CollectionSelector({ postId, open, onClose }: CollectionSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch all collections
  const { data: collections, isLoading } = useQuery<CollectionItem[]>({
    queryKey: ["saved-collections"],
    queryFn: () => kyInstance.get("/api/saved-collections").json(),
    enabled: open,
  });

  // Create new collection mutation
  const createMutation = useMutation({
    mutationFn: (name: string) =>
      kyInstance.post("/api/saved-collections", { json: { name } }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      setNewCollectionName("");
      setShowCreateForm(false);
      toast({ description: "Collection created successfully." });
    },
    onError: (err) => {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to create collection." });
    },
  });

  // Toggle item in collection mutation
  const toggleMutation = useMutation({
    mutationFn: (collectionId: string) =>
      kyInstance.post("/api/saved-collections/items", { json: { collectionId, postId } }).json<{ added: boolean }>(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      toast({
        description: res.added ? "Saved to collection." : "Removed from collection.",
      });
    },
    onError: (err) => {
      console.error(err);
      toast({ variant: "destructive", description: "Something went wrong." });
    },
  });

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim() || createMutation.isPending) return;
    createMutation.mutate(newCollectionName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-sm p-5 bg-card text-card-foreground border border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-md font-bold flex items-center gap-2">
            <Folder className="size-5 text-primary" />
            <span>Save to Collection</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 my-2 max-h-[300px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="flex flex-col gap-2">
              {collections.map((coll) => {
                const isSaved = coll.items.some((item) => item.postId === postId);
                return (
                  <button
                    key={coll.id}
                    disabled={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate(coll.id)}
                    className="flex items-center justify-between w-full p-2.5 hover:bg-neutral-800/40 rounded-xl transition-all border border-transparent hover:border-border text-left text-xs"
                  >
                    <span className="font-medium text-neutral-200">{coll.name}</span>
                    <input
                      type="checkbox"
                      checked={isSaved}
                      readOnly
                      className="rounded border-neutral-700 bg-neutral-900 text-primary focus:ring-primary size-4 cursor-pointer"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-neutral-500 text-xs py-4">No collections yet.</p>
          )}

          {showCreateForm ? (
            <form onSubmit={handleCreateCollection} className="flex gap-2 items-center mt-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="New collection name..."
                className="flex-1 text-xs px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl outline-none focus:border-primary transition-all text-white"
                autoFocus
              />
              <Button
                type="submit"
                disabled={createMutation.isPending || !newCollectionName.trim()}
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                size="sm"
              >
                Create
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 text-primary text-xs font-semibold hover:underline mt-2 self-start"
            >
              <Plus className="size-4" />
              <span>Create new collection</span>
            </button>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end border-t border-border/20 pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-full text-xs font-semibold px-4 py-2 border-border text-neutral-300 hover:bg-neutral-800/40"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
