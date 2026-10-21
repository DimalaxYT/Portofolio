"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CategoryIcon } from "./category-icon";
import { LogoMark } from "./logo-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteCard } from "./site-card";
import type { Artwork } from "@/lib/types";
/** SECTION 1 · 2 · 3 : galerie filtrable + expertises + cartes */
export function GallerySection({
  list,
  filtered,
  categories,
  activeCat,
  onSelect,
  countFor,
  isLoading,
  isError,
}: {
  list: Artwork[];
  filtered: Artwork[];
  categories: string[];
  activeCat: string | null;
  onSelect: (cat: string | null) => void;
  countFor: (cat: string | null) => number;
  isLoading: boolean;
  isError: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <>
      {/* Expertises — les catégories du portfolio */}
      {categories.length > 0 && (
        <section
          id="expertises"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6"
        >
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
                Expertises
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl">
                Ce que je crée
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            {categories.map((cat, i) => {
              const isActive = activeCat === cat;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  aria-pressed={isActive}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.45,
                    delay: reduceMotion ? 0 : i * 0.06,
                  }}
                  onClick={() => onSelect(isActive ? null : cat)}
                  className={`group touch-manipulation rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 sm:p-5 ${
                    isActive ? "border-primary/60 ring-1 ring-primary/30" : ""
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:h-10 sm:w-10 ${
                      isActive ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    <CategoryIcon
                      name={cat}
                      className="h-4 w-4 sm:h-5 sm:w-5"
                    />
                  </span>
                  <p className="mt-3 truncate text-sm font-medium leading-tight sm:text-base">
                    {cat}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {countFor(cat)} réalisation{countFor(cat) > 1 ? "s" : ""}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Galerie filtrable */}
      <section
        id="projets"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6"
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Projets
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl">
              Réalisations récentes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Chargement…"
                : `${filtered.length} réalisation${filtered.length > 1 ? "s" : ""}${activeCat ? ` · ${activeCat}` : ""}`}
            </p>
          </div>
          <LogoMark className="hidden h-8 w-8 text-border sm:block" />
        </div>

        {/* Filtres par catégorie — range horizontale à snap sur mobile */}
        {!isLoading && list.length > 0 && (
          <div
            className="relative -mx-4 mb-8 sm:mx-0"
            role="group"
            aria-label="Filtrer par catégorie"
          >
            <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
              <FilterChip
                label="Toutes"
                count={countFor(null)}
                active={activeCat === null}
                onClick={() => onSelect(null)}
              />
              {categories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  icon={<CategoryIcon name={cat} className="h-3.5 w-3.5" />}
                  count={countFor(cat)}
                  active={activeCat === cat}
                  onClick={() => onSelect(cat)}
                />
              ))}
            </div>
            {/* Fondu d'indice de scroll (mobile uniquement) */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
            />
          </div>
        )}

        {isError ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Impossible de charger les projets pour le moment.
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/60 py-20 text-center">
            <LogoMark className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 font-display text-xl">
              Les projets arrivent bientôt
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Ce portfolio est prêt à accueillir vos réalisations. Revenez très
              vite pour découvrir les premières créations.
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((a, i) => (
                <SiteCard key={a.id} site={a} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!isLoading && list.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed bg-card/60 py-16 text-center">
            <p className="font-display text-lg">Aucune réalisation ici</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Aucun projet dans cette catégorie pour l&apos;instant —
              sélectionnez « Toutes » pour voir l&apos;ensemble du portfolio.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

/** Puce de filtre avec fond animé glissant (layoutId partagé). */
function FilterChip({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative inline-flex min-h-11 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm transition-colors snap-start shrink-0 sm:min-h-9 sm:py-1.5 ${
        active
          ? "border-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span
          layoutId="active-chip"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="absolute inset-0 rounded-full bg-primary"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {icon}
        {label}
        <span
          className={`rounded-full px-1.5 text-[11px] leading-4 ${
            active ? "bg-primary-foreground/20" : "bg-muted"
          }`}
        >
          {count}
        </span>
      </span>
    </button>
  );
}
