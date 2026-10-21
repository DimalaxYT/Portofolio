/**
 * Migration du portfolio "atelier d'art" → "portfolio de sites web".
 * - Met à jour les textes du site (Settings)
 * - Remplace les 3 œuvres de démonstration par 3 sites web
 *   (captures d'écran servies depuis /public/demo)
 */
import { PrismaClient } from "@prisma/client";
import { unlinkSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const SETTINGS = {
  siteTitle: "Portfolio Web",
  heroTitle: "Sites web & projets numériques",
  heroSubtitle:
    "Bienvenue sur mon portfolio. Découvrez une sélection de sites web que j'ai conçus et développés — vitrines, e-commerce et applications sur mesure.",
};

const PROJECTS = [
  {
    title: "Maison Léon — Restaurant",
    url: "maisonleon-lyon.fr",
    link: "https://example.com/maison-leon",
    photo: "/demo/site-restaurant.png",
    description:
      "Site vitrine pour un restaurant bistronomique lyonnais : carte mise à jour chaque semaine, réservation de table en ligne et mise en avant des avis clients. Design élégant pensé pour le mobile.",
  },
  {
    title: "Nordé — Boutique outdoor",
    url: "norde-outdoor.com",
    link: "https://example.com/norde",
    photo: "/demo/site-ecommerce.png",
    description:
      "Boutique en ligne d'équipement outdoor : catalogue filtrable, fiches produits détaillées et tunnel de commande optimisé. Paiement sécurisé et gestion des stocks en temps réel.",
  },
  {
    title: "Taskly — Application SaaS",
    url: "app.taskly.io",
    link: "https://example.com/taskly",
    photo: "/demo/site-saas.png",
    description:
      "Application web de gestion de projet : tableau de bord en temps réel, vue calendrier et suivi d'équipe. Abonnements mensuels, espace d'essai gratuit et intégrations tierces.",
  },
];

async function main() {
  // 1. Textes du site
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log("✓ Textes du site mis à jour");

  // 2. Supprimer les anciennes œuvres (thème peinture)
  const old = await prisma.artwork.findMany();
  for (const a of old) {
    if (a.photo?.startsWith("/api/files/")) {
      const name = a.photo.split("/").pop() as string;
      try {
        unlinkSync(join(process.cwd(), "uploads", name));
        console.log("  ancienne image supprimée :", name);
      } catch {
        /* fichier déjà absent */
      }
    }
  }
  await prisma.artwork.deleteMany({});
  console.log(`✓ ${old.length} ancienne(s) œuvre(s) supprimée(s)`);

  // 3. Insérer les sites web de démonstration
  let order = 0;
  for (const p of PROJECTS) {
    await prisma.artwork.create({ data: { ...p, order: order-- } });
  }
  console.log(`✓ ${PROJECTS.length} sites web de démonstration insérés`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
