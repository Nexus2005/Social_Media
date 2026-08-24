import { Suspense } from "react";
import ShopSearchPage from "@/components/shop/ShopSearchPage";

export default function ShopSearchPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-400 text-sm">
          Loading search…
        </div>
      }
    >
      <ShopSearchPage />
    </Suspense>
  );
}
