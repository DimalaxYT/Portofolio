export interface Artwork {
  id: string;
  title: string;
  url: string | null;
  photo: string | null;
  description: string | null;
  link: string | null;
  category: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  siteTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  footerText: string;
  /** Liste des catégories, sérialisée en JSON dans la table Setting. */
  categories: string;
}

/** Catégories par défaut du portfolio. */
export const DEFAULT_CATEGORIES: string[] = [
  "3D",
  "Roblox Studio",
  "Vidéo",
  "Cyberdéfense",
  "Websites",
];

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Portfolio Web",
  heroTitle: "Sites web & projets numériques",
  heroSubtitle:
    "Bienvenue sur mon portfolio. Découvrez une sélection de sites web que j'ai conçus et développés — vitrines, e-commerce et applications sur mesure.",
  footerText: "Tous droits réservés",
  categories: JSON.stringify(DEFAULT_CATEGORIES),
};

export const SETTINGS_KEYS: (keyof SiteSettings)[] = [
  "siteTitle",
  "heroTitle",
  "heroSubtitle",
  "footerText",
  "categories",
];

/** Parse la liste des catégories stockée en JSON, avec repli sur les défauts. */
export function parseCategories(raw: string | undefined | null): string[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const list = parsed
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.trim())
          .filter(Boolean);
        if (list.length > 0) return list;
      }
    } catch {
      // JSON invalide → valeur par défaut
    }
  }
  return [...DEFAULT_CATEGORIES];
}

/** Icône (nom lucide) associée à chaque catégorie connue. */
export const CATEGORY_META: Record<string, { icon: string }> = {
  "3d": { icon: "box" },
  "roblox studio": { icon: "gamepad" },
  vidéo: { icon: "clapperboard" },
  video: { icon: "clapperboard" },
  cyberdéfense: { icon: "shield" },
  cyberdefense: { icon: "shield" },
  websites: { icon: "globe" },
  "sites web": { icon: "globe" },
};

export function categoryIconKey(name: string): string {
  return CATEGORY_META[name.toLowerCase().trim()]?.icon ?? "shapes";
}

/**
 * Transforme une adresse saisie en URL cliquable :
 * "monsite.fr" → "https://monsite.fr" ; les valeurs déjà
 * complètes (http/https) sont conservées telles quelles.
 */
export function toClickableUrl(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value || /[\s\\\u0000-\u001f]/.test(value)) return null;
  const candidate = /^https?:\/\//i.test(value)
    ? value
    : /^(?:[\w-]+\.)+[\w-]+(?::\d+)?(?:[/?#].*)?$/.test(value)
      ? `https://${value}`
      : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
