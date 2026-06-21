import StoriesCarousel from "@/components/StoriesCarousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";
import SuggestedSidebar from "./SuggestedSidebar";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[935px] gap-0 sm:gap-8 px-0 sm:px-4 md:px-8 py-0 sm:py-6 justify-center">
      {/* Column 2 (Center Feed) */}
      <div className="w-full max-w-[600px] space-y-6">
        {/* Stories Carousel */}
        <StoriesCarousel />

        {/* Feeds Tabs */}
        <Tabs defaultValue="for-you">
          <TabsList className="w-full justify-start border-b bg-transparent p-0 h-11 rounded-none gap-6">
            <TabsTrigger
              value="for-you"
              className="bg-transparent relative rounded-none px-1 py-2.5 h-full font-bold text-muted-foreground data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-gradient-to-r after:from-[#ec4899] after:to-[#a855f7] after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-250 data-[state=active]:bg-transparent"
            >
              For you
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="bg-transparent relative rounded-none px-1 py-2.5 h-full font-bold text-muted-foreground data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-gradient-to-r after:from-[#ec4899] after:to-[#a855f7] after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-250 data-[state=active]:bg-transparent"
            >
              Following
            </TabsTrigger>
          </TabsList>
          <TabsContent value="for-you" className="mt-4 outline-none">
            <ForYouFeed />
          </TabsContent>
          <TabsContent value="following" className="mt-4 outline-none">
            <FollowingFeed />
          </TabsContent>
        </Tabs>
      </div>

      {/* Column 3 (Right Sidebar) */}
      <SuggestedSidebar />
    </div>
  );
}
