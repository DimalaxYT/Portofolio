"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Globe,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LogoMark } from "./logo-mark";
import { ThemeToggle } from "./theme-toggle";
import { ArtworkDialog } from "./artwork-dialog";
import { SettingsPanel } from "./settings-panel";
import { applyArtworkOrder } from "@/lib/artwork-order";
import type { Artwork } from "@/lib/types";

import { fetchArtworks } from "@/lib/api-client";

export function Dashboard({ onExit }: { onExit: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Artwork | null>(null);
  const [toDelete, setToDelete] = useState<Artwork | null>(null);

  const {
    data: artworks,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["artworks"],
    queryFn: fetchArtworks,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/artworks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artworks"] });
      toast({
        title: "Réalisation supprimée",
        description: "Elle n'apparaît plus sur le site public.",
      });
      setToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "La suppression a échoué. Réessayez.",
        variant: "destructive",
      });
    },
  });

  const logout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Déconnexion impossible");
      queryClient.setQueryData(["session"], false);
      toast({ title: "Déconnecté", description: "À bientôt !" });
      onExit();
    } catch {
      toast({
        title: "Erreur",
        description: "Déconnexion impossible. Réessayez.",
        variant: "destructive",
      });
    }
  };

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/artworks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Réordonnancement impossible");
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["artworks"] });
      const previous = queryClient.getQueryData<Artwork[]>(["artworks"]);
      if (previous)
        queryClient.setQueryData(
          ["artworks"],
          applyArtworkOrder(previous, ids),
        );
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous)
        queryClient.setQueryData(["artworks"], context.previous);
      toast({
        title: "Erreur",
        description: "Ordre non enregistré. L’ancien ordre a été restauré.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
  const move = (index: number, dir: -1 | 1) => {
    if (!artworks || reorderMutation.isPending) return;
    const j = index + dir;
    if (j < 0 || j >= artworks.length) return;
    const ids = artworks.map((a) => a.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorderMutation.mutate(ids);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (a: Artwork) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const list = artworks ?? [];

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      {/* Barre d'administration */}
      <header className="sticky top-0 z-40 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate font-display text-lg">
              Administration
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3 max-sm:h-9"
              onClick={onExit}
            >
              <Eye className="mr-1 h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Voir le site</span>
              <span className="sm:hidden">Site</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-2 sm:px-3 max-sm:h-9"
              onClick={logout}
            >
              <LogOut className="mr-1 h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Déconnexion</span>
              <span className="sm:hidden">Sortir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Tabs defaultValue="projets">
          <TabsList className="h-10 w-full sm:h-9 sm:w-fit">
            <TabsTrigger value="projets" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Projets
            </TabsTrigger>
            <TabsTrigger value="parametres" className="gap-1.5">
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Onglet Projets */}
          <TabsContent value="projets" className="mt-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Mes réalisations</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isLoading
                    ? "Chargement…"
                    : `${list.length} réalisation${list.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <Button
                onClick={openCreate}
                className="w-full touch-manipulation sm:w-auto"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter une réalisation
              </Button>
            </div>

            {isError ? (
              <p role="alert" className="py-8 text-destructive">
                Impossible de charger les projets. Réessayez plus tard.
              </p>
            ) : isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card py-16 text-center">
                <Globe className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 font-display text-xl">
                  Aucune réalisation pour le moment
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Ajoutez votre première réalisation : elle apparaîtra
                  immédiatement sur le site public.
                </p>
                <Button onClick={openCreate} className="mt-6 w-full sm:w-auto">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ajouter une réalisation
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((a, i) => (
                  <li
                    key={a.id}
                    className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap sm:gap-4">
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:h-16 sm:w-24">
                        {a.photo ? (
                          <img
                            src={a.photo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-muted">
                            <span className="font-display text-2xl text-foreground/20">
                              {a.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 basis-36">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{a.title}</p>
                          {a.category && (
                            <span className="shrink-0 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {a.category}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.url ?? a.link ?? a.description ?? "—"}
                        </p>
                      </div>
                      {/* Actions : pleine largeur sous l'item sur mobile,
                          en ligne à droite à partir de sm */}
                      <div className="flex w-full shrink-0 items-center justify-end gap-0.5 border-t border-border/60 pt-2 sm:w-auto sm:border-0 sm:pt-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Monter"
                          className="max-sm:h-10 max-sm:w-10"
                          disabled={i === 0 || reorderMutation.isPending}
                          onClick={() => move(i, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Descendre"
                          className="max-sm:h-10 max-sm:w-10"
                          disabled={
                            i === list.length - 1 || reorderMutation.isPending
                          }
                          onClick={() => move(i, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <span
                          aria-hidden="true"
                          className="mx-1 h-5 w-px bg-border sm:mx-0.5"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Modifier"
                          className="max-sm:h-10 max-sm:w-10"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer"
                          className="max-sm:h-10 max-sm:w-10 text-destructive hover:text-destructive"
                          onClick={() => setToDelete(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* Onglet Paramètres */}
          <TabsContent value="parametres" className="mt-6">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Formulaire d'ajout / modification */}
      <ArtworkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        artwork={editing}
      />

      {/* Confirmation de suppression */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réalisation ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.title} » sera définitivement retiré du portfolio.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) deleteMutation.mutate(toDelete.id);
              }}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
