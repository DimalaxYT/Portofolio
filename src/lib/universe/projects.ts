/**
 * SYSTÈME DE PROJETS DE L'EXPÉRIENCE « UNIVERSE »
 * ===============================================
 * Chaque projet n'est pas une carte : c'est une « scène-monde » 3D pleine
 * page. Ajouter ou retirer un projet = ajouter ou retirer une entrée ici
 * (ou créer le projet dans l'administration du portfolio, il remonte tout
 * seul). Aucun composant 3D à réécrire.
 *
 * Les projets ci-dessous sont des DÉMONSTRATIONS explicites : aucun client
 * réel, aucun résultat inventé. Remplacez-les par vos travaux.
 */

import { toClickableUrl, type Artwork } from "@/lib/types";
import type { LText, Lang } from "./content";

/** Familles de mise en scène 3D disponibles pour un projet. */
export type StageKind = "interface" | "world" | "device" | "architecture";

export interface UniverseProject {
  id: string;
  title: LText;
  tagline: LText;
  description: LText;
  /** Technologies affichées (réelles, éditables). */
  stack: string[];
  stageKind: StageKind;
  /** Couleur d'accent de la scène (héritée de l'identité si absente). */
  accent?: string;
  /** Lien réel du projet. null = aucun bouton « ouvrir » n'est affiché. */
  url: string | null;
  /** Capture utilisée comme texture d'écran (projets CMS). */
  image: string | null;
  /** Mention courte affichée en méta (année, nature…). */
  meta: LText | null;
  /** true = contenu de démonstration, signalé à l'écran. */
  placeholder: boolean;
  source: "config" | "cms";
}

/** Nombre maximal de scènes-projets (garde l'expérience courte et dense). */
export const MAX_PROJECT_SCENES = 4;

/**
 * Projets de démonstration. `placeholder: true` est affiché à l'écran :
 * rien ici ne prétend être un projet réel livré à un client.
 */
export const DEMO_PROJECTS: UniverseProject[] = [
  {
    id: "nebula-os",
    stageKind: "interface",
    title: { fr: "NEBULA OS", en: "NEBULA OS" },
    tagline: {
      fr: "Tableau de bord spatial",
      en: "Spatial dashboard",
    },
    description: {
      fr: "Démonstration d'une interface applicative flottante : panneaux ancrés dans l'espace, profondeur hiérarchisée, lecture immédiate. Remplacez cette entrée par un projet réel.",
      en: "A demonstration of a floating application interface: panels anchored in space, hierarchical depth, immediate readability. Replace this entry with a real project.",
    },
    stack: ["React", "TypeScript", "CSS", "Three.js"],
    accent: "#f0a05a",
    url: null,
    image: null,
    meta: { fr: "Démo · concept", en: "Demo · concept" },
    placeholder: true,
    source: "config",
  },
  {
    id: "atlas-drift",
    stageKind: "world",
    title: { fr: "ATLAS DRIFT", en: "ATLAS DRIFT" },
    tagline: {
      fr: "Monde miniature temps réel",
      en: "Real-time miniature world",
    },
    description: {
      fr: "Démonstration d'un environnement 3D généré procéduralement : terrain maillé, structures instanciées, budget GPU maîtrisé. À remplacer par une création personnelle.",
      en: "A demonstration of a procedurally generated 3D environment: meshed terrain, instanced structures, controlled GPU budget. Replace it with your own creation.",
    },
    stack: ["Three.js", "React Three Fiber", "GLSL"],
    accent: "#f0a05a",
    url: null,
    image: null,
    meta: { fr: "Démo · procédé", en: "Demo · technique" },
    placeholder: true,
    source: "config",
  },
  {
    id: "obsidian-deck",
    stageKind: "device",
    title: { fr: "OBSIDIAN DECK", en: "OBSIDIAN DECK" },
    tagline: {
      fr: "Aperçu produit sur terminal",
      en: "Product preview on device",
    },
    description: {
      fr: "Démonstration d'une mise en scène produit : terminal métallique, écran vivant, caméra qui se rapproche à l'interaction. Emplacement idéal pour un site livré.",
      en: "A demonstration of product staging: metallic device, living screen, camera pushing in on interaction. The right slot for a shipped site.",
    },
    stack: ["Next.js", "React", "CSS"],
    accent: "#f0a05a",
    url: null,
    image: null,
    meta: { fr: "Démo · mise en scène", en: "Demo · staging" },
    placeholder: true,
    source: "config",
  },
  {
    id: "citadel",
    stageKind: "architecture",
    title: { fr: "CITADEL", en: "CITADEL" },
    tagline: {
      fr: "Architecture de données",
      en: "Data architecture",
    },
    description: {
      fr: "Démonstration d'un volume architectural abstrait : dalles en porte-à-faux, arêtes lumineuses, rotation lente. À remplacer par un projet backend ou un produit complet.",
      en: "A demonstration of an abstract architectural volume: cantilevered slabs, luminous edges, slow rotation. Replace it with a backend or full product project.",
    },
    stack: ["Next.js", "Node.js", "SQL", "TypeScript"],
    accent: "#f0a05a",
    url: null,
    image: null,
    meta: { fr: "Démo · structure", en: "Demo · structure" },
    placeholder: true,
    source: "config",
  },
];

/** Mise en scène déduite de la catégorie CMS d'un projet réel. */
function stageForCategory(category: string | null): StageKind {
  switch (category?.normalize("NFC").toLocaleLowerCase("fr-FR")) {
    case "3d":
    case "roblox studio":
      return "world";
    case "vidéo":
    case "video":
      return "device";
    case "cyberdéfense":
    case "cyberdefense":
      return "architecture";
    default:
      return "interface";
  }
}

/** Transforme une réalisation du CMS en scène-monde (contenu réel). */
export function projectFromArtwork(artwork: Artwork): UniverseProject {
  const url = toClickableUrl(artwork.link) ?? toClickableUrl(artwork.url);
  const title = artwork.title.trim();
  const description = artwork.description?.trim() || null;
  return {
    id: `cms-${artwork.id}`,
    title,
    tagline:
      artwork.category ?? (url ? new URL(url).hostname.replace(/^www\./, "") : ""),
    description:
      description ??
      "Projet ajouté depuis l'administration du portfolio. Ajoutez une description pour compléter cette scène.",
    stack: artwork.category ? [artwork.category] : [],
    stageKind: stageForCategory(artwork.category),
    url,
    image: artwork.photo,
    meta: null,
    placeholder: false,
    source: "cms",
  };
}

export interface ProjectPlan {
  projects: UniverseProject[];
  /** Réalisations CMS non retenues (l'expérience reste courte). */
  overflow: number;
}

/**
 * Construit la liste des scènes-projets : le contenu réel du CMS passe
 * devant, les démonstrations complètent jusqu'à `MAX_PROJECT_SCENES`.
 */
export function buildProjectPlan(artworks: Artwork[]): ProjectPlan {
  const real = artworks.map(projectFromArtwork);
  const kept = real.slice(0, MAX_PROJECT_SCENES);
  const demo = DEMO_PROJECTS.slice(0, MAX_PROJECT_SCENES - kept.length);
  return { projects: [...kept, ...demo], overflow: real.length - kept.length };
}

export function projectTitle(project: UniverseProject, lang: Lang): string {
  return typeof project.title === "string" ? project.title : project.title[lang];
}
