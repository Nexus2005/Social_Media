import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.videoProcessingJob.findMany();
  console.log("All VideoProcessingJobs:");
  for (const job of jobs) {
    console.log(`- ID: ${job.id}, postId: ${job.postId}, status: ${job.status}, retryCount: ${job.retryCount}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
