import { Metadata } from "next";
import ReelsFeed from "./ReelsFeed";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Spots",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    }>
      <ReelsFeed />
    </Suspense>
  );
}
