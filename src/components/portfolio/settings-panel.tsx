"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/types";
import { CategoriesPanel } from "./categories-panel";
import { BotPanel } from "./bot-panel";

async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) return DEFAULT_SETTINGS;
  return res.json();
}

export function SettingsPanel() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SiteContentForm settings={settings ?? DEFAULT_SETTINGS} />
      <CategoriesPanel />
      <PasswordForm />
      <BotPanel />
    </div>
  );
}

function SiteContentForm({ settings }: { settings: SiteSettings }) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Synchronise si les réglages arrivent après le montage
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        toast({
          title: "Site mis à jour",
          description: "Les changements sont visibles sur le site public.",
        });
      } else {
        toast({
          title: "Erreur",
          description: "L'enregistrement a échoué.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Connexion impossible.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Contenu du site</CardTitle>
          <CardDescription>
            Personnalisez les textes affichés sur la page publique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-title">Nom du site</Label>
            <Input
              id="st-title"
              value={form.siteTitle}
              onChange={(e) => setForm({ ...form, siteTitle: e.target.value })}
              placeholder="Ex. : Portfolio d'Alexandre"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-hero">Titre principal</Label>
            <Input
              id="st-hero"
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              placeholder="Ex. : Sites web & applications"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-sub">Sous-titre</Label>
            <Textarea
              id="st-sub"
              value={form.heroSubtitle}
              onChange={(e) =>
                setForm({ ...form, heroSubtitle: e.target.value })
              }
              placeholder="Une phrase qui présente votre univers…"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-footer">Texte du pied de page</Label>
            <Input
              id="st-footer"
              value={form.footerText}
              onChange={(e) => setForm({ ...form, footerText: e.target.value })}
              placeholder="Ex. : Tous droits réservés"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (next !== confirm) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        toast({
          title: "Mot de passe modifié",
          description: "Utilisez-le à votre prochaine connexion.",
        });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Le changement a échoué.");
      }
    } catch {
      setError("Connexion impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Sécurité</CardTitle>
          <CardDescription>
            Le mot de passe protège l&apos;accès au dashboard via le logo en bas
            de page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-current">Mot de passe actuel</Label>
            <Input
              id="pw-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-next">Nouveau mot de passe</Label>
            <Input
              id="pw-next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-confirm">Confirmer le nouveau mot de passe</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Changer le mot de passe
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
