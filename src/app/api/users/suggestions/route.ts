import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's profile details (location, professionalCategory)
    const currentUserProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        location: true,
        professionalCategory: true,
      },
    });

    // Get current user's following list
    const currentFollowing = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const currentFollowingIds = new Set(currentFollowing.map((f) => f.followingId));

    // Get current user's followers list (to check "follows you" relation)
    const currentFollowers = await prisma.follow.findMany({
      where: { followingId: user.id },
      select: { followerId: true },
    });
    const currentFollowersIds = new Set(currentFollowers.map((f) => f.followerId));

    // Get hashtags from current user's posts to match interests
    const currentUserPosts = await prisma.post.findMany({
      where: { userId: user.id },
      select: { content: true },
      take: 10,
    });
    const currentUserHashtags = new Set<string>();
    currentUserPosts.forEach((p) => {
      const tags = p.content.match(/#[a-zA-Z0-9_]+/g);
      if (tags) {
        tags.forEach((t) => currentUserHashtags.add(t.toLowerCase()));
      }
    });

    // Grab a pool of candidate users that the user is not already following
    const candidates = await prisma.user.findMany({
      where: {
        NOT: {
          id: user.id,
        },
        followers: {
          none: {
            followerId: user.id,
          },
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        location: true,
        verified: true,
        professionalCategory: true,
        followers: {
          select: {
            followerId: true,
          },
        },
        posts: {
          select: {
            content: true,
          },
          take: 5,
        },
      },
      take: 50,
    });

    // Calculate dynamic recommendation score for each candidate
    const scored = candidates.map((cand) => {
      let score = 0;

      // 1. Follows You (Strong signal)
      const followsYou = currentFollowersIds.has(cand.id);
      if (followsYou) {
        score += 25;
      }

      // 2. Mutual followers
      const mutualCount = cand.followers.filter((f) => currentFollowingIds.has(f.followerId)).length;
      score += mutualCount * 20;

      // 3. Same location match
      if (
        currentUserProfile?.location &&
        cand.location &&
        currentUserProfile.location.toLowerCase() === cand.location.toLowerCase()
      ) {
        score += 10;
      }

      // 4. Professional category match
      if (
        currentUserProfile?.professionalCategory &&
        cand.professionalCategory &&
        currentUserProfile.professionalCategory === cand.professionalCategory
      ) {
        score += 5;
      }

      // 5. Common hashtags/interests
      let commonHashtagsCount = 0;
      cand.posts.forEach((p) => {
        const tags = p.content.match(/#[a-zA-Z0-9_]+/g);
        if (tags) {
          tags.forEach((t) => {
            if (currentUserHashtags.has(t.toLowerCase())) {
              commonHashtagsCount++;
            }
          });
        }
      });
      score += commonHashtagsCount * 5;

      // 6. Popularity/follower count weight
      score += cand.followers.length * 0.1;

      // 7. Verified status
      if (cand.verified) {
        score += 15;
      }

      return {
        user: cand,
        score,
        followsYou,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Format output matching shape expected by suggestions queries
    const finalSuggestions = scored.slice(0, 8).map((item) => ({
      id: item.user.id,
      username: item.user.username,
      displayName: item.user.displayName,
      avatarUrl: item.user.avatarUrl,
      bio: item.user.bio,
      location: item.user.location,
      verified: item.user.verified,
      professionalCategory: item.user.professionalCategory,
      followers: item.user.followers,
      followsYou: item.followsYou,
      _count: {
        followers: item.user.followers.length,
      },
    }));

    return NextResponse.json(finalSuggestions);
  } catch (error) {
    console.error("Error in user suggestions route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
