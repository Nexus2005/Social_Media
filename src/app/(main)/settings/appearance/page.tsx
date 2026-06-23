import { Metadata } from "next";
import AppearanceClient from "./AppearanceClient";

export const metadata: Metadata = {
  title: "Appearance Settings",
  description: "Customize the theme and appearance of your Cartly social experience.",
};

export default function AppearancePage() {
  return <AppearanceClient />;
}
