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
│   │   ├── ai/                        # Configuration & dynamic AI vision rotating providers
│   │   ├── detection/                 # Computer Vision & local pre-processing pipeline
│   │   ├── marketplace/               # Unified eBay & AliExpress provider clients
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
- **[videoProductWorker.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/workers/videoProductWorker.ts):** Processes video frames through VLM and query matching to detect product items.
  * *Dependencies:* `prisma`, `supabase-js`, `fluent-ffmpeg`
- **[reprocess.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/workers/reprocess.ts):** Developer CLI command tool to manually reset job states and push payloads back onto Redis queues.
  * *Dependencies:* `prisma`

### Marketplace Providers & Querying
- **[types.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/marketplace/types.ts):** Defines unified model structures and interfaces for products and marketplace providers.
  * *Dependencies:* None
- **[eBayProvider.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/marketplace/eBayProvider.ts):** Integrates eBay Browse API utilizing OAuth client credentials token flow and search querying.
  * *Dependencies:* `types.ts`
- **[aliexpressProvider.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/marketplace/aliexpressProvider.ts):** Integrates AliExpress affiliate product search with secure request signature generation.
  * *Dependencies:* `types.ts`
- **[searchManager.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/marketplace/searchManager.ts):** Central manager that coordinates providers, deduplicates products via title similarity, ranks matches, and caches search results.
  * *Dependencies:* `types.ts`, `eBayProvider.ts`, `aliexpressProvider.ts`

### AI Provider Management
- **[configManager.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/ai/configManager.ts):** Centralized secrets registry resolving dynamic API key lists and active configurations.
  * *Dependencies:* None
- **[visionProviderManager.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/ai/visionProviderManager.ts):** Vision VLM coordinator that rotates Gemini keys, manages cooldown states, and handles NVIDIA fallbacks.
  * *Dependencies:* `configManager.ts`

### Computer Vision Detection Pipeline
- **[cv_server.py](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/detection/py-service/cv_server.py):** Python microservice executing local GPU YOLO, pyzbar, EasyOCR, and color extraction.
  * *Dependencies:* `ultralytics`, `easyocr`
- **[detectionPipeline.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/detection/detectionPipeline.ts):** Client pipeline executing image MD5 hashing, persistent file cache lookup, and weighted evidence confidence checks.
  * *Dependencies:* `cv_server.py`
- **[productResolver.ts](file:///c:/Users/Omkar%2520Ahirrao/Desktop/Next%2520Social/nextjs-15-social-media-app/src/lib/detection/productResolver.ts):** Translates visual attributes and OCR fragments into descriptive query strings for product lookups.
  * *Dependencies:* None

---

### [2026-07-03] Update
- **Modified:** `src/lib/workers/videoProductWorker.ts` -> Added Python CV microservice auto-start daemon, concurrent parallel batch frame processing (3 at a time), and queue worker.
- **Modified:** `src/lib/ai/visionProviderManager.ts` -> Upgraded VLM client with index round-robin key rotation, 429 rate limit vs 503 overloaded status failover, and healthy NVIDIA routing.
- **Added:** `src/lib/workers/reprocess.ts` -> Created CLI command script to manually reset jobs to pending and push payloads to Redis queue.
- **Modified:** `src/app/api/shopping-lookup/route.ts` -> Migrated SerpAPI queries to the central SearchManager client with caching.
- **Added:** `src/lib/ai/` -> Centralized Configuration Manager and dynamic Vision Provider Manager with automatic rate-limit cooldown handling.
- **Added:** `src/lib/detection/` -> Local computer vision pipeline with Python microservice host, MD5 image caching, Product Resolver, and weighted confidence rules.
- **Added:** `src/lib/marketplace/` -> Integrated eBay Browse API adapter, AliExpress query signed client, unified types, duplicate matches merging, and search manager caching.
- **Removed/Deprecated:** SerpAPI dependency from the background worker and API route.
