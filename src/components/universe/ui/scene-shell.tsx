"use client";

import type { ReactNode } from "react";

/**
 * Enveloppe d'une scène plein écran.
 *
 * Le moteur de scroll écrit `--scene-reveal` et `--scene-d` directement sur
 * cet élément : l'apparition et la dérive parallaxe sont donc pilotées en CSS,
 * sans re-render React ni bibliothèque d'animation supplémentaire.
 */
export function SceneShell({
  id,
  index,
  label,
  children,
  className = "",
  innerClassName = "",
  registerRef,
}: {
  id: string;
  index: number;
  label: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  registerRef: (index: number, element: HTMLElement | null) => void;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      data-scene={index}
      ref={(element) => registerRef(index, element)}
      className={`universe-scene ${className}`}
      style={{ "--scene-reveal": 1, "--scene-d": 0 } as React.CSSProperties}
    >
      <div className={`universe-scene__inner ${innerClassName}`}>{children}</div>
    </section>
  );
}
