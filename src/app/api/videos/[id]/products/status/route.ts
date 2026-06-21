import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing video id" }, { status: 400 });
    }

    const job = await prisma.videoProcessingJob.findUnique({
      where: { postId: id },
    });

    // If no job exists in the database, it defaults to pending
    const status = job ? job.status : "pending";

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error("Failed to fetch job status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
