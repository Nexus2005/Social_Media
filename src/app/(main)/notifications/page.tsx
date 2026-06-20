import { Metadata } from "next";
import Notifications from "./Notifications";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[600px] space-y-5 px-4 py-6">
      <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/40">
        <h1 className="text-center text-2xl font-bold">Notifications</h1>
      </div>
      <Notifications />
    </div>
  );
}
