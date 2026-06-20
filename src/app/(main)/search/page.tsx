import { Metadata } from "next";
import SearchPageClient from "./SearchPageClient";

interface PageProps {
  searchParams: { q?: string };
}

export function generateMetadata({ searchParams: { q } }: PageProps): Metadata {
  return {
    title: q ? `Search results for "${q}"` : "Search & Explore",
  };
}

export default function Page({ searchParams: { q } }: PageProps) {
  return <SearchPageClient initialQuery={q || ""} />;
}
