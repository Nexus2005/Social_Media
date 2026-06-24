const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const counts = {
    users: await p.user.count(),
    posts: await p.post.count(),
    media: await p.media.count(),
    views: await p.postView.count(),
    likes: await p.like.count(),
    comments: await p.comment.count(),
    notifications: await p.notification.count(),
  };
  console.log(counts);
}

main().catch(console.error).finally(() => p.$disconnect());
