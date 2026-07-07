"use client";

import React, { useState, useEffect } from "react";
import { FolderTree, Layers, Plus, RefreshCw, Layers2, FolderOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Creation form states
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  
  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");

  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catRes, colRes] = await Promise.all([
        fetch("/api/shop/categories"),
        fetch("/api/shop/collections")
      ]);
      const catData = await catRes.json();
      const colData = await colRes.json();
      setCategories(catData.categories || []);
      setCollections(colData.collections || []);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to load categories/collections.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: "Category created successfully!",
      });

      setCatName("");
      setCatDesc("");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to create category.",
      });
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName) return;

    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: colName, description: colDesc })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: "Collection created successfully!",
      });

      setColName("");
      setColDesc("");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to create collection.",
      });
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase font-sans">Categories & Collections</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage e-commerce hierarchical categories and curated product collections.</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-xl cursor-pointer transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Categories Section */}
        <div className="space-y-5">
          <div className="bg-zinc-900/35 border border-zinc-850 p-5 rounded-[20px] space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-widest pb-3 border-b border-zinc-800 flex items-center gap-2">
              <FolderTree className="size-4 text-indigo-400" /> Create Category
            </h2>
            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Activewear"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-indigo-650 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea 
                  rows={2}
                  placeholder="Technical fitness clothes, hoodies, track pants..."
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-indigo-650 transition-colors resize-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 font-bold text-xs text-white transition-colors cursor-pointer"
              >
                Add Category
              </button>
            </form>
          </div>

          <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-[20px] space-y-3">
            <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FolderOpen className="size-4 text-zinc-500" /> Active Categories ({categories.length})</h3>
            <div className="divide-y divide-zinc-850/40">
              {isLoading ? (
                <div className="py-8 text-center text-zinc-650 animate-pulse text-xs">Loading categories...</div>
              ) : categories.length === 0 ? (
                <div className="py-8 text-center text-zinc-600 text-xs italic">No categories created yet.</div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="py-3 flex justify-between items-start gap-4">
                    <div>
                      <p className="font-bold text-zinc-200 text-xs">{cat.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{cat.description || "No description."}</p>
                    </div>
                    <span className="text-[9px] font-mono bg-zinc-950 px-2 py-0.5 border border-zinc-850 text-zinc-500 rounded">
                      {cat.slug}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Collections Section */}
        <div className="space-y-5">
          <div className="bg-zinc-900/35 border border-zinc-850 p-5 rounded-[20px] space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-widest pb-3 border-b border-zinc-800 flex items-center gap-2">
              <Layers className="size-4 text-indigo-400" /> Create Collection
            </h2>
            <form onSubmit={handleCreateCollection} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Collection Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Summer Essentials"
                  value={colName}
                  onChange={e => setColName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-indigo-650 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea 
                  rows={2}
                  placeholder="Curated items recommended for hot summer weather..."
                  value={colDesc}
                  onChange={e => setColDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-indigo-650 transition-colors resize-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 font-bold text-xs text-white transition-colors cursor-pointer"
              >
                Create Collection
              </button>
            </form>
          </div>

          <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-[20px] space-y-3">
            <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Layers2 className="size-4 text-zinc-500" /> Active Collections ({collections.length})</h3>
            <div className="divide-y divide-zinc-850/40">
              {isLoading ? (
                <div className="py-8 text-center text-zinc-650 animate-pulse text-xs">Loading collections...</div>
              ) : collections.length === 0 ? (
                <div className="py-8 text-center text-zinc-600 text-xs italic">No collections created yet.</div>
              ) : (
                collections.map(col => (
                  <div key={col.id} className="py-3 flex justify-between items-start gap-4">
                    <div>
                      <p className="font-bold text-zinc-200 text-xs">{col.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{col.description || "No description."}</p>
                    </div>
                    <span className="text-[9px] font-mono bg-zinc-950 px-2 py-0.5 border border-zinc-850 text-zinc-500 rounded">
                      {col.slug}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
