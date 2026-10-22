"use client";

/**
 * PANNEAU PROJET — la moitié DOM d'une scène-monde.
 *
 * Règles respectées ici :
 *  - aucun lien fictif : le bouton « ouvrir » n'existe que si `url` est réel,
 *  - le contenu de démonstration est signalé explicitement,
 *  - le survol ET le focus clavier déclenchent le même rapprochement caméra.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import { UI, t } from "@/lib/universe/content";
import type { Lang } from "@/lib/universe/content";
import type { UniverseProject } from "@/lib/universe/projects";

export function ProjectPanel({
  project,
  lang,
  onEngage,
  onDisengage,
}: {
  project: UniverseProject;
  lang: Lang;
  onEngage: () => void;
  onDisengage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  /* Dialog : focus initial, fermeture Échap, retour du focus. */
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const engage = () => onEngage();
  const disengage = () => onDisengage();

  return (
    <div
      className="u-project"
      data-mounted={mounted ? "true" : "false"}
      onMouseEnter={engage}
      onMouseLeave={disengage}
      onFocus={engage}
      onBlur={disengage}
    >
      <div className="u-project__meta">
        {project.placeholder ? (
          <span className="u-chip u-chip--demo">{UI.demoChip[lang]}</span>
        ) : (
          <span className="u-chip">{UI.scenes.projects[lang]}</span>
        )}
        {project.meta ? <span className="u-project__year">{t(project.meta, lang)}</span> : null}
      </div>

      <h2 className="u-project__title">{t(project.title, lang)}</h2>
      <p className="u-project__tagline">{t(project.tagline, lang)}</p>

      {project.stack.length > 0 && (
        <ul className="u-stack" aria-label={UI.stackLabel[lang]}>
          {project.stack.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      )}

      <div className="u-project__actions">
        {project.url ? (
          <a
            className="u-btn u-btn--primary"
            href={project.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {UI.openProject[lang]}
            <ArrowUpRight aria-hidden="true" className="u-btn__icon" />
          </a>
        ) : (
          <span className="u-btn u-btn--disabled" aria-disabled="true">
            {UI.linkMissing[lang]}
          </span>
        )}
        <button
          type="button"
          className="u-btn u-btn--ghost"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {UI.details[lang]}
        </button>
      </div>

      {open &&
        /* Portal : la scène est transformée (parallaxe), un `position: fixed`
           fils y serait piégé. Le dialog part donc directement dans <body>. */
        createPortal(
          <div
            className="u-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t(project.title, lang)}
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
          <div className="u-dialog__panel">
            <header className="u-dialog__head">
              <h3>{t(project.title, lang)}</h3>
              <button
                ref={closeButtonRef}
                type="button"
                className="u-dialog__close"
                onClick={() => setOpen(false)}
                aria-label={UI.close[lang]}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <p className="u-dialog__body">{t(project.description, lang)}</p>
            {project.stack.length > 0 && (
              <ul className="u-stack">
                {project.stack.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            )}
            {project.url && (
              <a
                className="u-btn u-btn--primary"
                href={project.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {UI.openProject[lang]}
                <ArrowUpRight aria-hidden="true" className="u-btn__icon" />
              </a>
            )}
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
