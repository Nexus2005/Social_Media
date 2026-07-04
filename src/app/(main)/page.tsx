import StoriesCarousel from "@/components/StoriesCarousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";
import SuggestedSidebar from "./SuggestedSidebar";

export default function Home() {
  return (
    <div className="flex w-full max-w-[1100px] xl:max-w-[1160px] gap-8 px-4 py-0 sm:pt-2 sm:pb-6 justify-between bg-instagram-lightBg dark:bg-instagram-darkBg">
      {/* Column 2 (Center Feed) */}
      <div className="w-full max-w-[600px] space-y-1 sm:space-y-2">
        {/* Stories Carousel */}
        <StoriesCarousel />

        {/* Feeds Tabs */}
        <Tabs defaultValue="for-you" className="w-full">
          <TabsList className="w-full justify-start border-b border-instagram-lightBorder dark:border-instagram-darkBorder bg-transparent p-0 h-12 rounded-none gap-8">
            <TabsTrigger
              value="for-you"
              className="bg-transparent relative rounded-none px-2 py-3 h-full text-[16px] font-semibold text-zinc-400 data-[state=active]:text-instagram-lightText data-[state=active]:dark:text-instagram-darkText transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-current after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
            >
              For You
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="bg-transparent relative rounded-none px-2 py-3 h-full text-[16px] font-semibold text-zinc-400 data-[state=active]:text-instagram-lightText data-[state=active]:dark:text-instagram-darkText transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-current after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
            >
              Following
            </TabsTrigger>
          </TabsList>



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
