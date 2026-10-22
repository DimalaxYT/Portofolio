/**
 * CONTENU ÉDITABLE DE L'EXPÉRIENCE « UNIVERSE » (/universe)
 * ==========================================================
 * Tout le texte, les compétences, les contacts et l'identité visuelle vivent
 * ici. Aucune donnée n'est inventée : ce qui n'est pas renseigné n'est tout
 * simplement pas affiché (voir `CONTACTS` plus bas).
 *
 * Pour modifier l'expérience, éditer ce fichier suffit — aucun composant 3D
 * à toucher.
 */

export type Lang = "fr" | "en";
/** Texte bilingue (ou chaîne simple, déjà résolue — utilisé pour le contenu CMS). */
export type LText = Record<Lang, string> | string;

export const DEFAULT_LANG: Lang = "fr";

/** Résout un texte bilingue dans la langue courante. */
export function t(value: LText, lang: Lang): string {
  return typeof value === "string" ? value : value[lang];
}

/* ------------------------------------------------------------------ */
/* IDENTITÉ                                                            */
/* ------------------------------------------------------------------ */

export const PROFILE = {
  /** Signature affichée en typographie monumentale. */
  name: "4ur",
  /** Initiales utilisées par le monogramme et le rail de navigation. */
  monogram: "4u",
  role: {
    fr: "Créateur numérique · Développeur web",
    en: "Digital creator · Web developer",
  } satisfies Record<Lang, string>,
  /** Accroche du héros — deux lignes, volontairement courtes. */
  headline: {
    fr: ["JE CRÉE DES MONDES.", "PAS SEULEMENT DES SITES."],
    en: ["BUILDING WORLDS.", "NOT JUST WEBSITES."],
  } satisfies Record<Lang, string[]>,
  intro: {
    fr: "Créateur numérique et développeur web. Je conçois des interfaces immersives, des expériences 3D temps réel et des produits web rapides, lisibles et mesurés.",
    en: "Digital creator and web developer. I design immersive interfaces, real-time 3D experiences and web products that are fast, readable and measured.",
  } satisfies Record<Lang, string>,
  scrollHint: {
    fr: "SCROLLER POUR EXPLORER",
    en: "SCROLL TO EXPLORE",
  } satisfies Record<Lang, string>,
  /** Domaines réels du portfolio (catégories du CMS). */
  focus: ["3D", "Web", "Roblox Studio", "Vidéo", "Cyberdéfense"],
} as const;

/* ------------------------------------------------------------------ */
/* SCÈNE 2 — À PROPOS                                                  */
/* ------------------------------------------------------------------ */

export const ABOUT = {
  kicker: { fr: "À propos", en: "About" } satisfies Record<Lang, string>,
  title: {
    fr: "L'INTERFACE EST UN ESPACE.",
    en: "AN INTERFACE IS A SPACE.",
  } satisfies Record<Lang, string>,
  /** Phrases courtes et puissantes — pas de paragraphes. */
  lines: [
    {
      fr: "Je conçois des interfaces qui se ressentent autant qu'elles se lisent.",
      en: "I design interfaces you feel as much as you read.",
    },
    {
      fr: "La 3D temps réel au service du sens, jamais du bruit.",
      en: "Real-time 3D in service of meaning, never noise.",
    },
    {
      fr: "La performance se mesure, elle ne se suppose pas.",
      en: "Performance is measured, never assumed.",
    },
    {
      fr: "Du prototype au produit livré, sans perdre l'intention.",
      en: "From prototype to shipped product, without losing intent.",
    },
    {
      fr: "Chaque détail doit justifier sa place à l'écran.",
      en: "Every detail has to earn its place on screen.",
    },
  ] satisfies Record<Lang, string>[],
  /** Trois repères factuels — éditables, aucun chiffre inventé. */
  markers: [
    {
      label: { fr: "Terrain", en: "Ground" },
      value: { fr: "Web & 3D temps réel", en: "Web & real-time 3D" },
    },
    {
      label: { fr: "Méthode", en: "Method" },
      value: { fr: "Prototype → mesure → produit", en: "Prototype → measure → ship" },
    },
    {
      label: { fr: "Exigence", en: "Standard" },
      value: { fr: "60 FPS ou rien", en: "60 FPS or nothing" },
    },
  ] satisfies { label: LText; value: LText }[],
} as const;

