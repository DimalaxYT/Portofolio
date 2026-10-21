"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-2xl">
        Portfolio temporairement indisponible
      </h1>
      <p className="my-6 text-muted-foreground">
        Impossible de charger les projets. Réessayez dans quelques instants.
      </p>
      <button className="rounded border px-4 py-2" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
