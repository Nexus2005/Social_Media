import React from "react";

interface IconProps {
  isActive?: boolean;
  className?: string;
}

export const HomeIcon = ({ isActive, className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill={isActive ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={isActive ? "0" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <path d="M22 9L12 2 2 9v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2z" />
  </svg>
);

export const SearchIcon = ({ className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const CreateIcon = ({ className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export const ReelsIcon = ({ isActive, className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill={isActive ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M22 7H2M2 17h20M7 2v5M17 2v5M7 17v5M17 17v5" />
    <polygon points="10 10 15 12 10 14 10 10" fill={isActive ? "currentColor" : "none"} />
  </svg>
);

export const HeartIcon = ({ isActive, className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill={isActive ? "#ed4956" : "none"}
    stroke={isActive ? "#ed4956" : "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.956-5.197 7.155l-.324.277L12 20l-3.98-3.447-.324-.277C5.152 14.078 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941L12 7.428l1.117-1.78a4.21 4.21 0 0 1 3.675-1.944Z" />
  </svg>
);

export const CommentIcon = ({ className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
  </svg>
);

export const RepostIcon = ({ className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[22px] h-[22px] ${className}`}
  >
    <path d="M17 17H7.167A3.167 3.167 0 0 1 4 13.833V10.5m3-2L4 5.5l-3 3M7 7h9.833A3.167 3.167 0 0 1 20 10.167v3.333m-3 2 3 3 3-3" />
  </svg>
);

export const DirectShareIcon = ({ className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <path d="M22 2 1.05 10.46a.842.842 0 0 0-.05 1.54l5.63 2.76 2.76 5.63a.84.84 0 0 0 1.54-.05L22 2Z" />
    <line x1="22" y1="2" x2="9.27" y2="14.73" />
  </svg>
);

export const BookmarkIcon = ({ isActive, className = "text-current" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill={isActive ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-[24px] h-[24px] ${className}`}
  >
    <path d="M20 22L12 15.14 4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
  </svg>
);
