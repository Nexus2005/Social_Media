"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";

export async function deletePost(id: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) throw new Error("Post not found");

  if (post.userId !== user.id) throw new Error("Unauthorized");

  // Delete associated media attachments
  await prisma.media.deleteMany({
    where: { postId: id },
  });

  // Nullify quotedPostId on posts that quote this post
  await prisma.post.updateMany({
    where: { quotedPostId: id },
    data: { quotedPostId: null },
  });

  const deletedPost = await prisma.post.delete({
    where: { id },
    include: getPostDataInclude(user.id),
  });

  return toPlainObject(deletedPost);
}
