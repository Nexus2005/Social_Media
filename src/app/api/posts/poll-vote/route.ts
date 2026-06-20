import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { optionId } = await req.json();
    if (!optionId) {
      return NextResponse.json({ error: "Missing optionId" }, { status: 400 });
    }

    // Find the option and associated poll
    const option = await prisma.pollOption.findUnique({
      where: { id: optionId },
      include: {
        poll: true,
      },
    });

    if (!option) {
      return NextResponse.json({ error: "Poll option not found" }, { status: 404 });
    }

    const poll = option.poll;

    // Check expiration
    if (poll.expiresAt < new Date()) {
      return NextResponse.json({ error: "This poll has already expired" }, { status: 400 });
    }

    // Check if the user has already voted on this poll
    const existingVote = await prisma.pollVote.findUnique({
      where: {
        userId_pollId: {
          userId: user.id,
          pollId: poll.id,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted in this poll" }, { status: 400 });
    }

    // Create the vote
    const vote = await prisma.pollVote.create({
      data: {
        userId: user.id,
        optionId: optionId,
        pollId: poll.id,
      },
    });

    // Return the updated poll data including options and counts
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        options: {
          include: {
            votes: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPoll);
  } catch (error) {
    console.error("Error in poll vote route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
