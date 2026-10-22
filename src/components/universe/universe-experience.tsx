"use client";

/**
 * EXPÉRIENCE « UNIVERSE » — racine cliente.
 *
 * Architecture :
 *  - le défilement reste natif (molette, tactile, clavier, inertie iOS),
 *  - un unique canvas WebGL fixe derrière le DOM, traversé par la caméra,
 *  - le DOM porte tout le texte (SSR, a11y, SEO) et les interactions réelles,
 *  - un seul moteur d'animation côté 3D (useFrame) + CSS pour le DOM.
 */

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CONTACTS, PROFILE, SKILLS, UI } from "@/lib/universe/content";
import { LangProvider, useLang } from "@/lib/universe/i18n";
import { useQuality } from "@/lib/universe/quality";
import {
  buildProjectPlan,
  projectTitle,
  type UniverseProject,
} from "@/lib/universe/projects";
import {
  ScrollEngine,
  SCENE_KEYS,
  isTypingTarget,
} from "@/lib/universe/scroll";
import type { Artwork, SiteSettings } from "@/lib/types";
import { SceneShell } from "./ui/scene-shell";
import { Loader, SceneRail, StaticBackdrop, TopBar } from "./ui/chrome";
import { AboutContent, HeroContent } from "./ui/scene-content";
import { ProjectPanel } from "./ui/project-panel";
import { SkillsPanel } from "./ui/skills-panel";
import { ContactPanel } from "./ui/contact-panel";
import type { SceneKind } from "./universe-canvas";

const UniverseCanvas = dynamic(
  () => import("./universe-canvas").then((mod) => mod.UniverseCanvas),
  { ssr: false, loading: () => null },
);

const CLASSIC_PROJECTS_HREF = "/#projets";
/** Filet de sécurité : le voile ne reste jamais bloqué. */
const LOADER_TIMEOUT_MS = 2600;

interface SceneDef {
  kind: SceneKind;
  id: string;
  label: string;
  className: string;
}

