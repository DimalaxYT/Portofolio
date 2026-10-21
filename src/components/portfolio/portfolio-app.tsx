"use client";

import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PortfolioView } from "./portfolio-view";
import dynamic from "next/dynamic";
import { parseCategories } from "@/lib/types";
import type { Artwork, SiteSettings } from "@/lib/types";
import { PasswordDialog } from "./password-dialog";

const Dashboard = dynamic(
  () => import("./dashboard").then((m) => m.Dashboard),
  {
    loading: () => (
      <p className="p-8" role="status">
        Chargement de l’administration…
      </p>
    ),
  },
);

async function fetchSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

/** Lit le hash initial de l'URL (#admin = accès explicite au dashboard). */
function readHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash;
}

export default function PortfolioApp({
  initialArtworks,
  initialSettings,
}: {
  initialArtworks: Artwork[];
  initialSettings: SiteSettings;
}) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
    });
    client.setQueryData(["artworks"], initialArtworks);
    client.setQueryData(["settings"], initialSettings);
    client.setQueryData(
      ["categories"],
      parseCategories(initialSettings.categories),
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}

function Shell() {
  // La vue admin est dérivée du hash d'URL : #admin + session valide = dashboard
  const [hash, setHash] = useState<string>("");
  const [pwOpen, setPwOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: authenticated } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 60_000,
  });

  // Synchronise l'état si le hash change sans rechargement
  // (saisie de #admin dans la barre d'adresse, bouton retour du navigateur…)
  useEffect(() => {
    setHash(readHash());
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (hash === "#admin" && authenticated === false) setPwOpen(true);
  }, [hash, authenticated]);

  const showAdmin = hash === "#admin" && authenticated === true;

  const enterAdmin = () => {
    window.history.replaceState(null, "", "#admin");
    setHash("#admin");
    queryClient.setQueryData(["session"], true);
    queryClient.invalidateQueries({ queryKey: ["session"] });
  };

  const exitAdmin = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setHash("");
  };

  const handleSecretClick = () => {
    // Si déjà connecté, le logo ouvre directement le dashboard
    if (authenticated) {
      enterAdmin();
    } else {
      setPwOpen(true);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      {showAdmin ? (
        <Dashboard onExit={exitAdmin} />
      ) : (
        <PortfolioView onSecretClick={handleSecretClick} />
      )}
      <PasswordDialog
        open={pwOpen}
        onOpenChange={setPwOpen}
        onSuccess={enterAdmin}
      />
    </div>
  );
}
