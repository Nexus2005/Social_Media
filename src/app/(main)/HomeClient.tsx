"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StoriesCarousel from "@/components/StoriesCarousel";
import HomeBanners from "@/components/HomeBanners";
import Link from "next/link";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";
import FeedTabContent from "./FeedTabContent";
import { cn } from "@/lib/utils";

interface HomeClientProps {
  currentUserId: string;
  sidebar: React.ReactNode;
  suggestedFollows: React.ReactNode;
}

export default function HomeClient({ currentUserId, sidebar, suggestedFollows }: HomeClientProps) {
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-instagram-lightBg dark:bg-instagram-darkBg px-4 sm:px-2 py-0 sm:pt-2 sm:pb-6 gap-6">
      
      {/* Top Section: Stories + Banner on Left, Scorecard on Right */}
      <div className="flex w-full justify-between gap-8">
        {/* Left: Stories & Banners */}
        <div className="w-full max-w-[740px] space-y-4 flex-grow min-w-0">
          <div className="w-full">
            <StoriesCarousel />
          </div>
          <HomeBanners />
        </div>

        {/* Right: Scorecard Card */}
        <div className="hidden xl:block w-[420px] flex-shrink-0">
          {sidebar} {/* TrendingAndSportsCard */}
        </div>
      </div>

      {/* Tabs Container */}
      <div className="w-full">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="w-full justify-start border-b border-instagram-lightBorder dark:border-instagram-darkBorder bg-transparent p-0 h-12 rounded-none gap-6 sm:gap-8 overflow-x-auto scrollbar-none select-none">
            <TabsTrigger
              value="feed"
              className="bg-transparent relative rounded-none px-1 sm:px-2 py-3 h-full text-[14px] sm:text-[16px] font-semibold text-zinc-400 data-[state=active]:text-instagram-lightText data-[state=active]:dark:text-instagram-darkText transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-current after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent cursor-pointer"
            >
              Feed
            </TabsTrigger>
            <TabsTrigger
              value="posts"
              className="bg-transparent relative rounded-none px-1 sm:px-2 py-3 h-full text-[14px] sm:text-[16px] font-semibold text-zinc-400 data-[state=active]:text-instagram-lightText data-[state=active]:dark:text-instagram-darkText transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-current after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent cursor-pointer"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="for-you"
              className="bg-transparent relative rounded-none px-1 sm:px-2 py-3 h-full text-[14px] sm:text-[16px] font-semibold text-zinc-400 data-[state=active]:text-instagram-lightText data-[state=active]:dark:text-instagram-darkText transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-current after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent cursor-pointer"
            >
              For You
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="bg-transparent relative rounded-none px-1 sm:px-2 py-3 h-full text-[14px] sm:text-[16px] font-semibold text-zinc-400 data-[state=active]:text-instagram-lightText data-[state=active]:dark:text-instagram-darkText transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-current after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent cursor-pointer"
            >
              Following
            </TabsTrigger>
          </TabsList>

          {/* Feed tab content (full width, no Suggested Followers card below) */}
          <TabsContent value="feed" className="mt-5 outline-none w-full">
            <FeedTabContent currentUserId={currentUserId} />
          </TabsContent>

          {/* Mixed Post Feeds (Standard Layout with Suggested Followers Sidebar on the right) */}
          <TabsContent value="posts" className="mt-5 outline-none w-full">
            <div className="flex w-full justify-between gap-8">
              <div className="w-full max-w-[600px] flex-grow">
                <ForYouFeed />
              </div>
              <div className="hidden xl:block w-[420px] flex-shrink-0">
                {suggestedFollows}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="for-you" className="mt-5 outline-none w-full">
            <div className="flex w-full justify-between gap-8">
              <div className="w-full max-w-[600px] flex-grow">
                <ForYouFeed />
              </div>
              <div className="hidden xl:block w-[420px] flex-shrink-0">
                {suggestedFollows}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-5 outline-none w-full">
            <div className="flex w-full justify-between gap-8">
              <div className="w-full max-w-[600px] flex-grow">
                <FollowingFeed />
              </div>
              <div className="hidden xl:block w-[420px] flex-shrink-0">
                {suggestedFollows}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