function Experience({
  artworks,
  siteTitle,
}: {
  artworks: Artwork[];
  siteTitle: string;
}) {
  const { lang, toggle } = useLang();
  const quality = useQuality();

  /* ----- Contenu : projets réels du CMS d'abord, démos en complément ----- */
  const plan = useMemo(() => buildProjectPlan(artworks), [artworks]);
  const projects: UniverseProject[] = plan.projects;

  const scenes = useMemo<SceneDef[]>(() => {
    const projectScenes: SceneDef[] = projects.map((project, i) => ({
      kind: "project",
      id: `scene-project-${project.id}`,
      label: `${UI.projectSceneLabel[lang]} ${String(i + 1).padStart(2, "0")}`,
      className: "u-scene--project",
    }));
    return [
      {
        kind: "hero",
        id: "scene-hero",
        label: UI.scenes.hero[lang],
        className: "u-scene--hero",
      },
      {
        kind: "about",
        id: "scene-about",
        label: UI.scenes.about[lang],
        className: "u-scene--about",
      },
      ...projectScenes,
      {
        kind: "skills",
        id: "scene-skills",
        label: UI.scenes.skills[lang],
        className: "u-scene--skills",
      },
      {
        kind: "contact",
        id: "scene-contact",
        label: UI.scenes.contact[lang],
        className: "u-scene--contact",
      },
    ];
  }, [projects, lang]);

  /* Le snapping et le fond sombre sont portés par <html>, donc posés ici
     puis retirés au démontage : les autres routes restent intactes. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.universe = "";
    return () => {
      delete root.dataset.universe;
      root.style.removeProperty("--u-progress");
    };
  }, []);

  /* ----- Moteur de scroll ----- */
  const engine = useMemo(
    () => new ScrollEngine({ count: scenes.length, reduceMotion: false }),
    [scenes.length],
  );
  const active = useSyncExternalStore(engine.subscribe, engine.getActive, () => 0);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const registerRef = useCallback((index: number, element: HTMLElement | null) => {
    sectionRefs.current[index] = element;
  }, []);

  useEffect(() => {
    engine.setReduceMotion(quality.reducedMotion);
  }, [engine, quality.reducedMotion]);

  /* Mesure initiale + remise à jour (resize, changement de langue, images). */
  useEffect(() => {
    engine.setSections(sectionRefs.current.slice(0, scenes.length));
    engine.start();

    const observer = new ResizeObserver(() => engine.measure());
    sectionRefs.current
      .slice(0, scenes.length)
      .forEach((element) => element && observer.observe(element));
    window.addEventListener("resize", engine.measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", engine.measure);
      engine.stop();
    };
  }, [engine, scenes.length, lang]);

  /* Pointeur : simple écriture dans l'état partagé, aucun re-render. */
  useEffect(() => {
    if (quality.reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      engine.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };
    const onLeave = () => engine.setPointer(0, 0);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [engine, quality.reducedMotion]);

  /* Clavier : scène par scène, sans piéger le défilement natif. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!SCENE_KEYS.has(event.key)) return;
      if (isTypingTarget(event.target)) return;
      // Une modale ouverte garde la main sur le clavier.
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      if (event.key === "ArrowDown" || event.key === "PageDown") engine.next();
      else if (event.key === "ArrowUp" || event.key === "PageUp") engine.prev();
      else if (event.key === "Home") engine.scrollToScene(0);
      else engine.scrollToScene(scenes.length - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine, scenes.length]);

  /* ----- Rendu : pause quand l'onglet est masqué ----- */
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  useEffect(() => {
    const onVisibility = () =>
      setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ----- Voile de chargement : jamais long, jamais bloqué ----- */
  const [firstFrame, setFirstFrame] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [veilVisible, setVeilVisible] = useState(true);
  const finished = useRef(false);

  const finishLoading = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setLoaderDone(true);
    window.setTimeout(() => setVeilVisible(false), 700);
  }, []);

  useEffect(() => {
    if (!quality.webgl || quality.reducedMotion) {
      finishLoading();
      return;
    }
    const timeout = window.setTimeout(finishLoading, LOADER_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [quality.webgl, quality.reducedMotion, finishLoading]);

  useEffect(() => {
    if (firstFrame) finishLoading();
  }, [firstFrame, finishLoading]);

  /* ----- État partagé des scènes interactives ----- */
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const activeSkill = hoveredSkill ?? selectedSkill ?? SKILLS[0]?.id ?? null;

  const screenTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projects) map[project.id] = projectTitle(project, lang);
    return map;
  }, [projects, lang]);

  const projectSceneIndexes = useMemo(
    () =>
      scenes.reduce<number[]>(
        (acc, scene, index) => (scene.kind === "project" ? [...acc, index] : acc),
        [],
      ),
    [scenes],
  );

  const sceneKinds = useMemo(() => scenes.map((scene) => scene.kind), [scenes]);
  const motion = quality.reducedMotion ? 0 : 1;

  const restart = () => engine.scrollToScene(0);

  return (
    <div className="universe" data-lang={lang}>
      {/* Couche 3D : fixe, derrière le texte. */}
      <div className="universe__canvas" aria-hidden="true">
        {quality.webgl ? (
          <UniverseCanvas
            engine={engine}
            budget={quality.budget}
            motion={motion}
            frameloop={frameloop}
            active={active}
            scenes={sceneKinds}
            projects={projects}
            projectSceneIndexes={projectSceneIndexes}
            screenTitles={screenTitles}
            hoveredProject={hoveredProject}
            onProjectHover={setHoveredProject}
            skills={SKILLS}
            activeSkill={activeSkill}
            onSkillHover={setHoveredSkill}
            onFirstFrame={() => setFirstFrame(true)}
            onDowngrade={quality.downgrade}
          />
        ) : (
          <StaticBackdrop />
        )}
      </div>

      <TopBar
        name={PROFILE.name}
        lang={lang}
        onToggleLang={toggle}
        classicHref="/"
      />

      <SceneRail
        scenes={scenes.map((scene, index) => ({
          index,
          id: scene.id,
          label: scene.label,
        }))}
        active={active}
        onNavigate={(index) => engine.scrollToScene(index)}
        lang={lang}
      />

      {!quality.webgl && (
        <p className="universe__note" role="status">
          {UI.webglUnavailable[lang]}
        </p>
      )}

      <main className="universe__track" aria-label={siteTitle}>
        {scenes.map((scene, index) => (
          <SceneShell
            key={scene.id}
            id={scene.id}
            index={index}
            label={scene.label}
            className={scene.className}
            registerRef={registerRef}
          >
            {scene.kind === "hero" && <HeroContent lang={lang} />}
            {scene.kind === "about" && <AboutContent lang={lang} />}
            {scene.kind === "project" && (
              <ProjectPanel
                project={projects[projectSceneIndexes.indexOf(index)]}
                lang={lang}
                onEngage={() => setHoveredProject(index)}
                onDisengage={() =>
                  setHoveredProject((current) => (current === index ? null : current))
                }
              />
            )}
            {scene.kind === "skills" && (
              <SkillsPanel
                skills={SKILLS}
                lang={lang}
                activeId={activeSkill}
                onSelect={setSelectedSkill}
                onHover={setHoveredSkill}
                projectTitles={screenTitles}
              />
            )}
            {scene.kind === "contact" && (
              <ContactPanel
                contacts={CONTACTS}
                lang={lang}
                onRestart={restart}
                projectsHref={plan.overflow > 0 ? CLASSIC_PROJECTS_HREF : null}
              />
            )}
          </SceneShell>
        ))}
      </main>

      <Loader
        visible={veilVisible}
        done={loaderDone}
        onSkip={finishLoading}
        lang={lang}
      />
    </div>
  );
}

export default function UniverseExperience({
  initialArtworks,
  initialSettings,
}: {
  initialArtworks: Artwork[];
  initialSettings: SiteSettings;
}) {
  // Les réglages du CMS restent la source de vérité du titre de l'onglet.
  return (
    <LangProvider>
      <Experience
        artworks={initialArtworks}
        siteTitle={initialSettings.siteTitle}
      />
    </LangProvider>
  );
}
