import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, postId } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action field" }, { status: 400 });
    }

    // Ensure user owns the associated post if postId is provided
    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      if (post.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden: Not the owner" }, { status: 403 });
      }
    }

    // --- ACTION: CREATE (MANUAL PRODUCT ASSIGNMENT) ---
    if (action === "create") {
      const { label, category, brand, description, price, imageUrl, retailerUrl, retailerName } = body;

      if (!postId || !label || !category) {
        return NextResponse.json({ error: "Missing required fields (postId, label, category)" }, { status: 400 });
      }

      // Create Master DetectedProduct
      const product = await prisma.detectedProduct.create({
        data: {
          label,
          category,
          brand: brand || null,
          description: description || null,
          thumbnailUrl: imageUrl || null,
          images: imageUrl ? [imageUrl] : [],
          creatorId: user.id,
          postId: postId, // keep temporarily for backwards compatibility
        },
      });

      // Create Retailer Link if provided
      if (retailerUrl && price) {
        // Find or create Merchant
        const storeName = retailerName || "Independent Store";
        let merchant = await prisma.merchant.findUnique({
          where: { name: storeName },
        });
        if (!merchant) {
          merchant = await prisma.merchant.create({
            data: { name: storeName },
          });
        }

        await prisma.shoppingMatch.create({
          data: {
            detectedProductId: product.id,
            title: label,
            price,
            sourceStore: storeName,
            productUrl: retailerUrl,
            directUrl: retailerUrl,
            imageUrl: imageUrl || null,
            retailerSource: "MANUAL",
            merchantId: merchant.id,
          },
        });
      }

      // Create ProductAssignment
      const assignment = await prisma.productAssignment.create({
        data: {
          postId,
          productId: product.id,
          status: "PUBLISHED",
          verificationSource: "CREATOR_ADDED",
          sourceType: "CREATOR_MANUAL",
          manuallyAssigned: true,
          assignedById: user.id,
        },
        include: {
          product: {
            include: {
              matches: {
                include: {
                  merchant: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ success: true, assignment });
    }

    // --- ACTION: UPDATE ---
    if (action === "update") {
      const { assignmentId, productId, label, category, brand, description, images, displayOrder, featured, status } = body;

      if (!productId && !assignmentId) {
        return NextResponse.json({ error: "Missing productId or assignmentId" }, { status: 400 });
      }

      // Update DetectedProduct if productId provided
      if (productId) {
        const product = await prisma.detectedProduct.findUnique({
          where: { id: productId },
          select: { creatorId: true },
        });
        // Check permissions: only creator can edit master product details
        if (product && product.creatorId && product.creatorId !== user.id) {
          return NextResponse.json({ error: "Forbidden: Not your product to edit" }, { status: 403 });
        }

        await prisma.detectedProduct.update({
          where: { id: productId },
          data: {
            ...(label ? { label } : {}),
            ...(category ? { category } : {}),
            brand: brand !== undefined ? brand : undefined,
            description: description !== undefined ? description : undefined,
            images: images !== undefined ? images : undefined,
            ...(images && images.length > 0 ? { thumbnailUrl: images[0] } : {}),
          },
        });
      }

      // Update ProductAssignment if assignmentId provided
      if (assignmentId) {
        const assignment = await prisma.productAssignment.findUnique({
          where: { id: assignmentId },
          include: { post: true },
        });
        if (!assignment) {
          return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }
        if (assignment.post.userId !== user.id) {
          return NextResponse.json({ error: "Forbidden: Not the owner" }, { status: 403 });
        }

        await prisma.productAssignment.update({
          where: { id: assignmentId },
          data: {
            displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
            featured: featured !== undefined ? Boolean(featured) : undefined,
            status: status !== undefined ? status : undefined,
            ...(status === "PUBLISHED" ? { verificationSource: "CREATOR_APPROVED" } : {}),
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    // --- ACTION: APPROVE / BULK APPROVE ---
    if (action === "approve") {
      const { assignmentIds } = body;

      if (!postId && (!assignmentIds || !Array.isArray(assignmentIds))) {
        return NextResponse.json({ error: "Missing postId or assignmentIds array" }, { status: 400 });
      }

      const whereClause = postId
        ? { postId, post: { userId: user.id } }
        : { id: { in: assignmentIds }, post: { userId: user.id } };

      await prisma.productAssignment.updateMany({
        where: whereClause,
        data: {
          status: "PUBLISHED",
          verificationSource: "CREATOR_APPROVED",
        },
      });

      // Also set isVerifiedMatch = true on the matching DetectedProduct records for legacy drawer checks
      const targetAssignments = await prisma.productAssignment.findMany({
        where: whereClause,
        select: { productId: true },
      });
      const productIds = targetAssignments.map((ta) => ta.productId);
      if (productIds.length > 0) {
        await prisma.detectedProduct.updateMany({
          where: { id: { in: productIds } },
          data: { isVerifiedMatch: true },
        });
      }

      return NextResponse.json({ success: true, count: productIds.length });
    }

    // --- ACTION: REJECT / BULK REJECT ---
    if (action === "reject") {
      const { assignmentIds, reviewReason } = body;

      if (!postId && (!assignmentIds || !Array.isArray(assignmentIds))) {
        return NextResponse.json({ error: "Missing postId or assignmentIds array" }, { status: 400 });
      }

      const whereClause = postId
        ? { postId, post: { userId: user.id } }
        : { id: { in: assignmentIds }, post: { userId: user.id } };

      await prisma.productAssignment.updateMany({
        where: whereClause,
        data: {
          status: "HIDDEN",
          reviewReason: reviewReason || "Rejected by creator",
        },
      });

      return NextResponse.json({ success: true });
    }

    // --- ACTION: DELETE / BULK DELETE ---
    if (action === "delete") {
      const { assignmentIds } = body;

      if (!postId && (!assignmentIds || !Array.isArray(assignmentIds))) {
        return NextResponse.json({ error: "Missing postId or assignmentIds array" }, { status: 400 });
      }

      const whereClause = postId
        ? { postId, post: { userId: user.id } }
        : { id: { in: assignmentIds }, post: { userId: user.id } };

      // Find the assignments to collect productIds (to clean up unused master products later)
      const targetAssignments = await prisma.productAssignment.findMany({
        where: whereClause,
        select: { productId: true },
      });
      const productIds = targetAssignments.map((ta) => ta.productId);

      // Delete assignments
      await prisma.productAssignment.deleteMany({
        where: whereClause,
      });

      // Optional: Delete DetectedProducts that no longer have any assignments and are creator-owned
      for (const pId of productIds) {
        const assignmentsCount = await prisma.productAssignment.count({
          where: { productId: pId },
        });
        if (assignmentsCount === 0) {
          const prod = await prisma.detectedProduct.findUnique({
            where: { id: pId },
            select: { creatorId: true },
          });
          if (prod && prod.creatorId === user.id) {
            await prisma.detectedProduct.delete({
              where: { id: pId },
            });
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    // --- ACTION: MERGE ---
    if (action === "merge") {
      const { sourceProductId, targetProductId } = body;

      if (!sourceProductId || !targetProductId) {
        return NextResponse.json({ error: "Missing sourceProductId or targetProductId" }, { status: 400 });
      }

      // 1. Move all retailer matches from source to target
      await prisma.shoppingMatch.updateMany({
        where: { detectedProductId: sourceProductId },
        data: { detectedProductId: targetProductId },
      });

      // 2. Redirect assignments
      // Find all assignments for source
      const sourceAssignments = await prisma.productAssignment.findMany({
        where: { productId: sourceProductId },
      });

      for (const sa of sourceAssignments) {
        // Check if target already exists for this post
        const exists = await prisma.productAssignment.findUnique({
          where: {
            postId_productId: {
              postId: sa.postId,
              productId: targetProductId,
            },
          },
        });

        if (exists) {
          // If assignment already exists, delete the source assignment (since we merged)
          await prisma.productAssignment.delete({
            where: { id: sa.id },
          });
        } else {
          // Redirect the assignment to the target
          await prisma.productAssignment.update({
            where: { id: sa.id },
            data: { productId: targetProductId },
          });
        }
      }

      // 3. Delete the source product
      const sourceProd = await prisma.detectedProduct.findUnique({
        where: { id: sourceProductId },
        select: { creatorId: true },
      });
      if (sourceProd && sourceProd.creatorId === user.id) {
        await prisma.detectedProduct.delete({
          where: { id: sourceProductId },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in creator products route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
