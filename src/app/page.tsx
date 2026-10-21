import PortfolioApp from "@/components/portfolio/portfolio-app";
import { listArtworks, readSettings } from "@/lib/repository";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [initialArtworks, initialSettings] = await Promise.all([
    listArtworks(),
    readSettings(),
  ]);
  return (
    <PortfolioApp
      initialArtworks={initialArtworks}
      initialSettings={initialSettings}
    />
  );
}
