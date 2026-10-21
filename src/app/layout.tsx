import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "@fontsource-variable/playfair-display/index.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

/* viewport-fit=cover : les safe-areas iOS (encoche/barre gestuelle) sont
   disponibles via env(safe-area-inset-*) dans les composants. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#181310" },
  ],
};

export const metadata: Metadata = {
  title: "Portfolio Web — Sites & projets numériques",
  description:
    "Portfolio de sites web : découvrez une sélection de projets web conçus et développés — sites vitrines, e-commerce et applications.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
