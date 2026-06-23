"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import MutualsBottomSheet from "@/components/profile/MutualsBottomSheet";

interface MutualsLinkProps {
  userId: string;
}

export default function MutualsLink({ userId }: MutualsLinkProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery<{ users: any[]; count: number }>({
    queryKey: ["user-mutuals-summary", userId],
    queryFn: () => kyInstance.get(`/api/users/${userId}/mutuals`).json<{ users: any[]; count: number }>(),
  });

  if (isLoading || !data || data.count === 0) return null;

  const { users, count } = data;

  let text = "";
  if (count === 1 && users[0]) {
    text = `Followed by ${users[0].displayName || users[0].username}`;
  } else if (count === 2 && users[0] && users[1]) {
    text = `Followed by ${users[0].displayName || users[0].username} and ${users[1].displayName || users[1].username}`;
  } else if (count === 3 && users[0] && users[1] && users[2]) {
    text = `Followed by ${users[0].displayName || users[0].username}, ${users[1].displayName || users[1].username} and 1 other`;
  } else if (count > 3 && users[0] && users[1]) {
    text = `Followed by ${users[0].displayName || users[0].username}, ${users[1].displayName || users[1].username} and ${count - 2} others`;
  }

  if (!text) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[14px] text-zinc-400 hover:text-white transition-colors text-left font-normal mt-1 leading-tight flex items-center gap-1.5"
      >
        <span className="hover:underline">{text}</span>
      </button>

      <MutualsBottomSheet
        userId={userId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
