import React from "react";
import StoriesCarousel from "@/components/StoriesCarousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";
import LatestFeed from "./LatestFeed";
import SuggestedSidebar from "./SuggestedSidebar";
import { Search } from "lucide-react";
import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import HeaderActions from "./HeaderActions";

export default async function Home() {
  const { user } = await validateRequest();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex flex-col w-full max-w-[1100px] gap-6 px-4 md:px-6 py-6 justify-center bg-instagram-lightBg dark:bg-instagram-darkBg min-h-screen text-foreground transition-colors duration-200">
      
      {/* 1. Upper Header Row - Desktop Only */}
      <div className="hidden xl:flex justify-between items-center gap-8 w-full shrink-0 select-none pb-2">
        {/* Left aligned Search Bar (same width as feed column) */}
        <div className="w-full max-w-[640px]">
          <form action="/search" method="GET" className="w-full">
            <div className="relative flex items-center h-12 w-full bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 gap-2.5 shadow-sm transition-all focus-within:border-indigo-500/50">
              <Search className="size-5 text-muted-foreground shrink-0" />
              <input
                name="q"
                type="text"
                placeholder="Search for products, brands, styles or creators..."
                className="flex-grow bg-transparent text-[14.5px] text-foreground placeholder:text-muted-foreground/60 outline-none h-full"
              />
              <div className="flex items-center justify-center px-1.5 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-[11px] text-muted-foreground/80 font-bold font-mono">
                ⌘ K
              </div>
            </div>
          </form>
        </div>

        {/* Right aligned actions bar (matches right sidebar width) */}
        <HeaderActions user={user} />
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="flex gap-8 w-full justify-center items-start">
        
        {/* Center Feed Column */}
        <div className="w-full max-w-[640px] space-y-4">
          
          {/* Mobile Search Bar - Mobile View Only */}
          <div className="sticky top-14 z-20 bg-instagram-lightBg dark:bg-instagram-darkBg py-1.5 px-4 sm:py-2.5 sm:px-0 xl:hidden">
            <form action="/search" method="GET" className="w-full">
              <div className="relative flex items-center h-11 w-full bg-zinc-100 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 gap-2">
                <Search className="size-5 text-muted-foreground shrink-0" />
                <input
                  name="q"
                  type="text"
                  placeholder="Search"
                  className="flex-grow bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none h-full"
                />
              </div>
            </form>
          </div>

          {/* Stories block wrapped in a premium card */}
          <div className="p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-805/85 bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 backdrop-blur-md shadow-sm">
            <StoriesCarousel />
          </div>

          {/* Feeds Tabs */}
          <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="w-full justify-start border-b border-zinc-200 dark:border-zinc-800 bg-transparent p-0 h-11 rounded-none gap-6 mb-3">
              <TabsTrigger
                value="for-you"
                className="bg-transparent relative rounded-none px-1 py-2.5 h-full text-[15px] font-extrabold text-muted-foreground/80 data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
              >
                For you
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="bg-transparent relative rounded-none px-1 py-2.5 h-full text-[15px] font-extrabold text-muted-foreground/80 data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="latest"
                className="bg-transparent relative rounded-none px-1 py-2.5 h-full text-[15px] font-extrabold text-muted-foreground/80 data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
              >
                Latest
              </TabsTrigger>
            </TabsList>

            <TabsContent value="for-you" className="mt-0 outline-none">
              <ForYouFeed />
            </TabsContent>
            <TabsContent value="following" className="mt-0 outline-none">
              <FollowingFeed />
            </TabsContent>
            <TabsContent value="latest" className="mt-0 outline-none">
              <LatestFeed />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar Column */}
        <div className="w-[360px] hidden xl:block flex-shrink-0">
          <SuggestedSidebar />
        </div>

      </div>
    </div>
  );
}
