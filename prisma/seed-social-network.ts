import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const categories = [
  "Travel", "Fitness", "Technology", "Photography", "Food", 
  "Fashion", "Gaming", "Business", "Finance", "Education", 
  "Music", "Sports", "Nature", "Startups", "AI"
];

const locations = [
  "Bali, Indonesia", "New York, USA", "San Francisco, USA", "London, UK", "Tokyo, Japan",
  "Paris, France", "Sydney, Australia", "Cape Town, South Africa", "Berlin, Germany",
  "Dubai, UAE", "Singapore", "Toronto, Canada", "Mumbai, India", "Rome, Italy", "Austin, USA"
];

const captionTemplates: Record<string, string[]> = {
  Travel: [
    "Exploring the hidden beaches of Southeast Asia 🌊 #travel #wanderlust #sunset",
    "Waking up to mountain sunrises never gets old. 🏔️ #adventure #hiking #nature",
    "Lost in the streets of a beautiful new city. 🗺️ #explorer #citybreak #vibes",
    "Grateful for moments like this. Travel opens the mind. #backpacking #journey #views",
    "Paradise found. Can you guess where this is? 🏝️ #vacation #travelgram #blessed"
  ],
  Fitness: [
    "Consistency over intensity. Showing up is half the battle. 💪 #fitness #gym #motivation",
    "Sunrise runs hit different. Fresh air and clear goals. 🏃‍♂️ #running #health #cardio",
    "Pushing past limits today. Sweat is just fat crying! #workout #training #nopainnogain",
    "Fueling the body with clean nutrition. Health is wealth. 🥑 #healthylifestyle #diet #fit",
    "Rest day vibes, but the mind is still focused on the goals. #recovery #fitlife #mindset"
  ],
  Technology: [
    "New workspace setup complete. Productivity mode activated! 💻 #coding #developer #setup",
    "Building something exciting this week. Can't wait to share! 🚀 #startups #software #tech",
    "Refactoring code: because clean code is a love letter to the future. #programming #javascript #dev",
    "Always learning, always updating. Tech moves fast. 🔌 #learning #engineering #gadgets",
    "Debugging code: 99 bugs, fix one, 127 bugs. 🐛 #programmerlife #humor #code"
  ],
  Photography: [
    "Chasing the golden hour light. Magic is in the details. 📸 #photography #goldenhour #canon",
    "Street portraits capture raw human emotions. #portrait #streetphotography #art",
    "Macro details reveal a whole new world. 🔍 #closeup #naturephotography #details",
    "Editing session today. Bringing stories to life. #lightroom #editing #visualart",
    "The best camera is the one you have with you. #mobilephotography #shoot #creative"
  ],
  Food: [
    "Brunch plans done right. Homemade avocado toast! 🥑 #foodie #brunch #homemade",
    "Spicy ramen on a rainy evening is absolute bliss. 🍜 #ramen #comfortfood #chef",
    "Exploring the local street food markets tonight. #streetfood #foodblogger #taste",
    "Baking fresh sourdough bread. The aroma is heavenly. 🍞 #baking #sourdough #diy",
    "Eating colorfully: fresh, seasonal, and vibrant! 🥗 #healthyfood #organic #salad"
  ],
  Default: [
    "Grateful for the journey and the lessons along the way. 🙌 #grateful #mindset #motivation",
    "Morning coffee and planning session. Clear goals win. ☕️ #focus #productivity #morning",
    "Finding balance in a busy world. Take time to breathe. #wellness #balance #peace",
    "Consistency is key. Keep pushing through the challenges. #goals #consistency #discipline",
    "Deep work mode activated. Focus on the path ahead. 🚀 #work #growth #ambition"
  ]
};

const commentTemplates = [
  "Amazing shot 🔥",
  "Love this setup!",
  "Great advice, thanks for sharing 🙌",
  "Need to visit this place soon",
  "This is so inspiring!",
  "Clean vibes goals",
  "Keep pushing! 🚀",
  "Absolutely beautiful",
  "So true! 💯",
  "Wow, looks incredible",
  "Agreed 100%",
  "Thanks for the inspiration!",
  "Such clean composition"
];

