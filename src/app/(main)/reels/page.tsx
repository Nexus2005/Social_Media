import { Metadata } from "next";
import ReelsFeed from "./ReelsFeed";

export const metadata: Metadata = {
  title: "Spots",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <ReelsFeed />;
}
