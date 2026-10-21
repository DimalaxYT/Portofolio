// Attribue les catégories aux 3 réalisations de démonstration.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const MAP: Record<string, string> = {
  DropQR: "Websites",
  "Nordé — Boutique outdoor": "Websites",
  "Maison Léon — Restaurant": "Websites",
};

const artworks = await db.artwork.findMany();
for (const a of artworks) {
  const cat = MAP[a.title];
  if (cat && a.category !== cat) {
    await db.artwork.update({ where: { id: a.id }, data: { category: cat } });
    console.log(`✓ ${a.title} → ${cat}`);
  }
}
// S'assure que la liste des catégories existe dans les réglages
const setting = await db.setting.findUnique({ where: { key: "categories" } });
if (!setting) {
  await db.setting.create({
    data: {
      key: "categories",
      value: JSON.stringify([
        "3D",
        "Roblox Studio",
        "Vidéo",
        "Cyberdéfense",
        "Websites",
      ]),
    },
  });
  console.log("✓ Catégories par défaut créées");
}
await db.$disconnect();
console.log("Terminé.");
