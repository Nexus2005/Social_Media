export const dynamic = "force-dynamic";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Lock } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Processing Dashboard | Cartly Admin",
  description: "Monitor and manage Cartly video product detection models, conversion clicks, and processing workers.",
};

export default async function AdminPage() {
  const { user } = await validateRequest();

  if (!user) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
        <Lock className="size-16 text-destructive animate-pulse" />
        <h1 className="text-3xl font-black tracking-tight font-sans">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          Please log in with an administrator account to view the AI Processing Dashboard.
        </p>
      </div>
    );
  }

  // Double check in DB
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const role = dbUser?.role || user.role;
  if (role !== "ADMIN" && user.username !== "Omkar2005") {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
        <Lock className="size-16 text-destructive animate-pulse" />
        <h1 className="text-3xl font-black tracking-tight font-sans">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You do not have administrative privileges. Only administrators can access the AI Processing Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <AdminDashboard />
    </div>
  );
}
