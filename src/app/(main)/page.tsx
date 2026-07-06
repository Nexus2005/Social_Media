import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import { TrendingSection, SuggestionsList } from "./SuggestedSidebar";
import HomeClient from "./HomeClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user } = await validateRequest();
  if (!user) {
    redirect("/login");
  }

  return (
    <HomeClient 
      currentUserId={user.id} 
      sidebar={
        <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
          <TrendingSection />
        </Suspense>
      }
      suggestedFollows={
        <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
          <SuggestionsList />
        </Suspense>
      }
    />
  );
}
