import type { Artwork, SiteSettings } from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok)
    throw new Error("Impossible de charger les données. Réessayez plus tard.");
  return res.json();
}
export const fetchArtworks = () => getJson<Artwork[]>("/api/artworks");
export const fetchSettings = () => getJson<SiteSettings>("/api/settings");
export async function fetchCategories() {
  return (await getJson<{ categories: string[] }>("/api/categories"))
    .categories;
}
