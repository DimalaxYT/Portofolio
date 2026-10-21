"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortfolioView } from "./portfolio-view";
import { Dashboard } from "./dashboard";
import { PasswordDialog } from "./password-dialog";

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

/** Lit le hash initial de l'URL (#admin = route secrète du dashboard). */
function readHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash;
}

export default function PortfolioApp() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}

function Shell() {
  // La vue admin est dérivée du hash d'URL : #admin + session valide = dashboard
  const [hash, setHash] = useState<string>(readHash);
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
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const showAdmin = hash === "#admin" && authenticated === true;

  const enterAdmin = () => {
    window.history.replaceState(null, "", "#admin");
    setHash("#admin");
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
