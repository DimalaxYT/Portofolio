import type { Artwork } from "./types";
/** Copy rather than mutate the React Query snapshot (needed for rollback). */
export function applyArtworkOrder(
  artworks: Artwork[],
  ids: string[],
): Artwork[] {
  const byId = new Map(artworks.map((a) => [a.id, a]));
  return ids.flatMap((id, order) => {
    const artwork = byId.get(id);
    return artwork ? [{ ...artwork, order }] : [];
  });
}
