import { Metadata } from "next";
import Bookmarks from "./Bookmarks";

export const metadata: Metadata = {
  title: "Bookmarks",
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[600px] space-y-5 px-4 py-6">
      <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/40">
        <h1 className="text-center text-2xl font-bold">Bookmarks</h1>
      </div>
      <Bookmarks />
    </div>
  );
}
