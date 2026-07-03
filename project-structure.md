# Project Structure

This document provides a high-density, token-efficient reference of the Next Social Media codebase to expedite locating files and understanding feature boundaries.

---

## 1. Directory Tree

```
nextjs-15-social-media-app/
├── prisma/
│   ├── schema.prisma                  # Database schema (PostgreSQL via Supabase)
│   └── seed-social-network.ts         # Script to seed database with users, posts, and reels
├── src/
│   ├── auth.ts                        # NextAuth.js setup & Google OAuth config
│   ├── app/                           # Next.js App Router root
│   │   ├── (auth)/                    # Authentication screens (Login, Signup)
│   │   ├── (main)/                    # Main authenticated layout & pages
│   │   │   ├── messages/              # Chat message dashboard & group options
│   │   │   ├── notifications/         # Notification feeds & items
│   │   │   ├── reels/                 # Reels tab (fullscreen vertical scrolling)
│   │   │   └── users/[username]/      # User profiles, storefronts, and followers list
│   │   ├── api/                       # API endpoints (auth, posts, stories, location, etc.)
│   │   ├── globals.css                # Global styling stylesheet
│   │   ├── layout.tsx                 # Root layout with context providers
│   │   └── ReactQueryProvider.tsx     # React Query setup for data fetching
│   ├── components/                    # Frontend React Components
│   │   ├── comments/                  # Standard post comment sheets & cards
│   │   ├── creator/                   # Creator analytics dashboard & products list
│   │   ├── instants/                  # Instants/Quick snaps camera & overlays
│   │   ├── posts/                     # Post editor, feed view trackers, and lists
│   │   ├── reels/                     # Fullscreen reel player, caption selector, and options
│   │   ├── stories/                   # Story viewing carousel, views list, and settings
│   │   ├── ui/                        # Common Radix UI components (Dialog, Slider, Button, etc.)
│   │   ├── StoriesCarousel.tsx        # Story ring bubble carousel component
│   │   ├── StoryViewer.tsx            # Fullscreen interactive story slide viewer
│   │   └── VideoPlayer.tsx            # Generic video renderer with custom controls
│   ├── hooks/                         # Custom React Hooks
│   │   ├── useFollowerInfo.ts         # Hook tracking follow relationships & state updates
│   │   └── useRealtimeNotifications.ts# Hook subscribing to realtime push streams
│   ├── lib/                           # Core utilities, workers, & services
│   │   ├── providers/                 # React Context providers (Location, Chat, etc.)
│   │   ├── workers/                   # Async job background workers (e.g. video processing)
│   │   ├── notification-center.ts     # Central service sending dynamic alerts
│   │   ├── prisma.ts                  # Global Prisma client export
│   │   ├── realtime.ts                # WebSocket socket server configuration
│   │   ├── types.ts                   # Unified TypeScript typings & schemas
│   │   ├── validation.ts              # Zod validation schemas
│   │   └── videoProcessor.ts          # Core frame extraction logic via FFmpeg
│   └── services/                      # Application Business Logic
│       └── FeedRankingService.ts      # Algorithm sorting the personalized feed
```

---

## 2. File Registry

### Authentication & Core Setup
- **[auth.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/auth.ts):** Manages NextAuth configurations, session validations, and Google OAuth credentials.
  * *Dependencies:* `next-auth`, `@auth/prisma-adapter`, `prisma`
- **[globals.css](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/app/globals.css):** Contains global CSS styling, Tailwind configuration overrides, and animatable keyframes.
  * *Dependencies:* `tailwindcss`
- **[layout.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/app/layout.tsx):** Root wrapper injecting providers for styling, React Query, and NextAuth sessions.
  * *Dependencies:* `ReactQueryProvider`, `ThemeProvider`

### Reels (Fullscreen Videos)
- **[ReelCard.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/reels/ReelCard.tsx):** Renders the fullscreen video player, active gesture speed controls, interactive comments, and Instagram-style closed captions.
  * *Dependencies:* `VideoPlayer`, `actions.ts`, `lucide-react`
- **[ReelsIcons.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/reels/ReelsIcons.tsx):** Displays action buttons (like, comment, repost, share, bookmark) with precise responsive layout spacing.
  * *Dependencies:* `lucide-react`, `@/hooks/useFollowerInfo`
- **[actions.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/posts/editor/actions.ts):** Houses server actions for saving captions and translating content using NVIDIA Qwen models.
  * *Dependencies:* `@/lib/prisma`, `google-genai` / NVIDIA integrate API

### Stories & Instants
- **[StoryViewer.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/StoryViewer.tsx):** Controls fullscreen story auto-play slideshow progress bars, emoji reactions, and viewers drawers.
  * *Dependencies:* `framer-motion`, `@/lib/prisma`
- **[StoriesCarousel.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/StoriesCarousel.tsx):** Renders horizontal circular user story bubbles with live active ring styling on the feed header.
  * *Dependencies:* `swiper`, `@/components/UserAvatar`
- **[CreateStoryDialog.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/CreateStoryDialog.tsx):** Modal dialog letting users capture or upload new short-duration photo/video story media.
  * *Dependencies:* `@/components/ui/dialog`, `uploadthing`

### Messaging & Realtime
- **[FloatingChat.tsx](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/components/FloatingChat.tsx):** Standard overlay chat window providing typing indicators, rich text messages, and dynamic keyboard adjustments.
  * *Dependencies:* `@/lib/realtime`, `framer-motion`
- **[realtime.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/realtime.ts):** Socket.io client establishing live server connections for chat messages and instant updates.
  * *Dependencies:* `socket.io-client`
- **[notification-center.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/notification-center.ts):** Handles centralized event dispatcher logic for notifications like comments, likes, and mentions.
  * *Dependencies:* `prisma`

### Custom Hooks & Services
- **[useFollowerInfo.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/hooks/useFollowerInfo.ts):** Manages dynamic local client follow counts and verification states using cached query data.
  * *Dependencies:* `@tanstack/react-query`, `ky`
- **[FeedRankingService.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/services/FeedRankingService.ts):** Ranks user dashboard feed posts based on recency, creator affinity, and engagement metrics.
  * *Dependencies:* `prisma`
- **[videoProcessor.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/videoProcessor.ts):** Service using FFmpeg to split video uploads into structural frame screenshots for shop-the-look matches.
  * *Dependencies:* `fluent-ffmpeg`, `sharp`
- **[videoProductWorker.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/workers/videoProductWorker.ts):** Processes video frames through VLM and Google Shopping SerpApi to detect product items.
  * *Dependencies:* `prisma`, `supabase-js`, `fluent-ffmpeg`
