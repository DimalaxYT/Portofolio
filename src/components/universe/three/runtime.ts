"use client";

import { createContext, useContext } from "react";
import type { ScrollEngine } from "@/lib/universe/scroll";
import type { RenderBudget } from "@/lib/universe/quality";

/** Distance entre deux scènes le long de l'axe de la caméra. */
export const SCENE_GAP = 26;

/** Position Z d'une scène sur le parcours. */
export const sceneZ = (index: number) => -index * SCENE_GAP;

export interface UniverseRuntime {
  engine: ScrollEngine;
  budget: RenderBudget;
  /** 0 = reduced-motion (aucune animation continue), 1 = normal. */
  motion: number;
  accent: string;
}

const RuntimeContext = createContext<UniverseRuntime | null>(null);

export const RuntimeProvider = RuntimeContext.Provider;

export function useRuntime(): UniverseRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("useRuntime : RuntimeProvider manquant");
  return runtime;
}

/** Progression locale d'une scène : −1 (avant) → 0 (active) → 1 (après). */
export function localProgress(runtime: UniverseRuntime, index: number): number {
  return runtime.engine.state.sceneFloat - index;
}

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

/** 1 au centre de la scène, 0 dès qu'elle est à une scène de distance. */
export function scenePresence(runtime: UniverseRuntime, index: number): number {
  return clamp(1 - Math.abs(localProgress(runtime, index)), 0, 1);
}