// Helper to fetch random photos from Unsplash
async function fetchUnsplashPhotos(query: string, count: number): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY is missing. Using fallbacks.");
    return [];
  }
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&count=${count}&client_id=${accessKey}`
    );
    if (!res.ok) {
      console.error(`Unsplash fetch failed: ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data.map((item: any) => item.urls.regular) : [data.urls.regular];
  } catch (e) {
    console.error("Error fetching Unsplash photos:", e);
    return [];
  }
}

// Helper to fetch random videos from Pexels
async function fetchPexelsVideos(query: string, count: number): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY is missing. Using fallbacks.");
    return [];
  }
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        query
      )}&per_page=${count}&orientation=portrait`,
      {
        headers: { Authorization: apiKey },
      }
    );
    if (!res.ok) {
      console.error(`Pexels fetch failed: ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (!data.videos) return [];
    return data.videos
      .map((v: any) => {
        const file = v.video_files.find((f: any) => f.width < f.height) || v.video_files[0];
        return file?.link || "";
      })
      .filter((link: string) => link !== "");
  } catch (e) {
    console.error("Error fetching Pexels videos:", e);
    return [];
  }
}

// Fallbacks in case API keys are missing/rate-limited
const fallbackAvatars = Array.from(
  { length: 30 },
  (_, i) => `https://images.unsplash.com/photo-${1500000000000 + i * 100000}?w=150&h=150&fit=crop`
);

const fallbackPhotos = Array.from(
  { length: 50 },
  (_, i) => `https://images.unsplash.com/photo-${1510000000000 + i * 100000}?w=800&fit=crop`
);

const fallbackVideos = [
  "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054ba208d130abac3bd40026f7b5d3c&profile_id=139&oauth2_token_id=57447761",
  "https://player.vimeo.com/external/434045526.sd.mp4?s=c27d23d8c2b74052f758fa4f8f4abff27e2a9b24&profile_id=165&oauth2_token_id=57447761",
  "https://player.vimeo.com/external/403756859.sd.mp4?s=d00e84cc2b66236b2803b9b940989f5bc3e21852&profile_id=165&oauth2_token_id=57447761"
];

