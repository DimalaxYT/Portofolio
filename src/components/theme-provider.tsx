"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Fournisseur de thème clair/sombre.
 * Le thème sombre "obsidienne" est le thème par défaut du site ;
 * le bouton de bascule permet de revenir au thème clair ivoire.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
