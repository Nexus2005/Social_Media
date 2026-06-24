const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const meId = "ddtyr2pxl2g76x64"; // Omkar2005

  console.log("Starting database cleanup...");

  // 1. Gather all post IDs that are NOT created by "me"
  const postsToDelete = await prisma.post.findMany({
    where: {
      NOT: {
        userId: meId
      }
    },
    select: {
      id: true
    }
  });
  const postIdsToDelete = postsToDelete.map(p => p.id);
  console.log(`Found ${postIdsToDelete.length} posts to delete (all posts not created by ${meId}).`);

  // 2. Gather all seed user IDs (starts with "user_seed_")
  const seedUsers = await prisma.user.findMany({
    where: {
      id: {
        startsWith: "user_seed_"
      }
    },
    select: {
      id: true
    }
  });
  const seedUserIds = seedUsers.map(u => u.id);
  console.log(`Found ${seedUserIds.length} seed users to delete.`);

  // We delete records in dependent order to avoid foreign key violations.
  
  // -- Dependent on Posts or Users to delete --
  
  console.log("Deleting media attachments...");
  await prisma.media.deleteMany({
    where: {
      postId: {
        in: postIdsToDelete
      }
    }
  });

  console.log("Deleting post views...");
  await prisma.postView.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting likes...");
  await prisma.like.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting bookmarks...");
  await prisma.bookmark.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting reposts...");
  await prisma.repost.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting post mentions...");
  await prisma.postMention.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting comment likes...");
  await prisma.commentLike.deleteMany({
    where: {
      OR: [
        { userId: { in: seedUserIds } },
        { comment: { postId: { in: postIdsToDelete } } }
      ]
    }
  });

  console.log("Deleting comments...");
  await prisma.comment.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting notifications...");
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { recipientId: { in: seedUserIds } },
        { issuerId: { in: seedUserIds } },
        { postId: { in: postIdsToDelete } }
      ]
    }
  });

  console.log("Deleting price histories...");
  await prisma.priceHistory.deleteMany({
    where: {
      shoppingMatch: {
        detectedProduct: {
          postId: { in: postIdsToDelete }
        }
      }
    }
  });

  console.log("Deleting shopping matches...");
  await prisma.shoppingMatch.deleteMany({
    where: {
      detectedProduct: {
        postId: { in: postIdsToDelete }
      }
    }
  });

  console.log("Deleting detected products...");
  await prisma.detectedProduct.deleteMany({
    where: {
      postId: { in: postIdsToDelete }
    }
  });

  console.log("Deleting detected objects...");
  await prisma.detectedObject.deleteMany({
    where: {
      postId: { in: postIdsToDelete }
    }
  });

  console.log("Deleting video processing jobs...");
  await prisma.videoProcessingJob.deleteMany({
    where: {
      postId: { in: postIdsToDelete }
    }
  });

  console.log("Deleting poll votes...");
  await prisma.pollVote.deleteMany({
    where: {
      OR: [
        { poll: { postId: { in: postIdsToDelete } } },
        { userId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting poll options...");
  await prisma.pollOption.deleteMany({
    where: {
      poll: { postId: { in: postIdsToDelete } }
    }
  });

  console.log("Deleting polls...");
  await prisma.poll.deleteMany({
    where: {
      postId: { in: postIdsToDelete }
    }
  });

  console.log("Deleting saved collection items...");
  await prisma.savedCollectionItem.deleteMany({
    where: {
      OR: [
        { postId: { in: postIdsToDelete } },
        { collection: { userId: { in: seedUserIds } } }
      ]
    }
  });

  console.log("Deleting saved collections...");
  await prisma.savedCollection.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  console.log("Deleting product collection items...");
  await prisma.productCollectionItem.deleteMany({
    where: {
      OR: [
        { collection: { userId: { in: seedUserIds } } },
        { product: { postId: { in: postIdsToDelete } } }
      ]
    }
  });

  console.log("Deleting product collections...");
  await prisma.productCollection.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  console.log("Deleting product assignments...");
  await prisma.productAssignment.deleteMany({
    where: {
      postId: { in: postIdsToDelete }
    }
  });

  console.log("Deleting product events...");
  await prisma.productEvent.deleteMany({
    where: {
      OR: [
        { userId: { in: seedUserIds } },
        { product: { postId: { in: postIdsToDelete } } }
      ]
    }
  });

  console.log("Deleting campaigns...");
  await prisma.campaign.deleteMany({
    where: {
      creatorId: { in: seedUserIds }
    }
  });

  console.log("Deleting recent locations...");
  await prisma.recentLocation.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  console.log("Deleting pinned contents...");
  await prisma.pinnedContent.deleteMany({
    where: {
      OR: [
        { userId: { in: seedUserIds } },
        { postId: { in: postIdsToDelete } }
      ]
    }
  });

  console.log("Deleting chat preferences...");
  await prisma.chatPin.deleteMany({
    where: { userId: { in: seedUserIds } }
  });
  await prisma.chatArchive.deleteMany({
    where: { userId: { in: seedUserIds } }
  });
  await prisma.chatMute.deleteMany({
    where: { userId: { in: seedUserIds } }
  });
  await prisma.conversationSettings.deleteMany({
    where: { userId: { in: seedUserIds } }
  });

  console.log("Deleting stories...");
  await prisma.story.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  console.log("Deleting draft posts...");
  await prisma.draftPost.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  console.log("Deleting sessions...");
  await prisma.session.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  console.log("Deleting follows...");
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: { in: seedUserIds } },
        { followingId: { in: seedUserIds } }
      ]
    }
  });

  console.log("Deleting notification preferences...");
  await prisma.notificationPreference.deleteMany({
    where: {
      userId: { in: seedUserIds }
    }
  });

  // -- Delete Main Posts --
  console.log("Deleting posts...");
  const deletePostsResult = await prisma.post.deleteMany({
    where: {
      NOT: {
        userId: meId
      }
    }
  });
  console.log(`Deleted ${deletePostsResult.count} posts.`);

  // -- Delete Seed Users --
  console.log("Deleting seed users...");
  const deleteUsersResult = await prisma.user.deleteMany({
    where: {
      id: {
        startsWith: "user_seed_"
      }
    }
  });
  console.log(`Deleted ${deleteUsersResult.count} seed users.`);

  // 3. Clear merchants and brands (optional helper cleanup for dummy entities)
  console.log("Deleting merchants...");
  await prisma.merchant.deleteMany({});
  console.log("Deleting brands...");
  await prisma.brand.deleteMany({});

  console.log("Cleanup complete!");
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
