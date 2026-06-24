import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import SessionProvider from "./SessionProvider";
import ChatProvider from "./ChatProvider";
import { StoryViewerProvider } from "@/components/StoryViewerProvider";
import CartlySidebar from "./CartlySidebar";
import MobileNavigation from "./MobileNavigation";
import FloatingChat from "@/components/FloatingChat";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateRequest();

  if (!session.user) redirect("/login");

  // Fetch counts server-side for initial hydration state
  const [unreadNotificationsCount, unreadMessagesCount] = await Promise.all([
    prisma.notification.count({
      where: {
        recipientId: session.user.id,
        read: false,
      },
    }),
    streamServerClient
      .getUnreadCount(session.user.id)
      .then((res) => res.total_unread_count)
      .catch(() => 0),
  ]);

  return (
    <SessionProvider value={session}>
      <ChatProvider>
        <StoryViewerProvider>
          <div className="flex min-h-screen flex-col bg-background">
          {/* Left Sidebar for Desktop */}
          <CartlySidebar
            initialNotificationsCount={unreadNotificationsCount}
            initialMessagesCount={unreadMessagesCount}
          />

          {/* Top/Bottom Nav for Mobile */}
          <MobileNavigation
            initialNotificationsCount={unreadNotificationsCount}
            initialMessagesCount={unreadMessagesCount}
          />

          {/* Main Content Area */}
          <div className="main-content-wrapper flex-grow flex justify-center w-full pl-0 sm:pl-[72px] xl:pl-[244px] pb-14 sm:pb-0 transition-all duration-300">
            <main className="w-full">
              {children}
            </main>
          </div>


          {/* Floating Chat Window Overlay */}
          <FloatingChat />
        </div>
        </StoryViewerProvider>
      </ChatProvider>
    </SessionProvider>
  );
}

