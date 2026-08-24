-- Performance indexes for hot query paths (additive, safe)
CREATE INDEX "follows_followingId_status_idx" ON "follows"("followingId", "status");
CREATE INDEX "posts_userId_createdAt_idx" ON "posts"("userId", "createdAt");
CREATE INDEX "posts_quotedPostId_idx" ON "posts"("quotedPostId");
CREATE INDEX "likes_postId_idx" ON "likes"("postId");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");
