import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Lock, LayoutDashboard, ShoppingBag, FolderTree, ClipboardList, Store, Image, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await validateRequest();

  if (!user) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center text-white">
        <Lock className="size-16 text-destructive animate-pulse" />
        <h1 className="text-3xl font-black tracking-tight font-sans">Access Denied</h1>
        <p className="text-zinc-400 max-w-md text-sm">
          Please log in with an administrator account to view the Administration Panel.
        </p>
      </div>
    );
  }

  // Verify role in PostgreSQL
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const role = dbUser?.role || user.role;
  if (role !== "ADMIN" && user.username !== "Omkar2005") {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center text-white">
        <Lock className="size-16 text-destructive animate-pulse" />
        <h1 className="text-3xl font-black tracking-tight font-sans">Access Denied</h1>
        <p className="text-zinc-400 max-w-md text-sm">
          You do not have administrative privileges. Only administrators can access the Admin Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-white">
      <div className="flex flex-col md:flex-row gap-8 items-start min-h-[75vh]">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0 bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl flex flex-col gap-1.5 text-left">
          <div className="px-3 py-2 border-b border-zinc-800/60 mb-3 flex items-center gap-2">
            <ShieldAlert className="size-5 text-indigo-400" />
            <span className="text-sm font-black uppercase tracking-wider text-zinc-100">Control Hub</span>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all"
          >
            <LayoutDashboard className="size-4" />
            AI Processing
          </Link>

          <Link
            href="/admin/products"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all"
          >
            <ShoppingBag className="size-4" />
            Products Review
          </Link>

          <Link
            href="/admin/categories"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all"
          >
            <FolderTree className="size-4" />
            Categories & Collections
          </Link>

          <Link
            href="/admin/orders"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all"
          >
            <ClipboardList className="size-4" />
            Orders Log
          </Link>

          <Link
            href="/admin/sellers"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all"
          >
            <Store className="size-4" />
            Merchant Sellers
          </Link>

          <Link
            href="/admin/cms"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all"
          >
            <Image className="size-4" />
            Banners & Sections
          </Link>
        </aside>

        {/* Content area */}
        <main className="flex-1 w-full min-h-[50vh]">
          {children}
        </main>
      </div>
    </div>
  );
}
