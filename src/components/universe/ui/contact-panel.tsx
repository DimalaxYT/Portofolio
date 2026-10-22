"use client";

/**
 * PANNEAU CONTACT — fin du voyage.
 *
 * Aucun contact inventé : seuls les canaux réellement renseignés dans
 * `CONTACTS` deviennent des liens. Sinon, un état explicite explique où les
 * configurer, et le lien vers le code source (réel) reste disponible.
 */

import { CONTACT, PROFILE, SOURCE_LINK, UI } from "@/lib/universe/content";
import type { ContactLink, Lang } from "@/lib/universe/content";
import { t } from "@/lib/universe/content";

function isLive(link: ContactLink): boolean {
  if (!link.href) return false;
  try {
    const url = new URL(link.href);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function ContactPanel({
  contacts,
  lang,
  onRestart,
  projectsHref,
}: {
  contacts: ContactLink[];
  lang: Lang;
  onRestart: () => void;
  /** Présent quand des réalisations du CMS ne tiennent pas dans l'expérience. */
  projectsHref?: string | null;
}) {
  const live = contacts.filter(isLive);

  return (
    <div className="u-contact">
      <p className="u-kicker u-contact__kicker">
        <span aria-hidden="true" className="u-kicker__pip" />
        {CONTACT.kicker[lang]}
      </p>

      <h2 className="u-contact__title">{CONTACT.title[lang]}</h2>
      <p className="u-contact__subtitle">{CONTACT.subtitle[lang]}</p>

      {live.length > 0 ? (
        <ul className="u-contact__list">
          {live.map((link) => (
            <li key={link.id}>
              <a
                className="u-contact__link"
                href={link.href as string}
                target={link.kind === "email" ? undefined : "_blank"}
                rel={link.kind === "email" ? undefined : "noreferrer noopener"}
              >
                <span className="u-contact__label">{t(link.label, lang)}</span>
                {link.value ? (
                  <span className="u-contact__value">{t(link.value, lang)}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="u-contact__empty">{CONTACT.notConfigured[lang]}</p>
      )}

      <div className="u-contact__foot">
        {projectsHref ? (
          <a className="u-btn u-btn--primary" href={projectsHref}>
            {UI.allProjects[lang]}
          </a>
        ) : null}
        <a
          className="u-btn u-btn--ghost"
          href={SOURCE_LINK.href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {SOURCE_LINK.label[lang]}
        </a>
        <button type="button" className="u-btn u-btn--quiet" onClick={onRestart}>
          {UI.endNote[lang]}
        </button>
      </div>

      <p className="u-contact__sign">{PROFILE.name}</p>
    </div>
  );
}
