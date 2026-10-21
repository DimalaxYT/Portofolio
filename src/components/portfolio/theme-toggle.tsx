"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bouton de bascule clair / sombre.
 * Les deux icônes sont rendues et commutées par la classe `.dark`
 * (posée par next-thèmes avant peinture) : aucun décalage d'hydratation
 * et pas d'état local à synchroniser.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Basculer entre thème sombre et thème clair"
      title="Basculer clair / sombre"
      onClick={toggle}
      className="h-10 w-10 text-muted-foreground transition-colors hover:text-foreground sm:h-9 sm:w-9"
    >
      {/* Soleil visible en mode sombre, Lune visible en mode clair */}
      <Sun className="hidden h-[18px] w-[18px] dark:block" />
      <Moon className="block h-[18px] w-[18px] dark:hidden" />
    </Button>
  );
}
