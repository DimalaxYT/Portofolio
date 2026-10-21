"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpRight, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoMark } from "./logo-mark";
import { ThemeToggle } from "./theme-toggle";
import { CategoryIcon } from "./categories-panel";
import {
  DEFAULT_SETTINGS,
  parseCategories,
  toClickableUrl,
  type Artwork,
  type SiteSettings,
} from "@/lib/types";

async function fetchArtworks(): Promise<Artwork[]> {
  const res = await fetch("/api/artworks");
  if (!res.ok) throw new Error("Erreur de chargement");
  return res.json();
}

async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) return DEFAULT_SETTINGS;
  return res.json();
}

/** Coupe le dernier mot du titre pour l'afficher en dégradé cuivre. */
function splitLastWord(text: string): [string, string] {
  const idx = text.lastIndexOf(" ");
  if (idx === -1) return [text, ""];
  return [text.slice(0, idx), text.slice(idx + 1)];
}

/** Lien de navigation avec soulignement animé + état actif (scrollspy). */
function NavLink({
  href,
  label,
  active,
  className = "",
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      className={`relative inline-flex min-h-11 items-center px-2 transition-colors after:absolute after:bottom-1.5 after:left-2 after:h-px after:w-[calc(100%-1rem)] after:origin-left after:bg-primary after:transition-transform after:duration-300 hover:text-foreground hover:after:scale-x-100 ${
        active ? "text-foreground after:scale-x-100" : "after:scale-x-0"
      } ${className}`}
    >
      {label}
    </a>
  );
}

/** Compteur animé, déclenché quand il entre dans le viewport. */
function Counter({ to, suffix }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix ?? ""}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, suffix]);

  return <span ref={ref}>0{suffix ?? ""}</span>;
}

