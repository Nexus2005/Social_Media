import { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Cartly account settings, appearance preferences, privacy, and notifications.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
