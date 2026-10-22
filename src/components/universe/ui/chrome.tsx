"use client";

/**
 * ÉLÉMENTS DE CONTRÔLE DE L'EXPÉRIENCE
 * Voile de chargement, rail de navigation, barre de progression, entête
 * minimale et repli sans WebGL. Tout est en DOM/CSS : léger et accessible.
 */

import { UI, PALETTE } from "@/lib/universe/content";
import type { Lang } from "@/lib/universe/content";

/* ------------------------------------------------------------------ */
/* Voile de chargement                                                 */
/* ------------------------------------------------------------------ */

export function Loader({
  visible,
  done,
  onSkip,
  lang,
}: {
  visible: boolean;
  done: boolean;
  onSkip: () => void;
  lang: Lang;
}) {
  if (!visible) return null;
  return (
    <div className="universe-loader" data-done={done ? "true" : "false"}>
      <div className="universe-loader__mark" aria-hidden="true">
        <span className="universe-loader__ring" />
        <span className="universe-loader__core" />
      </div>
      <p className="universe-loader__label">{UI.loading[lang]}</p>
      <button type="button" className="universe-loader__skip" onClick={onSkip}>
        {UI.skipLoader[lang]}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail de navigation (timeline des scènes)                            */
/* ------------------------------------------------------------------ */

export interface RailScene {
  index: number;
  id: string;
  label: string;
}

export function SceneRail({
  scenes,
  active,
  onNavigate,
  lang,
}: {
  scenes: RailScene[];
  active: number;
  onNavigate: (index: number) => void;
  lang: Lang;
}) {
  return (
    <nav
      className="universe-rail"
      aria-label={UI.scenesAria[lang]}
      data-active={active}
    >
      {/* Remplissage piloté par --u-progress, sans re-render par frame. */}
      <span className="universe-rail__track" aria-hidden="true">
        <span className="universe-rail__fill" />
      </span>
      <ol className="universe-rail__list">
        {scenes.map((scene) => (
          <li key={scene.id}>
            <button
              type="button"
              onClick={() => onNavigate(scene.index)}
              aria-current={active === scene.index ? "step" : undefined}
              className="universe-rail__dot"
              data-active={active === scene.index ? "true" : "false"}
            >
              <span className="universe-rail__label">{scene.label}</span>
              <span className="universe-rail__pip" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Entête minimale                                                     */
/* ------------------------------------------------------------------ */

export function TopBar({
  name,
  lang,
  onToggleLang,
  classicHref,
}: {
  name: string;
  lang: Lang;
  onToggleLang: () => void;
  classicHref: string;
}) {
  return (
    <header className="universe-top">
      <a className="universe-top__brand" href="#scene-hero">
        <span className="universe-top__mark" aria-hidden="true" />
        <span className="universe-top__name">{name}</span>
      </a>
      <div className="universe-top__actions">
        <button
          type="button"
          className="universe-top__lang"
          onClick={onToggleLang}
          aria-label={`${UI.language[lang]} — ${lang === "fr" ? "English" : "Français"}`}
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
        <a className="universe-top__classic" href={classicHref}>
          {UI.backToClassic[lang]}
        </a>
      </div>
      {/* Largeur pilotée par --u-progress (écrit par le moteur de scroll). */}
      <span className="universe-top__progress" aria-hidden="true" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Repli sans WebGL                                                    */
/* ------------------------------------------------------------------ */

export function StaticBackdrop({ accent = PALETTE.accent }: { accent?: string }) {
  return (
    <div
      className="universe-static"
      aria-hidden="true"
      style={{ ["--u-accent" as string]: accent }}
    >
      <span className="universe-static__grid" />
      <span className="universe-static__glow" />
      <span className="universe-static__horizon" />
    </div>
  );
}