export function PortfolioView({ onSecretClick }: { onSecretClick: () => void }) {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
  const {
    data: artworks,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["artworks"], queryFn: fetchArtworks });

  const s = settings ?? DEFAULT_SETTINGS;
  const list = artworks ?? [];
  const year = new Date().getFullYear();
  const categories = useMemo(() => parseCategories(s.categories), [s.categories]);

  // Filtre actif : null = toutes les catégories
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const filtered = activeCat
    ? list.filter((a) => a.category === activeCat)
    : list;
  const countFor = (cat: string | null) =>
    cat === null ? list.length : list.filter((a) => a.category === cat).length;

  const selectCategory = (cat: string | null) => {
    setActiveCat(cat);
    document
      .getElementById("projets")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ----- Parallax du héros + barre de progression globale ----- */
  const heroRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress: pageProgress, scrollY } = useScroll();

  /* Bouton flottant « retour en haut » après un certain scroll */
  const [showTop, setShowTop] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setShowTop(v > 640));
  const backToTop = () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  const progressBar = useSpring(pageProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.3,
  });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.35,
  });

  const orbAY = useTransform(progress, [0, 1], [0, 200]);
  const orbBY = useTransform(progress, [0, 1], [0, -150]);
  const orbBX = useTransform(progress, [0, 1], [0, 90]);
  const gridY = useTransform(progress, [0, 1], [0, 60]);
  const contentY = useTransform(progress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(progress, [0, 0.85], [1, 0]);
  const glyphAY = useTransform(progress, [0, 1], [0, -90]);
  const glyphBY = useTransform(progress, [0, 1], [0, 130]);
  const glyphCY = useTransform(progress, [0, 1], [0, -55]);
  const glyphRotate = useTransform(progress, [0, 1], [0, 14]);

  const py = (v: MotionValue<number>) => (reduceMotion ? undefined : v);

  /* ----- Scrollspy : la section visible souligne son lien dans la nav ----- */
  const [activeSection, setActiveSection] = useState<string | null>(null);
  useEffect(() => {
    const els = ["expertises", "projets", "contact"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      // Bande fine au milieu du viewport : la section qui la traverse est « active »
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [categories.length]);

  const [titleHead, titleTail] = splitLastWord(s.heroTitle);

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />

      {/* En-tête + barre de progression de lecture */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <a href="#" className="group flex min-w-0 items-center gap-2.5">
            <span className="relative shrink-0">
              <LogoMark className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-6" />
            </span>
            <span className="truncate font-display text-base tracking-wide sm:text-lg">
              {s.siteTitle}
            </span>
          </a>
          <nav className="flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground sm:gap-2">
            <NavLink
              href="#projets"
              label="Projets"
              active={activeSection === "projets"}
            />
            <NavLink
              href="#expertises"
              label="Expertises"
              active={activeSection === "expertises"}
            />
            <NavLink
              href="#contact"
              label="Contact"
              active={activeSection === "contact"}
              className="max-sm:hidden"
            />
            <ThemeToggle />
          </nav>
        </div>
        <motion.span
          aria-hidden="true"
          style={{ scaleX: reduceMotion ? 0 : progressBar }}
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-primary via-primary/70 to-primary/10"
        />
      </header>

      <main className="flex-1">
        {/* Héros — aurores animées + calques parallax */}
        <section ref={heroRef} className="relative overflow-hidden">
          {/* Calque 1 : halo principal (réduit sur mobile pour la fluidité) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2"
          >
            <motion.div
              style={{ y: py(orbAY) }}
              className="h-[320px] w-[520px] rounded-full bg-primary/10 blur-3xl sm:h-[480px] sm:w-[720px]"
            >
              <div className="aurora h-full w-full rounded-full bg-primary/10 blur-3xl" />
            </motion.div>
          </div>
          {/* Calque 2 : halo secondaire */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-24"
          >
            <motion.div
              style={{ y: py(orbBY), x: py(orbBX) }}
              className="h-44 w-44 rounded-full bg-primary/10 blur-3xl sm:h-72 sm:w-72"
            >
              <div className="aurora-slow h-full w-full rounded-full bg-accent blur-3xl" />
            </motion.div>
          </div>
          {/* Calque 3 : grille technique */}
          <motion.div
            aria-hidden="true"
            style={{ y: py(gridY) }}
            className="hero-grid pointer-events-none absolute inset-x-0 -top-10 bottom-0"
          />
          {/* Calque 4 : glyphes de code flottants */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden sm:block"
          >
            <motion.span
              style={{ y: py(glyphAY), rotate: py(glyphRotate) }}
              className="float-slow absolute left-[8%] top-[22%] font-mono text-sm text-muted-foreground/35"
            >
              {"</>"}
            </motion.span>
            <motion.span
              style={{ y: py(glyphBY) }}
              className="absolute right-[10%] top-[58%] font-mono text-xs text-muted-foreground/30"
            >
              {"{ … }"}
            </motion.span>
            <motion.span
              style={{ y: py(glyphCY) }}
              className="absolute left-[16%] top-[70%] font-mono text-xs text-muted-foreground/30"
            >
              {"// portfolio"}
            </motion.span>
            <motion.span
              style={{ y: py(glyphAY), rotate: py(glyphRotate) }}
              className="absolute right-[20%] top-[18%] font-mono text-xs text-muted-foreground/25"
            >
              {"( ) => web"}
            </motion.span>
          </div>

          {/* Contenu du héros */}
          <motion.div
            style={{ y: py(contentY), opacity: py(contentOpacity) }}
            className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-32"
          >
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-primary"
            >
              <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
              Portfolio
              <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.1rem,8.2vw,3.75rem)] leading-[1.1]"
            >
              {titleHead}{" "}
              <span className="text-gradient italic">{titleTail}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              {s.heroSubtitle}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="w-full rounded-full px-8 touch-manipulation sm:w-auto"
              >
                <a href="#projets">
                  Découvrir mes projets
                  <ArrowDown className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-full px-8 touch-manipulation sm:w-auto"
              >
                <a href="#expertises">Voir mes expertises</a>
              </Button>
            </motion.div>

            {/* Statistiques animées */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mx-auto mt-12 grid max-w-lg grid-cols-3 divide-x divide-border/70 sm:mt-14"
            >
              {isLoading ? (
                <>
                  <Skeleton className="mx-auto h-12 w-16" />
                  <Skeleton className="mx-auto h-12 w-16" />
                  <Skeleton className="mx-auto h-12 w-16" />
                </>
              ) : (
                <>
                  <div className="px-1 sm:px-2">
                    <p className="font-display text-2xl text-primary sm:text-4xl">
                      <Counter to={list.length} />
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Réalisations
                    </p>
                  </div>
                  <div className="px-1 sm:px-2">
                    <p className="font-display text-2xl text-primary sm:text-4xl">
                      <Counter to={categories.length} />
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Domaines
                    </p>
                  </div>
                  <div className="px-1 sm:px-2">
                    <p className="font-display text-2xl text-primary sm:text-4xl">
                      <Counter to={100} suffix="%" />
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Passion
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Indicateur de scroll */}
          <motion.div
            style={{ opacity: py(contentOpacity) }}
            className="relative mx-auto flex justify-center pb-8"
            aria-hidden="true"
          >
            <span className="float-slow flex h-10 w-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground">
              <ArrowDown className="h-4 w-4" />
            </span>
          </motion.div>
        </section>

        <GallerySection
          list={list}
          filtered={filtered}
          categories={categories}
          activeCat={activeCat}
          onSelect={selectCategory}
          countFor={countFor}
          isLoading={isLoading}
          isError={isError}
        />
      </main>

      <PortfolioFooter
        s={s}
        year={year}
        onSecretClick={onSecretClick}
        reduceMotion={reduceMotion}
      />

      {/* Bouton flottant retour en haut (apparaît après 640px de scroll) */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            onClick={backToTop}
            aria-label="Retour en haut de page"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.85 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.85 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border bg-card/90 text-muted-foreground shadow-lg shadow-black/10 backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

/** SECTION 1 · 2 · 3 : galerie filtrable + expertises + cartes */
function GallerySection({
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
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  onClick={() => onSelect(isActive ? null : cat)}
                  className={`group touch-manipulation rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 sm:p-5 ${
                    isActive
                      ? "border-primary/60 ring-1 ring-primary/30"
                      : ""
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:h-10 sm:w-10 ${
                      isActive ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    <CategoryIcon name={cat} className="h-4 w-4 sm:h-5 sm:w-5" />
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
          <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

/** Carte d'une réalisation : capture en parallax, badge catégorie, lien vers le site. */
function SiteCard({ site: a, index }: { site: Artwork; index: number }) {
  const href = toClickableUrl(a.link) ?? toClickableUrl(a.url);
  const reduceMotion = useReducedMotion();

  /* Parallax interne : la capture glisse doucement dans son cadre */
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      whileHover={reduceMotion ? undefined : { y: -5 }}
      className="group touch-manipulation overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5 hover:ring-1 hover:ring-primary/20"
    >
      {/* Capture d'écran dans une fenêtre de navigateur */}
      <div className="border-b border-border/70 bg-muted/60 p-2.5 pb-0">
        <div className="relative overflow-hidden rounded-t-md border border-border/60 border-b-0 bg-background shadow-sm">
          {/* Badge catégorie sur la capture */}
          {a.category && (
            <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground/90 backdrop-blur">
              <CategoryIcon name={a.category} className="h-3 w-3 text-primary" />
              {a.category}
            </span>
          )}
          {/* Barre de navigateur stylisée */}
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/80 px-3 py-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-foreground/20" />
              <span className="h-2 w-2 rounded-full bg-foreground/20" />
              <span className="h-2 w-2 rounded-full bg-foreground/20" />
            </div>
            <div className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-sm bg-background px-2.5 py-1">
              <Globe className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="truncate text-[11px] leading-none text-muted-foreground">
                {a.url ?? a.title}
              </span>
            </div>
          </div>
          {/* Visuel du site — couche parallax 18 % plus haute que le cadre */}
          <div
            ref={mediaRef}
            className="relative aspect-[4/3] overflow-hidden bg-background"
          >
            {a.photo ? (
              <motion.div
                style={{ y: reduceMotion ? undefined : imgY }}
                className="absolute inset-x-0 -inset-y-[9%]"
              >
                <img
                  src={a.photo}
                  alt={`Aperçu de la réalisation ${a.title}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </motion.div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-muted">
                <span className="font-display text-6xl text-foreground/15">
                  {a.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="font-display text-lg leading-snug sm:text-xl">{a.title}</h3>
        {a.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {a.description}
          </p>
        )}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-11 touch-manipulation items-center justify-between gap-2 rounded-md border-t border-border/60 pb-2 pt-3.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <span>Visiter le site</span>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        )}
      </div>
    </motion.article>
  );
}

/** Pied de page enrichi — le logo discret reste le bouton secret vers le dashboard. */
function PortfolioFooter({
  s,
  year,
  onSecretClick,
  reduceMotion,
}: {
  s: SiteSettings;
  year: number;
  onSecretClick: () => void;
  reduceMotion: boolean | null;
}) {
  const backToTop = () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  return (
    <footer
      id="contact"
      className="mt-auto border-t border-border/60 bg-card/50"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Zone haute : brand + navigation */}
        <div className="grid gap-8 py-10 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-5 w-5 text-primary" />
              <span className="font-display text-lg">{s.siteTitle}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {s.heroSubtitle}
            </p>
          </div>
          <nav
            aria-label="Navigation du pied de page"
            className="flex flex-col items-start gap-1 text-sm text-muted-foreground sm:items-end sm:gap-2.5"
          >
            <p className="mb-1 font-display text-base text-foreground">Navigation</p>
            <a
              href="#projets"
              className="py-1 transition-colors hover:text-primary sm:py-0"
            >
              Projets
            </a>
            <a
              href="#expertises"
              className="py-1 transition-colors hover:text-primary sm:py-0"
            >
              Expertises
            </a>
            <button
              type="button"
              onClick={backToTop}
              className="inline-flex touch-manipulation items-center gap-1.5 py-1 transition-colors hover:text-primary sm:py-0"
            >
              Haut de page
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>

        {/* Barre basse : logo secret + copyright (safe-area iOS incluse) */}
        <div className="flex flex-col items-center gap-4 border-t border-border/60 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
          <button
            type="button"
            onClick={onSecretClick}
            aria-label="Espace administrateur"
            className="cursor-pointer p-2 text-foreground/30 transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
          >
            <LogoMark className="h-6 w-6" />
          </button>
          <p className="text-center text-xs text-muted-foreground">
            © {year} {s.siteTitle} — {s.footerText}
          </p>
        </div>
      </div>
    </footer>
  );
}
