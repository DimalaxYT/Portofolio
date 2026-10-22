"use client";

import { useCallback, useEffect, useState } from "react";

export type QualityTier = "high" | "medium" | "low";

export interface RenderBudget {
  dpr: number;
  particles: number;
  shards: number;
  pillars: number;
  skillNodes: number;
  terrainSegments: number;
  /** Bloom + vignette (post-traitement) uniquement sur le palier haut. */
  postprocessing: boolean;
  antialias: boolean;
  /** Reflets via carte d'environnement procédurale (PMREM). */
  environment: boolean;
}

const BUDGETS: Record<QualityTier, Omit<RenderBudget, "dpr">> = {
  high: {
    particles: 2600,
    shards: 46,
    pillars: 196,
    skillNodes: 12,
    terrainSegments: 56,
    postprocessing: true,
    antialias: true,
    environment: true,
  },
  medium: {
    particles: 1200,
    shards: 26,
    pillars: 121,
    skillNodes: 12,
    terrainSegments: 40,
    postprocessing: false,
    antialias: true,
    environment: true,
  },
  low: {
    particles: 420,
    shards: 12,
    pillars: 64,
    skillNodes: 12,
    terrainSegments: 28,
    postprocessing: false,
    antialias: false,
    environment: false,
  },
};

export function budgetFor(tier: QualityTier): RenderBudget {
  const dprCap = tier === "high" ? 2 : tier === "medium" ? 1.5 : 1;
  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(window.devicePixelRatio || 1, dprCap);
  return { dpr, ...BUDGETS[tier] };
}

/** Détection WebGL — l'expérience doit rester utilisable sans 3D. */
export function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return false;
    // Un contexte perdu immédiatement ne mérite pas d'essai de rendu.
    return !(gl instanceof WebGLRenderingContext && gl.isContextLost());
  } catch {
    return false;
  }
}

function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Palier initial estimé à partir des capacités réelles de l'appareil. */
export function detectTier(): QualityTier {
  if (typeof navigator === "undefined") return "medium";
  if (prefersReducedMotion()) return "low";

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const small = typeof window !== "undefined" && window.innerWidth < 820;
  const coarse = isCoarsePointer();

  let score = 0;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  if (memory && memory >= 8) score += 2;
  else if (memory && memory >= 4) score += 1;
  if (!coarse) score += 1;
  if (!small) score += 1;

  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export interface QualityState {
  webgl: boolean;
  tier: QualityTier;
  budget: RenderBudget;
  reducedMotion: boolean;
  /** Abaisse le palier si le rendu réel est trop lent. */
  downgrade: () => void;
}

/**
 * Qualité adaptative : estimation au montage, puis déclassement possible en
 * cours de route (mesure de FPS côté canvas). Jamais de rehaussement
 * automatique, pour éviter l'oscillation.
 */
export function useQuality(): QualityState {
  const [webgl, setWebgl] = useState(true);
  const [tier, setTier] = useState<QualityTier>("medium");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setWebgl(detectWebGL());
    setTier(detectTier());
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    motion.addEventListener("change", onChange);
    return () => motion.removeEventListener("change", onChange);
  }, []);

  const downgrade = useCallback(() => {
    setTier((current) =>
      current === "high" ? "medium" : current === "medium" ? "low" : current,
    );
  }, []);

  return {
    webgl,
    tier,
    budget: budgetFor(tier),
    reducedMotion,
    downgrade,
  };
}
