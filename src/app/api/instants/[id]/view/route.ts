import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Record view using upsert to avoid duplicate key exceptions on network stutters
    await prisma.instantView.upsert({
      where: {
        instantId_userId: {
          instantId: id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        instantId: id,
        userId: user.id,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to mark instant viewed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
