import UniverseExperience from "@/components/universe/universe-experience";
import { listArtworks, readSettings } from "@/lib/repository";

export const dynamic = "force-dynamic";

/**
 * EXPÉRIENCE 3D « UNIVERSE »
 * Route distincte de l'accueil classique : les deux restent disponibles et
 * partagent la même source de données (projets et réglages du CMS).
 */
export default async function UniversePage() {
  const [initialArtworks, initialSettings] = await Promise.all([
    listArtworks(),
    readSettings(),
  ]);

  return (
    <UniverseExperience
      initialArtworks={initialArtworks}
      initialSettings={initialSettings}
    />
  );
}
