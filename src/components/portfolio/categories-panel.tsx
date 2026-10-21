"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Shapes, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from "./category-icon";

import { fetchCategories } from "@/lib/api-client";

/**
 * Gestion CRUD des catégories : ajouter, renommer, supprimer.
 * La suppression d'une catégorie retire celle-ci des œuvres concernées
 * (elles restent visibles, « sans catégorie »).
 */
export function CategoriesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    queryClient.invalidateQueries({ queryKey: ["artworks"] });
  };

  const handleError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback;
    toast({ title: "Erreur", description: message, variant: "destructive" });
  };

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Échec de l'ajout");
      return data;
    },
    onSuccess: () => {
      setNewName("");
      invalidate();
      toast({ title: "Catégorie ajoutée" });
    },
    onError: (e) => handleError(e, "Échec de l'ajout"),
  });

  const renameMutation = useMutation({
    mutationFn: async ({
      old: oldName,
      new: newName,
    }: {
      old: string;
      new: string;
    }) => {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old: oldName, new: newName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Échec du renommage");
      return data;
    },
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast({
        title: "Catégorie renommée",
        description: "Les œuvres associées ont été mises à jour.",
      });
    },
    onError: (e) => handleError(e, "Échec du renommage"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Échec de la suppression");
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: "Catégorie supprimée",
        description: "Les œuvres associées sont maintenant sans catégorie.",
      });
    },
    onError: (e) => handleError(e, "Échec de la suppression"),
  });

  const list = categories ?? [];
  const busy =
    isLoading ||
    isError ||
    addMutation.isPending ||
    renameMutation.isPending ||
    deleteMutation.isPending;

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    addMutation.mutate(name);
  };

  const submitRename = () => {
    if (!editing) return;
    const next = editValue.trim();
    if (!next || next === editing) {
      setEditing(null);
      return;
    }
    renameMutation.mutate({ old: editing, new: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Shapes className="h-4 w-4 text-primary" />
          Catégories
        </CardTitle>
        <CardDescription>
          Organisez vos réalisations. Supprimer une catégorie ne supprime pas
          les œuvres : elles deviennent « sans catégorie ».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && (
          <p role="alert" className="text-destructive">
            Impossible de charger les catégories.
          </p>
        )}
        <form onSubmit={submitAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nouvelle catégorie…"
            maxLength={40}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="sr-only">Ajouter</span>
          </Button>
        </form>

        <ul className="space-y-2">
          {list.map((cat) => (
            <li
              key={cat}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
            >
              <CategoryIcon
                name={cat}
                className="h-4 w-4 shrink-0 text-primary"
              />
              {editing === cat ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    maxLength={40}
                    className="h-7 flex-1 text-sm"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Valider le renommage"
                    disabled={renameMutation.isPending}
                    onClick={submitRename}
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Annuler"
                    onClick={() => setEditing(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{cat}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Renommer ${cat}`}
                    onClick={() => {
                      setEditing(cat);
                      setEditValue(cat);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Supprimer ${cat}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(cat)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
