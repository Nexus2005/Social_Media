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
    const scoredPosts = posts.map((post) => {
      const likesCount = post._count?.likes ?? 0;
      const commentsCount = post._count?.comments ?? 0;
      const repostsCount = post.reposts?.length ?? post._count?.reposts ?? 0;
      
      const viewsList = post.views ?? [];
      const viewsCount = viewsList.length;
      
      let watchTimeScore = 0;
      viewsList.forEach((v: any) => {
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

      // Author follow affinity check
      const isFollowed = followedUserIds.includes(post.userId);
      const affinityScore = isFollowed ? this.affinityWeight : 0;

      // Time decay calculation
      const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
      const score = (engagementScore + affinityScore + 10) / Math.pow(ageInHours + 2, this.gravity);

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
