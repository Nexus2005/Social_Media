"use client";

import { usePathname } from "next/navigation";
import HeaderActions from "./HeaderActions";
import { Search } from "lucide-react";

export default function DesktopHeader() {
  const pathname = usePathname();

  // Render ONLY on the home feed page (/)
  if (pathname !== "/") {
    return null;
  }

  return (
    <header className="hidden sm:flex items-center justify-between w-full py-4 pl-4 pr-12 md:pl-8 md:pr-16 bg-transparent border-b border-instagram-lightBorder dark:border-instagram-darkBorder flex-shrink-0">
      <form action="/search" method="GET" className="flex-grow max-w-[280px]">
        <div className="uiverse-search-wrapper">
          <div className="uiverse-search-container">
            <input
              name="q"
              type="text"
              placeholder="Search..."
              className="uiverse-search-input"
            />
            <button type="submit" className="uiverse-search-icon-btn">
              <Search className="size-4" />
            </button>
          </div>
        </div>
      </form>
      <HeaderActions />
    </header>
  );
}
