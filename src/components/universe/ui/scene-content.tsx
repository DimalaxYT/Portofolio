"use client";

/**
 * CONTENU DOM DES SCÈNES HÉROS ET À PROPOS.
 * Toute la typographie vit dans le DOM : nette à toute résolution,
 * sélectionnable, indexable et lisible par les lecteurs d'écran.
 */

import { ABOUT, PROFILE, UI, t } from "@/lib/universe/content";
import type { Lang } from "@/lib/universe/content";

/** Découpe en mots pour une apparition typographique progressive. */
function Words({
  text,
  delay = 0,
  className = "",
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`u-words ${className}`}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} className="u-words__slot">
          <span
            className="u-words__word"
            style={{ animationDelay: `${delay + i * 0.075}s` }}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

export function HeroContent({ lang }: { lang: Lang }) {
  const [lineA, lineB] = PROFILE.headline[lang];

  return (
    <div className="u-hero">
      <p className="u-kicker u-hero__kicker">
        <span aria-hidden="true" className="u-kicker__pip" />
        {PROFILE.role[lang]}
      </p>

      <h1 className="u-hero__title">
        <span className="u-hero__name">
          <Words text={PROFILE.name} delay={0.05} />
        </span>
        <span className="u-hero__line u-hero__line--a">
          <Words text={lineA} delay={0.28} />
        </span>
        <span className="u-hero__line u-hero__line--b">
          <Words text={lineB} delay={0.42} />
        </span>
      </h1>

      <p className="u-hero__intro">{PROFILE.intro[lang]}</p>

      <div className="u-hero__focus" aria-hidden="true">
        {PROFILE.focus.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <a className="u-scroll-hint" href="#scene-about">
        <span>{PROFILE.scrollHint[lang]}</span>
        <span className="u-scroll-hint__arrow" aria-hidden="true">
          ↓
        </span>
      </a>
    </div>
  );
}

export function AboutContent({ lang }: { lang: Lang }) {
  return (
    <div className="u-about">
      <p className="u-kicker">
        <span aria-hidden="true" className="u-kicker__pip" />
        {ABOUT.kicker[lang]}
      </p>

      <h2 className="u-about__title">
        <Words text={ABOUT.title[lang]} />
      </h2>

      <ul className="u-about__lines">
        {ABOUT.lines.map((line, i) => (
          <li key={i} style={{ transitionDelay: `${i * 70}ms` }}>
            <span aria-hidden="true" className="u-about__index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{t(line, lang)}</span>
          </li>
        ))}
      </ul>

      <dl className="u-about__markers">
        {ABOUT.markers.map((marker) => (
          <div key={t(marker.label, lang)}>
            <dt>{t(marker.label, lang)}</dt>
            <dd>{t(marker.value, lang)}</dd>
          </div>
        ))}
      </dl>

      <p className="u-hint-note">
        {UI.heroObjectAria[lang]} · {PROFILE.name}
      </p>
    </div>
  );
}