async function main() {
  console.log("🚀 Starting social network seeding...");

  // Generate standard Lucia/Node hash for Password123
  console.log("🔑 Generating standard password hash...");
  const passwordHash = await hash("Password123", {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  // 1. Pull assets from API pools
  console.log("📸 Querying Unsplash for 100 avatars...");
  let avatars: string[] = [];
  try {
    for (let i = 0; i < 4; i++) {
      const batch = await fetchUnsplashPhotos("portrait face", 25);
      avatars.push(...batch);
    }
  } catch (e) {
    console.warn("Avatar fetch throttled, using fallbacks.");
  }
  if (avatars.length < 100) {
    avatars = [...avatars, ...fallbackAvatars];
    // Fill until 100
    while (avatars.length < 100) {
      avatars.push(fallbackAvatars[avatars.length % fallbackAvatars.length]);
    }
  }

  console.log("🖼️ Querying Unsplash for 150 category photos...");
  const categoryPhotosMap: Record<string, string[]> = {};
  for (const cat of categories) {
    try {
      const batch = await fetchUnsplashPhotos(cat, 10);
      categoryPhotosMap[cat] = batch.length > 0 ? batch : fallbackPhotos;
    } catch {
      categoryPhotosMap[cat] = fallbackPhotos;
    }
  }

  console.log("🎥 Querying Pexels for 40 vertical videos...");
  let videoUrls: string[] = [];
  try {
    videoUrls = await fetchPexelsVideos("lifestyle nature travel", 40);
  } catch {
    console.warn("Video fetch throttled, using fallbacks.");
  }
  if (videoUrls.length < 10) {
    videoUrls = [...videoUrls, ...fallbackVideos];
    while (videoUrls.length < 40) {
      videoUrls.push(fallbackVideos[videoUrls.length % fallbackVideos.length]);
    }
  }

  // Clean existing seed entries to avoid primary key duplicates (but keep production users intact)
  console.log("🧹 Cleaning previous seed entries...");
  await prisma.media.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "media_post_seed_" } },
        { id: { startsWith: "media_reel_seed_" } }
      ]
    }
  });
  await prisma.story.deleteMany({ where: { id: { startsWith: "story_seed_" } } });
  await prisma.comment.deleteMany({ where: { id: { startsWith: "comment_seed_" } } });
  await prisma.like.deleteMany({
    where: {
      OR: [
        { userId: { startsWith: "user_seed_" } },
        { postId: { startsWith: "post_seed_" } },
        { postId: { startsWith: "reel_seed_" } }
      ]
    }
  });
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: { startsWith: "user_seed_" } },
        { followingId: { startsWith: "user_seed_" } }
      ]
    }
  });
  await prisma.post.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "post_seed_" } },
        { id: { startsWith: "reel_seed_" } }
      ]
    }
  });
  await prisma.user.deleteMany({ where: { id: { startsWith: "user_seed_" } } });

  // 2. Create exactly 100 users via createMany
  console.log("👤 Creating 100 users...");
  const usersData = [];
  for (let i = 0; i < 100; i++) {
    const category = categories[i % categories.length];
    const username = `${category.toLowerCase()}_creator_${i}`;
    const displayName = `${category} Creator ${i}`;
    const bio = `Digital creator sharing insights about ${category}. ${
      i % 2 === 0 ? "Building the future 🚀" : "Let's connect! ⚡"
    }`;
    const avatarUrl = avatars[i];
    const location = locations[i % locations.length];

    usersData.push({
      id: `user_seed_${i}`,
      username,
      displayName,
      avatarUrl,
      bio,
      location,
      passwordHash,
    });
  }

  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true,
  });

  // 3. Create Follower Relationships via createMany
  console.log("🤝 Generating follow relationships...");
  const followsData = [];
  for (let i = 0; i < 100; i++) {
    const user = usersData[i];
    let followersCount = 0;
    if (i < 10) followersCount = 65; // Creator (large)
    else if (i < 40) followersCount = 25; // Micro (medium)
    else followersCount = 7; // Nano (small)

    const potentialFollowers = usersData
      .filter((u) => u.id !== user.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, followersCount);

    for (const follower of potentialFollowers) {
      followsData.push({
        followerId: follower.id,
        followingId: user.id,
      });
    }
  }

  await prisma.follow.createMany({
    data: followsData,
    skipDuplicates: true,
  });

  // 4. Create 500 Posts via createMany
  console.log("📝 Generating 500 posts...");
  const postsData = [];
  const mediaData = [];

  for (let i = 0; i < 100; i++) {
    const user = usersData[i];
    const category = categories[i % categories.length];
    const photos = categoryPhotosMap[category] || fallbackPhotos;

    for (let p = 0; p < 5; p++) {
      const templates = captionTemplates[category] || captionTemplates.Default;
      const caption = templates[p % templates.length];
      const imageUrl = photos[p % photos.length];
      const postId = `post_seed_${i}_${p}`;

      postsData.push({
        id: postId,
        userId: user.id,
        content: caption,
        createdAt: new Date(Date.now() - p * 3 * 3600 * 1000),
      });

      mediaData.push({
        id: `media_post_seed_${i}_${p}`,
        postId: postId,
        url: imageUrl,
        mediaType: "IMAGE" as MediaType,
      });
    }
  }

  // 5. Create 100 Reels (Spots) via createMany
  console.log(" Spots/Reels generation...");
  for (let r = 0; r < 100; r++) {
    const user = usersData[r];
    const videoUrl = videoUrls[r % videoUrls.length];
    const caption = `Vibing with the daily hustle! 🎬 #lifestyle #vibes #spots`;
    const reelId = `reel_seed_${r}`;

    postsData.push({
      id: reelId,
      userId: user.id,
      content: caption,
      createdAt: new Date(Date.now() - r * 2 * 3600 * 1000),
    });

    mediaData.push({
      id: `media_reel_seed_${r}`,
      postId: reelId,
      url: videoUrl,
      mediaType: "VIDEO" as MediaType,
    });
  }

  // Insert Posts and Media in bulk
  await prisma.post.createMany({
    data: postsData,
    skipDuplicates: true,
  });

  await prisma.media.createMany({
    data: mediaData,
    skipDuplicates: true,
  });

  // 6. Create 150 Stories via createMany
  console.log("📲 Generating 150 stories...");
  const storiesData = [];
  for (let s = 0; s < 150; s++) {
    const user = usersData[s % 100];
    const isVideo = s % 3 === 0;
    const mediaUrl = isVideo 
      ? videoUrls[s % videoUrls.length]
      : categoryPhotosMap[categories[s % categories.length]][s % 10] || fallbackPhotos[s % fallbackPhotos.length];

    storiesData.push({
      id: `story_seed_${s}`,
      userId: user.id,
      mediaUrl,
      mediaType: isVideo ? "VIDEO" as MediaType : "IMAGE" as MediaType,
      createdAt: new Date(Date.now() - (s % 20) * 3600 * 1000),
    });
  }

  await prisma.story.createMany({
    data: storiesData,
    skipDuplicates: true,
  });

  // 7. Create Likes via createMany
  console.log("❤️ Generating engagement likes...");
  const likesData = [];
  for (let idx = 0; idx < postsData.length; idx++) {
    const post = postsData[idx];
    const authorId = post.userId;
    const authorIdx = parseInt(authorId.split("user_seed_")[1] || "0");

    let likesCount = 0;
    if (authorIdx < 10) likesCount = Math.floor(Math.random() * 60) + 30;
    else if (authorIdx < 40) likesCount = Math.floor(Math.random() * 25) + 10;
    else likesCount = Math.floor(Math.random() * 8) + 2;

    const likers = usersData
      .filter((u) => u.id !== authorId)
      .sort(() => 0.5 - Math.random())
      .slice(0, likesCount);

    for (const liker of likers) {
      likesData.push({
        userId: liker.id,
        postId: post.id,
      });
    }
  }

  await prisma.like.createMany({
    data: likesData,
    skipDuplicates: true,
  });

  // 8. Create 1200 Comments via createMany
  console.log("💬 Distributing 1200 comments...");
  const commentsData = [];
  let commentCount = 0;

  for (const post of postsData) {
    const authorId = post.userId;
    const authorIdx = parseInt(authorId.split("user_seed_")[1] || "0");

    let commentsForPost = 0;
    if (authorIdx < 10) commentsForPost = Math.floor(Math.random() * 8) + 4;
    else if (authorIdx < 40) commentsForPost = Math.floor(Math.random() * 3) + 1;
    else if (Math.random() > 0.6) commentsForPost = 1;

    const commenters = usersData
      .filter((u) => u.id !== authorId)
      .sort(() => 0.5 - Math.random())
      .slice(0, commentsForPost);

    for (const commenter of commenters) {
      if (commentCount >= 1200) break;
      const content = commentTemplates[commentCount % commentTemplates.length];
      
      commentsData.push({
        id: `comment_seed_${commentCount}`,
        userId: commenter.id,
        postId: post.id,
        content,
      });
      commentCount++;
    }
    if (commentCount >= 1200) break;
  }

  await prisma.comment.createMany({
    data: commentsData,
    skipDuplicates: true,
  });

  console.log(`✅ Seeding complete! Created:
    - 100 Users
    - 600 Posts/Reels
    - 150 Stories
    - ${commentCount} Comments
    - ${likesData.length} Likes
    - ${followsData.length} Follows`);
}

main()
  .catch((e) => {
    console.error("Seeding script crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
