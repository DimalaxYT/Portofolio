import { z } from "zod";
import { toClickableUrl } from "./types";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const link = nullableText(2048).refine(
  (v) => !v || Boolean(toClickableUrl(v)),
  "URL HTTP(S) invalide",
);
export const artworkSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est obligatoire").max(160),
    url: link,
    link,
    photo: nullableText(2048).refine(
      (v) =>
        !v ||
        /^\/api\/files\/[a-f0-9]{64}\.webp$/.test(v) ||
        /^\/demo\/[\w-]+\.(?:png|jpg|webp)$/.test(v) ||
        (Boolean(toClickableUrl(v)) && /^https?:\/\//i.test(v)),
      "Image : URL HTTP(S) ou image importée requise",
    ),
    description: nullableText(5000),
    category: nullableText(40),
  })
  .strict();
export type ArtworkInput = z.infer<typeof artworkSchema>;
export const categoryName = z.string().trim().normalize().min(1).max(40);
export const categorySchema = z.object({ name: categoryName }).strict();
export const renameCategorySchema = z
  .object({ old: categoryName, new: categoryName })
  .strict();
export const reorderSchema = z
  .object({ ids: z.array(z.string().min(1).max(100)).max(1000) })
  .strict()
  .refine(
    (v) => new Set(v.ids).size === v.ids.length,
    "Identifiants dupliqués",
  );
export const settingsSchema = z
  .object({
    siteTitle: z.string().trim().min(1).max(100),
    heroTitle: z.string().trim().min(1).max(200),
    heroSubtitle: z.string().trim().max(2000),
    footerText: z.string().trim().max(200),
  })
  .strict();
export const loginSchema = z
  .object({ password: z.string().min(1).max(256) })
  .strict();
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères")
      .max(256),
  })
  .strict();
export function normalizeCategory(name: string) {
  return name.normalize("NFC").toLocaleLowerCase("fr-FR");
}
