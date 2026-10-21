"use client";
import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, Globe } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { toClickableUrl, type Artwork } from "@/lib/types";
/** Carte d'une réalisation : capture en parallax, badge catégorie, lien vers le site. */
export function SiteCard({ site: a, index }: { site: Artwork; index: number }) {
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
      initial={false}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion
          ? undefined
          : { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
      }
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay: reduceMotion ? 0 : (index % 3) * 0.08,
      }}
      whileHover={reduceMotion ? undefined : { y: -5 }}
      className="group touch-manipulation overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5 hover:ring-1 hover:ring-primary/20"
    >
      {/* Capture d'écran dans une fenêtre de navigateur */}
      <div className="border-b border-border/70 bg-muted/60 p-2.5 pb-0">
        <div className="relative overflow-hidden rounded-t-md border border-border/60 border-b-0 bg-background shadow-sm">
          {/* Badge catégorie sur la capture */}
          {a.category && (
            <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground/90 backdrop-blur">
              <CategoryIcon
                name={a.category}
                className="h-3 w-3 text-primary"
              />
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
                <Image
                  src={a.photo}
                  alt={`Aperçu de la réalisation ${a.title}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  unoptimized={!a.photo.startsWith("/")}
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
        <h3 className="font-display text-lg leading-snug sm:text-xl">
          {a.title}
        </h3>
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
