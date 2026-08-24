export class FeedRankingService {
  // Configurable weights for engagement features
  static likesWeight = 10;
  static commentsWeight = 15;
  static repostsWeight = 20;
  static viewsWeight = 1;
  static watchTimeWeight = 0.5;
  static completionBonus = 5;
  static affinityWeight = 100;
  
  // Time decay gravity factor
  static gravity = 1.8;

  /**
   * Ranks an array of posts based on engagement metrics, author follow affinity, and time decay.
   */
  static rankPosts(posts: any[], loggedInUserId: string, followedUserIds: string[]): any[] {
    // Set lookup keeps affinity checks O(1) instead of O(followed) per post
    const followedSet = new Set(followedUserIds);

    const scoredPosts = posts.map((post) => {
      const likesCount = post._count?.likes ?? 0;
      const commentsCount = post._count?.comments ?? 0;
      const repostsCount = post._count?.reposts ?? 0;
      const viewsCount = post._count?.views ?? 0;

      const engagementScore =
        likesCount * this.likesWeight +
        commentsCount * this.commentsWeight +
        repostsCount * this.repostsWeight +
        viewsCount * this.viewsWeight;

      // Author follow affinity check
      const isFollowed = followedSet.has(post.userId);
      const affinityScore = isFollowed ? this.affinityWeight : 0;

      // Shopping Boost Score
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

      // Time decay calculation
      const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
      const score = (engagementScore + affinityScore + shoppingBoost + 10) / Math.pow(ageInHours + 2, this.gravity);

      return {
        post,
        score,
      };
    });

    // Sort by score desc and map back to posts
    return scoredPosts
      .sort((a, b) => b.score - a.score)
      .map((item) => item.post);
  }
}