/* ------------------------------------------------------------------ */
/* SCÈNE 4 — COMPÉTENCES                                               */
/* ------------------------------------------------------------------ */

export interface Skill {
  id: string;
  /** Nom affiché (technologie réelle). */
  name: string;
  family: LText;
  detail: LText;
  /** Identifiants de projets liés (voir `DEMO_PROJECTS` / projets CMS). */
  related: string[];
}

/**
 * Compétences réelles et éditables. Pas de pourcentages ni de niveaux
 * arbitraires : chaque entrée décrit un usage concret.
 */
export const SKILLS: Skill[] = [
  {
    id: "html",
    name: "HTML",
    family: { fr: "Structure", en: "Structure" },
    detail: {
      fr: "Sémantique, accessibilité et contenu présent dès le premier rendu serveur.",
      en: "Semantics, accessibility and content available on the very first server render.",
    },
    related: ["nebula-os", "atlas-drift"],
  },
  {
    id: "css",
    name: "CSS",
    family: { fr: "Style", en: "Style" },
    detail: {
      fr: "Tailwind, architectures de tokens, mises en page fluides et safe-areas mobiles.",
      en: "Tailwind, token architectures, fluid layouts and mobile safe-areas.",
    },
    related: ["nebula-os", "obsidian-deck"],
  },
  {
    id: "js",
    name: "JavaScript",
    family: { fr: "Langage", en: "Language" },
    detail: {
      fr: "ES moderne, animation pilotée par rAF, cleanup rigoureux des écouteurs.",
      en: "Modern ES, rAF-driven animation, rigorous listener cleanup.",
    },
    related: ["nebula-os", "citadel"],
  },
  {
    id: "ts",
    name: "TypeScript",
    family: { fr: "Langage", en: "Language" },
    detail: {
      fr: "Typage strict des données et des props : les erreurs tombent à la compilation.",
      en: "Strict typing of data and props: failures surface at compile time.",
    },
    related: ["nebula-os", "citadel"],
  },
  {
    id: "react",
    name: "React",
    family: { fr: "Framework", en: "Framework" },
    detail: {
      fr: "Composants réutilisables, état minimal, rendu prévisible.",
      en: "Reusable components, minimal state, predictable rendering.",
    },
    related: ["nebula-os", "obsidian-deck"],
  },
  {
    id: "nextjs",
    name: "Next.js",
    family: { fr: "Framework", en: "Framework" },
    detail: {
      fr: "Rendu serveur, routes App Router, API intégrées et build standalone.",
      en: "Server rendering, App Router, integrated API routes and standalone builds.",
    },
    related: ["citadel", "obsidian-deck"],
  },
  {
    id: "threejs",
    name: "Three.js",
    family: { fr: "3D", en: "3D" },
    detail: {
      fr: "Scènes WebGL, matériaux PBR, shaders et gestion explicite des ressources GPU.",
      en: "WebGL scenes, PBR materials, shaders and explicit GPU resource disposal.",
    },
    related: ["atlas-drift", "citadel"],
  },
  {
    id: "r3f",
    name: "React Three Fiber",
    family: { fr: "3D", en: "3D" },
    detail: {
      fr: "Scènes 3D déclaratives, lazy-loading et adaptation au budget machine.",
      en: "Declarative 3D scenes, lazy-loading and adaptation to the device budget.",
    },
    related: ["atlas-drift", "nebula-os"],
  },
  {
    id: "node",
    name: "Node.js",
    family: { fr: "Backend", en: "Backend" },
    detail: {
      fr: "Routes API, authentification par session, uploads validés côté serveur.",
      en: "API routes, session authentication, server-side validated uploads.",
    },
    related: ["citadel"],
  },
  {
    id: "sql",
    name: "SQL / libSQL",
    family: { fr: "Données", en: "Data" },
    detail: {
      fr: "Modèle relationnel, migrations versionnées et transactions.",
      en: "Relational modelling, versioned migrations and transactions.",
    },
    related: ["citadel"],
  },
  {
    id: "git",
    name: "Git & GitHub",
    family: { fr: "Outillage", en: "Tooling" },
    detail: {
      fr: "Historique propre, branches courtes, intégration continue.",
      en: "Clean history, short-lived branches, continuous integration.",
    },
    related: ["nebula-os", "citadel"],
  },
  {
    id: "roblox",
    name: "Roblox Studio",
    family: { fr: "Création", en: "Creation" },
    detail: {
      fr: "Scènes 3D, éclairage et scripting Luau pour des expériences jouables.",
      en: "3D scenes, lighting and Luau scripting for playable experiences.",
    },
    related: ["atlas-drift"],
  },
];

