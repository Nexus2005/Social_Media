import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserDataSelect } from "@/lib/types";
import { Suspense } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { Loader2 } from "lucide-react";
import SuggestionsWidget from "./SuggestionsWidget";
import LiveScoresWidget from "./LiveScoresWidget";
import WhatsHappeningWidget from "./WhatsHappeningWidget";
import SpotShopShareWidget from "./SpotShopShareWidget";

export default async function SuggestedSidebar() {
  const session = await validateRequest();
  if (!session.user) return null;

  return (
    <div className="sticky top-6 hidden w-[360px] flex-none flex-col gap-5 xl:flex select-none pb-6">
      <Suspense fallback={<Loader2 className="mx-auto animate-spin text-indigo-500" />}>
        {/* 1. Live Scores Scoreboard Widget */}
        <LiveScoresWidget />

        {/* 2. What's Happening Widget */}
        <WhatsHappeningWidget />

        {/* 3. Spot. Shop. Share. Promo Widget */}
        <SpotShopShareWidget />

        {/* 4. Who to Follow Widget (with inline expansion and load more) */}
        <SuggestionsListWrapper currentUserId={session.user.id} />
      </Suspense>

      {/* Footer Meta Links */}
      <footer className="flex flex-col gap-4 px-3 text-[11px] text-muted-foreground/50">
        <nav className="flex flex-wrap gap-x-2 gap-y-1">
          {["About", "Help", "Press", "API", "Jobs", "Privacy", "Terms", "Locations", "Language", "Meta Verified"].map((link, i) => (
            <span key={link}>
              <Link href="#" className="hover:underline">
                {link}
              </Link>
              {i < 9 && <span className="mx-1">·</span>}
            </span>
          ))}
        </nav>
        <p className="font-bold uppercase tracking-wider text-[10px]">
          © {new Date().getFullYear()} Cartly
        </p>
      </footer>
    </div>
  );
}

async function SuggestionsListWrapper({ currentUserId }: { currentUserId: string }) {
  // Fetch up to 12 suggested users that the current user is not following
  const suggestions = await prisma.user.findMany({
    where: {
      NOT: {
        id: currentUserId,
      },
      followers: {
        none: {
          followerId: currentUserId,
        },
      },
    },
    select: getUserDataSelect(currentUserId),
    take: 12,
  });

  return (
    <SuggestionsWidget
      initialSuggestions={suggestions as any[]}
      currentUserId={currentUserId}
    />
  );
}
