import type { Metadata, Viewport } from "next";
import "./universe.css";

export const metadata: Metadata = {
  title: "4UR — Univers interactif",
  description:
    "Expérience 3D interactive : parcourez verticalement un univers de projets, de compétences et de scènes en temps réel. Bilingue FR/EN.",
  alternates: { canonical: "/universe" },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
};

export default function UniverseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