/* ------------------------------------------------------------------ */
/* SCÈNE 5 — CONTACT                                                   */
/* ------------------------------------------------------------------ */

export interface ContactLink {
  id: string;
  kind: "email" | "discord" | "github" | "social";
  label: LText;
  /** URL ou handle complet. Vide = le lien n'est pas affiché. */
  href: string | null;
  /** Texte affiché sous le label (ex. l'adresse elle-même). */
  value?: LText;
}

/**
 * CONTACTS — rien n'est inventé.
 *
 * La liste est volontairement vide : la scène contact affiche alors un état
 * explicite « à configurer » plutôt que des liens morts ou fictifs.
 *
 * Pour activer un canal, renseigner `href` (puis supprimer l'entrée inutile) :
 *
 *   { id: "email",   kind: "email",   label: { fr: "Email",   en: "Email" },
 *     href: "mailto:moi@exemple.fr", value: { fr: "moi@exemple.fr", en: "me@example.com" } },
 *   { id: "github",  kind: "github",  label: { fr: "GitHub",  en: "GitHub" },
 *     href: "https://github.com/mon-pseudo", value: "github.com/mon-pseudo" },
 *   { id: "discord", kind: "discord", label: { fr: "Discord", en: "Discord" },
 *     href: "https://discord.gg/mon-serveur", value: "discord.gg/mon-serveur" },
 */
export const CONTACTS: ContactLink[] = [];

/** Lien réel et vérifiable : le dépôt qui héberge ce portfolio. */
export const SOURCE_LINK = {
  label: { fr: "Code source de ce portfolio", en: "Source code of this portfolio" },
  href: "https://github.com/DimalaxYT/Portofolio",
  value: "github.com/DimalaxYT/Portofolio",
} as const;

export const CONTACT = {
  kicker: { fr: "Contact", en: "Contact" } satisfies Record<Lang, string>,
  title: {
    fr: "CONSTRUISONS L'IMPOSSIBLE.",
    en: "LET'S BUILD SOMETHING IMPOSSIBLE.",
  } satisfies Record<Lang, string>,
  subtitle: {
    fr: "Un projet, une idée trop grande, un prototype à sortir du sol : écrivez-moi.",
    en: "A project, an oversized idea, a prototype to pull out of the ground: write to me.",
  } satisfies Record<Lang, string>,
  /** Affiché uniquement tant qu'aucun canal n'est configuré. */
  notConfigured: {
    fr: "Aucun canal de contact n'est encore configuré. Renseignez CONTACTS dans src/lib/universe/content.ts — aucun lien fictif n'est affiché.",
    en: "No contact channel is configured yet. Fill CONTACTS in src/lib/universe/content.ts — no fake link is displayed.",
  } satisfies Record<Lang, string>,
} as const;

/* ------------------------------------------------------------------ */
/* INTERFACE — libellés de l'expérience                                */
/* ------------------------------------------------------------------ */

