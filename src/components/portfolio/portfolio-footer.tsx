"use client";
import { ArrowUp } from "lucide-react";
import { LogoMark } from "./logo-mark";
import type { SiteSettings } from "@/lib/types";
/** Pied de page enrichi — le logo discret reste le bouton secret vers le dashboard. */
export function PortfolioFooter({
  s,
  year,
  onSecretClick,
  reduceMotion,
}: {
  s: SiteSettings;
  year: number;
  onSecretClick: () => void;
  reduceMotion: boolean | null;
}) {
  const backToTop = () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  return (
    <footer
      id="contact"
      className="mt-auto border-t border-border/60 bg-card/50"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Zone haute : brand + navigation */}
        <div className="grid gap-8 py-10 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-5 w-5 text-primary" />
              <span className="font-display text-lg">{s.siteTitle}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {s.heroSubtitle}
            </p>
          </div>
          <nav
            aria-label="Navigation du pied de page"
            className="flex flex-col items-start gap-1 text-sm text-muted-foreground sm:items-end sm:gap-2.5"
          >
            <p className="mb-1 font-display text-base text-foreground">
              Navigation
            </p>
            <a
              href="#projets"
              className="py-1 transition-colors hover:text-primary sm:py-0"
            >
              Projets
            </a>
            <a
              href="#expertises"
              className="py-1 transition-colors hover:text-primary sm:py-0"
            >
              Expertises
            </a>
            <button
              type="button"
              onClick={backToTop}
              className="inline-flex touch-manipulation items-center gap-1.5 py-1 transition-colors hover:text-primary sm:py-0"
            >
              Haut de page
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>

        {/* Barre basse : logo secret + copyright (safe-area iOS incluse) */}
        <div className="flex flex-col items-center gap-4 border-t border-border/60 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
          <button
            type="button"
            onClick={onSecretClick}
            aria-label="Espace administrateur"
            className="cursor-pointer p-2 text-foreground/30 transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
          >
            <LogoMark className="h-6 w-6" />
          </button>
          <p className="text-center text-xs text-muted-foreground">
            © {year} {s.siteTitle} — {s.footerText}
          </p>
        </div>
      </div>
    </footer>
  );
}
