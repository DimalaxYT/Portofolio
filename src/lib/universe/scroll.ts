/**
 * MOTEUR DE SCROLL DE L'EXPÉRIENCE « UNIVERSE »
 * =============================================
 * Le défilement reste **natif** (molette, tactile, inertie iOS, accessibilité) :
 * aucune bibliothèque de scroll ne prend le contrôle du document. Le snapping
 * est confié au CSS (`scroll-snap-type: y proximity`), donc jamais bloquant.
 *
 * Une unique boucle `requestAnimationFrame` lit `window.scrollY` et :
 *  - publie `progress`, `sceneFloat` et `active` (lus par le rendu 3D),
 *  - écrit directement `--scene-reveal` / `--scene-d` sur chaque section
 *    (aucun re-render React par frame),
 *  - met à jour la barre de progression.
 *
 * React n'est notifié que lorsque l'index de scène active change.
 */

export interface UniverseScrollState {
  /** 0 → 1 sur tout le document. */
  progress: number;
  /** Index de scène en virgule flottante (0 = première scène). */
  sceneFloat: number;
  /** Index de scène actif (arrondi). */
  active: number;
  /** Pointeur normalisé (-1 → 1). */
  px: number;
  py: number;
  hasPointer: boolean;
  /** 0 → 1 : rapprochement caméra demandé par une scène interactive. */
  focus: number;
}

export type SceneListener = (active: number) => void;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

export class ScrollEngine {
  readonly state: UniverseScrollState = {
    progress: 0,
    sceneFloat: 0,
    active: 0,
    px: 0,
    py: 0,
    hasPointer: false,
    focus: 0,
  };


  private sections: HTMLElement[] = [];
  private boxes: { top: number; height: number }[] = [];
  private doc = 1;
  private vh = 1;
  private raf = 0;
  private running = false;
  private listeners = new Set<SceneListener>();
  private reduceMotion: boolean;
  private count: number;

  constructor(options: { count: number; reduceMotion: boolean }) {
    this.count = Math.max(1, options.count);
    this.reduceMotion = options.reduceMotion;
  }

  setReduceMotion(value: boolean) {
    this.reduceMotion = value;
    if (value) this.frame();
  }

  /** Enregistre les sections DOM (dans l'ordre du document). */
  setSections(sections: (HTMLElement | null)[]) {
    this.sections = sections.filter((el): el is HTMLElement => el !== null);
    this.measure();
  }

  /**
   * Recalcule les offsets (resize, contenu chargé, changement de langue).
   * Propriété-flèche : peut être passée telle quelle à addEventListener sans
   * perdre `this`.
   */
  measure = () => {
    const y = typeof window === "undefined" ? 0 : window.scrollY;
    this.boxes = this.sections.map((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top + y, height: Math.max(1, rect.height) };
    });
    this.vh = Math.max(1, window.innerHeight);
    this.doc = Math.max(
      1,
      document.documentElement.scrollHeight - this.vh,
    );
    if (!this.running) this.frame();
  }

  /** Propriété-flèche : peut être passée telle quelle à useSyncExternalStore. */
  subscribe = (listener: SceneListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getActive = (): number => this.state.active;

  get sceneCount(): number {
    return this.count;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.measure();
    const loop = () => {
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Une image de calcul — exécutable à la demande (test, reduced-motion). */
  frame() {
    const y = window.scrollY;
    const vh = this.vh;
    const s = this.state;

    s.progress = clamp01(y / this.doc);

    /* Position de scène : milieu du viewport projeté dans les sections. */
    const mid = y + vh / 2;
    const boxes = this.boxes;
    let index = 0;
    let local = 0;
    if (boxes.length > 0) {
      for (let i = 0; i < boxes.length; i++) {
        if (mid >= boxes[i].top) {
          index = i;
          local = clamp((mid - boxes[i].top) / boxes[i].height, 0, 1);
        }
      }
      s.sceneFloat = index + local;
    } else {
      s.sceneFloat = clamp01(s.progress) * (this.count - 1);
    }

    const active = Math.round(s.sceneFloat);
    if (active !== s.active) {
      s.active = active;
      this.listeners.forEach((listener) => listener(active));
    }

    /* Révélation par section : écriture DOM directe, sans React. */
    const reduce = this.reduceMotion;
    for (let i = 0; i < boxes.length; i++) {
      const el = this.sections[i];
      if (!el) continue;
      const box = boxes[i];
      // Hors champ : on ne touche pas au style (économie de travail).
      if (box.top > y + vh * 2 || box.top + box.height < y - vh) continue;
      const center = box.top + box.height / 2;
      const d = (mid - center) / vh;
      if (reduce) {
        el.style.setProperty("--scene-reveal", "1");
        el.style.setProperty("--scene-d", "0");
      } else {
        const reveal = clamp01(1 - Math.abs(d) * 1.75);
        el.style.setProperty("--scene-reveal", reveal.toFixed(4));
        el.style.setProperty("--scene-d", d.toFixed(4));
      }
    }

    /* Progression exposée en variable CSS : la barre d'entête et le rail la
       consomment sans provoquer de re-render React. */
    document.documentElement.style.setProperty(
      "--u-progress",
      s.progress.toFixed(4),
    );
  }

  /** Défilement direct vers une scène (rail de navigation, clavier). */
  scrollToScene(index: number, smooth = true) {
    const target = clamp(index, 0, this.count - 1);
    const box = this.boxes[target];
    const top = box ? box.top : target * this.vh;
    window.scrollTo({
      top,
      behavior: smooth && !this.reduceMotion ? "smooth" : "auto",
    });
  }

  next() {
    this.scrollToScene(this.state.active + 1);
  }

  prev() {
    this.scrollToScene(this.state.active - 1);
  }

  /** Rapprochement caméra (interaction sur une scène projet). */
  setFocus(value: number) {
    this.state.focus = clamp01(value);
  }

  setPointer(x: number, y: number) {
    this.state.px = clamp(x, -1, 1);
    this.state.py = clamp(y, -1, 1);
    this.state.hasPointer = true;
  }
}

/** Clavier pris en charge pour la navigation verticale de scène en scène. */
export const SCENE_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
]);

/** Vrai si la cible de l'événement attend les touches fléchées (champs…). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
