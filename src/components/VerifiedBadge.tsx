import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

export function VerifiedBadge({ className, size = 14 }: VerifiedBadgeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ width: size, height: size }}
      className={cn("text-[#0095f6] shrink-0 select-none inline-block align-middle", className)}
    >
      <title>Verified Creator</title>
      <path d="M12 2c-.37 0-.73.12-1.03.35L9.61 3.4c-.45.34-1 .47-1.54.34l-1.63-.39c-.53-.13-1.09.06-1.45.48-.36.42-.49.99-.34 1.52l.46 1.61c.15.53.07 1.11-.22 1.58l-1.04 1.63c-.3.47-.36 1.05-.16 1.57.2.52.62.91 1.15 1.05l1.66.45c.54.14.97.53 1.18 1.06l.66 1.67c.2.51.64.88 1.18.99.53.11 1.08-.09 1.42-.51l1.18-1.47c.36-.45.91-.7 1.49-.69l1.67.04c.54.01 1.05-.24 1.34-.69.29-.45.35-1.01.17-1.52l-.56-1.59c-.19-.53-.13-1.12.16-1.6l1.09-1.56c.32-.46.38-1.05.17-1.57-.2-.52-.64-.9-1.18-1.03l-1.67-.42c-.54-.14-.98-.53-1.19-1.07l-.68-1.73c-.2-.51-.65-.87-1.19-.97-.13-.02-.27-.03-.4-.03zm-1.8 13.5l-3.2-3.2 1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4-6.2 6.2z" />
    </svg>
  );
}
