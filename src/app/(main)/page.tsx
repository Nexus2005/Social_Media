import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import SuggestedSidebar from "./SuggestedSidebar";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user } = await validateRequest();
  if (!user) {
    redirect("/login");
  }

  return (
    <HomeClient 
      currentUserId={user.id} 
      sidebar={<SuggestedSidebar />} 
    />
  );
}
