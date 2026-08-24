"use client";

import React, { createContext, useContext } from "react";
import type { StreamChat } from "stream-chat";
import useInitializeChatClient from "./messages/useInitializeChatClient";

const ChatContext = createContext<StreamChat | null>(null);

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const chatClient = useInitializeChatClient();

  return (
    <ChatContext.Provider value={chatClient}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  return context;
}
