import StoriesCarousel from "@/components/StoriesCarousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";
import SuggestedSidebar from "./SuggestedSidebar";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[935px] gap-0 sm:gap-8 px-0 sm:px-4 md:px-8 py-0 sm:py-6 justify-center bg-black">
      {/* Column 2 (Center Feed) */}
      <div className="w-full max-w-[600px] space-y-1 sm:space-y-2">
        {/* Stories Carousel */}
        <StoriesCarousel />

        {/* Feeds Tabs */}
        <Tabs defaultValue="for-you" className="w-full">
          <TabsList className="w-full justify-start border-b border-neutral-900 bg-transparent p-0 h-12 rounded-none gap-8">
            <TabsTrigger
              value="for-you"
              className="bg-transparent relative rounded-none px-2 py-3 h-full text-[16px] font-semibold text-zinc-400 data-[state=active]:text-white transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-white after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
            >
              For You
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="bg-transparent relative rounded-none px-2 py-3 h-full text-[16px] font-semibold text-zinc-400 data-[state=active]:text-white transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-white after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
            >
              Following
            </TabsTrigger>
          </TabsList>

          {/* Sticky Search Bar - sticks below the 56px (h-14) mobile header */}
          <div className="sticky top-14 sm:top-0 z-20 bg-black py-1.5 px-4 sm:py-2.5 sm:px-0">
            <form action="/search" method="GET" className="w-full">
              <div className="relative flex items-center h-11 w-full bg-[#121212] rounded-xl px-3 gap-2">
                <Search className="size-5 text-white shrink-0" />
                <input
                  name="q"
                  type="text"
                  placeholder="Search"
                  className="flex-grow bg-transparent text-[15px] text-white placeholder-[#8e8e93] outline-none h-full"
                />
                <button type="button" className="text-white hover:opacity-80 transition-opacity shrink-0">
                  <SlidersHorizontal className="size-5" />
                </button>
              </div>
            </form>
          </div>

          <TabsContent value="for-you" className="mt-1 outline-none">
            <ForYouFeed />
          </TabsContent>
          <TabsContent value="following" className="mt-1 outline-none">
            <FollowingFeed />
          </TabsContent>
        </Tabs>
      </div>

      {/* Column 3 (Right Sidebar) */}
      <SuggestedSidebar />
    </div>
  );
}
