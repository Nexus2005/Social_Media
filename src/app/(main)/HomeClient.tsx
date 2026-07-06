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
          <div className="w-full relative flex items-center justify-between border-b border-instagram-lightBorder dark:border-instagram-darkBorder pr-1 select-none">
            <TabsList className="flex justify-start bg-transparent p-0 h-12 rounded-none gap-6 sm:gap-8 overflow-x-auto scrollbar-none select-none border-none">
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

            {/* Explore Icon Button */}
            <Link 
              href="/explore" 
              className="relative flex items-center justify-center p-2 rounded-xl group transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 select-none shrink-0"
              title="Explore"
            >
              <svg 
                className="size-5.5 stroke-zinc-400 fill-none stroke-[1.5] transition-all duration-500 ease-out group-hover:stroke-indigo-500 dark:group-hover:stroke-white group-hover:rotate-[45deg] group-hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.4)] dark:group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16.2 7.8L13.5 13.5L7.8 16.2L10.5 10.5L16.2 7.8Z" className="fill-zinc-500/5 dark:fill-white/10" />
                <path d="M16.2 7.8L13.5 13.5L7.8 16.2L10.5 10.5L16.2 7.8Z" />
              </svg>
            </Link>
          </div>

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
