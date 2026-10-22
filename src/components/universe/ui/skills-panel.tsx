"use client";

/**
 * PANNEAU COMPÉTENCES — l'interface accessible de la constellation 3D.
 *
 * La liste de boutons garantit que rien ne dépend de la souris : le même
 * état pilote le nœud 3D actif, que la sélection vienne du clavier, du
 * tactile ou du survol de l'objet.
 */

import { UI, t } from "@/lib/universe/content";
import type { Lang, Skill } from "@/lib/universe/content";

export function SkillsPanel({
  skills,
  lang,
  activeId,
  onSelect,
  onHover,
  projectTitles,
}: {
  skills: Skill[];
  lang: Lang;
  activeId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** id de projet → titre résolu, pour mettre en avant les projets liés. */
  projectTitles: Record<string, string>;
}) {
  const active = skills.find((skill) => skill.id === activeId) ?? skills[0];
  const related = (active?.related ?? [])
    .map((id) => projectTitles[id])
    .filter((title): title is string => Boolean(title));

  return (
    <div className="u-skills">
      <p className="u-kicker">
        <span aria-hidden="true" className="u-kicker__pip" />
        {UI.scenes.skills[lang]}
      </p>

      <div className="u-skills__panel" aria-live="polite">
        {active ? (
          <>
            <h2 className="u-skills__name">{active.name}</h2>
            <p className="u-skills__family">{t(active.family, lang)}</p>
            <p className="u-skills__detail">{t(active.detail, lang)}</p>
            <div className="u-skills__related">
              <span className="u-skills__related-label">
                {UI.relatedProjects[lang]}
              </span>
              {related.length > 0 ? (
                <ul>
                  {related.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              ) : (
                <p className="u-skills__empty">{UI.noRelated[lang]}</p>
              )}
            </div>
          </>
        ) : null}
      </div>

      <ul className="u-skills__list" aria-label={UI.skillAria[lang]}>
        {skills.map((skill) => (
          <li key={skill.id}>
            <button
              type="button"
              className="u-skill"
              data-active={skill.id === active?.id ? "true" : "false"}
              onClick={() => onSelect(skill.id)}
              onMouseEnter={() => onHover(skill.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(skill.id)}
              onBlur={() => onHover(null)}
              aria-pressed={skill.id === active?.id}
            >
              {skill.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
