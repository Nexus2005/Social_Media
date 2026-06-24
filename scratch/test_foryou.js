const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class FeedRankingService {
  static likesWeight = 10;
  static commentsWeight = 15;
  static repostsWeight = 20;
  static viewsWeight = 1;
  static watchTimeWeight = 0.5;
  static completionBonus = 5;
  static affinityWeight = 100;
  static gravity = 1.8;

  static rankPosts(posts, loggedInUserId, followedUserIds) {
    const scoredPosts = posts.map((post) => {
      const likesCount = post._count?.likes ?? 0;
      const commentsCount = post._count?.comments ?? 0;
      const repostsCount = post.reposts?.length ?? post._count?.reposts ?? 0;
      
      const viewsList = post.views ?? [];
      const viewsCount = viewsList.length;
      
      let watchTimeScore = 0;
      viewsList.forEach((v) => {
        if (v.watchDuration) {
          watchTimeScore += v.watchDuration * this.watchTimeWeight;
        }
        if (v.completed) {
          watchTimeScore += this.completionBonus;
        }
      });

      const engagementScore =
        likesCount * this.likesWeight +
        commentsCount * this.commentsWeight +
        repostsCount * this.repostsWeight +
        viewsCount * this.viewsWeight +
        watchTimeScore;

      const isFollowed = followedUserIds.includes(post.userId);
      const affinityScore = isFollowed ? this.affinityWeight : 0;

      let shoppingBoost = 0;
      const jobStatus = post.videoJob?.status;
      if (jobStatus === "completed") {
        shoppingBoost = 100;
      } else if (jobStatus === "processing") {
        shoppingBoost = 20;
      } else if (jobStatus === "pending") {
        shoppingBoost = 0;
      } else if (jobStatus === "failed" || jobStatus === "no_products") {
        shoppingBoost = -20;
      }

      const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
      const score = (engagementScore + affinityScore + shoppingBoost + 10) / Math.pow(ageInHours + 2, this.gravity);

      return {
        post,
        score,
        ageInHours,
        engagementScore,
        affinityScore,
        shoppingBoost,
      };
    });

    return scoredPosts.sort((a, b) => b.score - a.score);
  }
}

async function main() {
  const userId = "6iv247knfjko7iyp";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log("No user found");
    return;
  }
  console.log("Testing with User:", user.username);

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const followedUserIds = following.map((f) => f.followingId);
  console.log("Followed users count:", followedUserIds.length);

  const postsMinimal = await prisma.post.findMany({
    select: {
      id: true,
      userId: true,
      createdAt: true,
      reposts: {
        select: { id: true }
      },
      views: {
        select: { watchDuration: true, completed: true }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        }
      },
      videoJob: {
        select: { status: true }
      },
      attachments: {
        select: { mediaType: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const ranked = FeedRankingService.rankPosts(postsMinimal, user.id, followedUserIds);

  console.log("\n=== TOP 15 RANKED POSTS ===");
  ranked.slice(0, 15).forEach((item, idx) => {
    const isReel = item.post.videoJob !== null;
    const mediaTypes = item.post.attachments.map(a => a.mediaType);
    console.log(`${idx + 1}. ID: ${item.post.id} | Score: ${item.score.toFixed(4)} | Age(hrs): ${item.ageInHours.toFixed(2)} | IsReel: ${isReel} | Media: [${mediaTypes.join(",")}]`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
