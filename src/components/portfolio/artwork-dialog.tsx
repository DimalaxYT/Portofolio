"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Artwork } from "@/lib/types";
import { fetchCategories } from "@/lib/api-client";

interface FormState {
  title: string;
  url: string;
  link: string;
  description: string;
  photo: string;
  category: string;
}

const EMPTY: FormState = {
  title: "",
  url: "",
  link: "",
  description: "",
  photo: "",
  category: "",
};

export function ArtworkDialog({
  open,
  onOpenChange,
  artwork,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artwork: Artwork | null;
}) {
  const isEdit = artwork !== null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Liste des catégories disponibles (Paramètres → Catégories)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 30_000,
  });

  // (Ré)initialise le formulaire à chaque ouverture
  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        artwork
          ? {
              title: artwork.title,
              url: artwork.url ?? "",
              link: artwork.link ?? "",
              description: artwork.description ?? "",
              photo: artwork.photo ?? "",
              category: artwork.category ?? "",
            }
          : EMPTY,
      );
    }
  }, [open, artwork]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      setError("Image supérieure à 8 Mo");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        set("photo")(data.url);
        toast({ title: "Image importée" });
      } else {
        setError(data?.error ?? "Échec de l'import de l'image");
      }
    } catch {
      setError("Échec de l'import de l'image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/artworks/${artwork.id}` : "/api/artworks",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["artworks"] });
        toast({
          title: isEdit ? "Réalisation modifiée" : "Réalisation ajoutée",
          description: "Le site public est à jour.",
        });
        onOpenChange(false);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Une erreur est survenue");
      }
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overscroll-contain overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Modifier la réalisation" : "Nouvelle réalisation"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de ce projet."
              : "Ajoutez une nouvelle réalisation à votre portfolio."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Capture d'écran */}
          <div className="space-y-2">
            <Label>Capture d&apos;écran</Label>
            <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
              {form.photo ? (
                <img
                  src={form.photo}
                  alt="Aperçu du site"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                  <p className="text-xs">Aucune image pour le moment</p>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Importer une image
              </Button>
              <Input
                placeholder="…ou collez l'URL d'une image"
                value={form.photo}
                onChange={(e) => set("photo")(e.target.value)}
                className="h-9 flex-1 text-sm"
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <Label htmlFor="aw-category">Catégorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category")(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="aw-category" className="w-full">
                <SelectValue placeholder="Choisir une catégorie…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sans catégorie</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Permet aux visiteurs de filtrer vos réalisations par type de
              projet.
            </p>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="aw-title">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="aw-title"
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="Ex. : Maison Léon — Site du restaurant"
              required
            />
          </div>

          {/* Adresse du site */}
          <div className="space-y-2">
            <Label htmlFor="aw-url">Adresse du site</Label>
            <Input
              id="aw-url"
              value={form.url}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="Ex. : maisonleon.fr"
            />
            <p className="text-xs text-muted-foreground">
              Affichée dans la barre d&apos;adresse du navigateur, sur la carte
              du site public.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="aw-desc">Description</Label>
            <Textarea
              id="aw-desc"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder="Quelques mots sur ce projet : objectifs, fonctionnalités, technologies utilisées, résultats…"
              rows={4}
            />
          </div>

          {/* Lien du site */}
          <div className="space-y-2">
            <Label htmlFor="aw-link">Lien du site</Label>
            <Input
              id="aw-link"
              type="url"
              value={form.link}
              onChange={(e) => set("link")(e.target.value)}
              placeholder="https://maisonleon.fr"
            />
            <p className="text-xs text-muted-foreground">
              Le bouton « Visiter le site » sur le site public pointera vers
              cette adresse.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || uploading}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Ajouter la réalisation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
