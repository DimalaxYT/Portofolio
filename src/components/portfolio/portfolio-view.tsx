"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoMark } from "./logo-mark";
import { ThemeToggle } from "./theme-toggle";
import { GallerySection } from "./gallery-section";
import { PortfolioFooter } from "./portfolio-footer";
import { NavLink, Counter } from "./portfolio-navigation";
import { DEFAULT_SETTINGS, parseCategories } from "@/lib/types";

import { fetchArtworks, fetchSettings } from "@/lib/api-client";

/** Coupe le dernier mot du titre pour l'afficher en dégradé cuivre. */
function splitLastWord(text: string): [string, string] {
  const idx = text.lastIndexOf(" ");
  if (idx === -1) return [text, ""];
  return [text.slice(0, idx), text.slice(idx + 1)];
}

export function PortfolioView({
  onSecretClick,
}: {
  onSecretClick: () => void;
}) {
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
  const categories = useMemo(
    () => parseCategories(s.categories),
    [s.categories],
  );

  // Filtre actif : null = toutes les catégories
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const filtered = activeCat
    ? list.filter((a) => a.category === activeCat)
    : list;
  const countFor = (cat: string | null) =>
    cat === null ? list.length : list.filter((a) => a.category === cat).length;

  const selectCategory = (cat: string | null) => {
    setActiveCat(cat);
    document.getElementById("projets")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
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
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 },
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
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-primary"
            >
              <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
              Portfolio
              <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
            </motion.p>
            <motion.h1
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.1rem,8.2vw,3.75rem)] leading-[1.1]"
            >
              {titleHead}{" "}
              <span className="text-gradient italic">{titleTail}</span>
            </motion.h1>
            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              {s.heroSubtitle}
            </motion.p>
            <motion.div
              initial={false}
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
              initial={false}
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