export const UI = {
  scenes: {
    hero: { fr: "Univers", en: "Universe" },
    about: { fr: "À propos", en: "About" },
    projects: { fr: "Projets", en: "Projects" },
    skills: { fr: "Compétences", en: "Skills" },
    contact: { fr: "Contact", en: "Contact" },
  } satisfies Record<string, Record<Lang, string>>,
  projectSceneLabel: { fr: "Projet", en: "Project" } satisfies Record<Lang, string>,
  openProject: { fr: "Ouvrir le projet", en: "Open project" } satisfies Record<Lang, string>,
  details: { fr: "Détails", en: "Details" } satisfies Record<Lang, string>,
  close: { fr: "Fermer", en: "Close" } satisfies Record<Lang, string>,
  demoChip: { fr: "Contenu de démonstration", en: "Demo content" } satisfies Record<Lang, string>,
  linkMissing: {
    fr: "Lien non configuré",
    en: "Link not configured",
  } satisfies Record<Lang, string>,
  allProjects: {
    fr: "Voir tous les projets",
    en: "See every project",
  } satisfies Record<Lang, string>,
  relatedProjects: { fr: "Projets liés", en: "Related projects" } satisfies Record<Lang, string>,
  noRelated: {
    fr: "Aucun projet lié pour l'instant.",
    en: "No related project yet.",
  } satisfies Record<Lang, string>,
  language: { fr: "Langue", en: "Language" } satisfies Record<Lang, string>,
  backToClassic: {
    fr: "Version classique",
    en: "Classic version",
  } satisfies Record<Lang, string>,
  loading: { fr: "Ouverture de l'univers", en: "Opening the universe" } satisfies Record<Lang, string>,
  skipLoader: { fr: "Passer", en: "Skip" } satisfies Record<Lang, string>,
  webglUnavailable: {
    fr: "Rendu 3D indisponible sur cet appareil — l'expérience continue sans WebGL.",
    en: "3D rendering is unavailable on this device — the experience continues without WebGL.",
  } satisfies Record<Lang, string>,
  quality: { fr: "Qualité du rendu", en: "Render quality" } satisfies Record<Lang, string>,
  scenesAria: {
    fr: "Navigation des scènes",
    en: "Scene navigation",
  } satisfies Record<Lang, string>,
  progressAria: { fr: "Progression de la lecture", en: "Reading progress" } satisfies Record<Lang, string>,
  heroObjectAria: {
    fr: "Sculpture 3D interactive",
    en: "Interactive 3D sculpture",
  } satisfies Record<Lang, string>,
  skillAria: { fr: "Compétences", en: "Skills" } satisfies Record<Lang, string>,
  stackLabel: { fr: "Technologies", en: "Stack" } satisfies Record<Lang, string>,
  endNote: {
    fr: "Fin du voyage — remonter au début",
    en: "End of the journey — back to the start",
  } satisfies Record<Lang, string>,
} as const;

/* ------------------------------------------------------------------ */
/* IDENTITÉ VISUELLE                                                   */
/* ------------------------------------------------------------------ */

/**
 * Un seul accent (cuivre), sur graphite profond. Les atmosphères par scène
 * font varier la teinte du fond/brouillard, jamais l'accent.
 */
export const PALETTE = {
  accent: "#f0a05a",
  accentDeep: "#b96a34",
  accentSoft: "#ffd7ae",
  ink: "#f5f1ea",
  /** Atmosphères : [couleur de fond, couleur de brouillard, densité]. */
  atmosphere: [
    { bg: "#06070b", fog: "#0a0b11", density: 0.019 }, // héros
    { bg: "#05070a", fog: "#080c12", density: 0.024 }, // à propos
    { bg: "#07060a", fog: "#0c0a0d", density: 0.021 }, // projets
    { bg: "#04070a", fog: "#071016", density: 0.017 }, // compétences
    { bg: "#08060a", fog: "#100a08", density: 0.015 }, // contact
  ],
} as const;
