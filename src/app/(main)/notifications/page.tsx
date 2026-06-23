import { Metadata } from "next";
import Notifications from "./Notifications";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[600px] bg-black min-h-screen pb-16 sm:pb-0">
      <Notifications />
    </div>
  );
}
