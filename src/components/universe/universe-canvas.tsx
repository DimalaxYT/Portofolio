"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { PerformanceMonitor } from "@react-three/drei/core/PerformanceMonitor";
import * as THREE from "three";
import type { Skill } from "@/lib/universe/content";
import { PALETTE } from "@/lib/universe/content";
import type { RenderBudget } from "@/lib/universe/quality";
import type { ScrollEngine } from "@/lib/universe/scroll";
import type { UniverseProject } from "@/lib/universe/projects";
import { createStudioEnvironment } from "./three/environment";
import { InfiniteGrid, StageFloor } from "./three/infinite-grid";
import { ParticleField } from "./three/particles";
import { RuntimeProvider, SCENE_GAP, type UniverseRuntime } from "./three/runtime";
import { HeroWorld } from "./scenes/hero-world";
import { AboutWorld } from "./scenes/about-world";
import { ProjectWorld } from "./scenes/project-world";
import { SkillsWorld } from "./scenes/skills-world";
import { ContactWorld } from "./scenes/contact-world";

/**
 * CANVAS DE L'EXPÉRIENCE
 * Un seul contexte WebGL pour tout le parcours : les mondes sont placés le
 * long de l'axe Z et la caméra les traverse. C'est ce qui permet de garder
 * 60 FPS plutôt que de payer un canvas par section.
 */

export type SceneKind = "hero" | "about" | "project" | "skills" | "contact";

export interface UniverseCanvasProps {
  engine: ScrollEngine;
  budget: RenderBudget;
  motion: number;
  /** "never" quand l'onglet est masqué : plus aucune frame n'est produite. */
  frameloop: "always" | "never";
  active: number;
  scenes: SceneKind[];
  /** Scènes « project », dans l'ordre du parcours. */
  projects: UniverseProject[];
  projectSceneIndexes: number[];
  screenTitles: Record<string, string>;
  hoveredProject: number | null;
  onProjectHover: (sceneIndex: number | null) => void;
  skills: Skill[];
  activeSkill: string | null;
  onSkillHover: (id: string | null) => void;
  onFirstFrame: () => void;
  onDowngrade: () => void;
}

const ATMOSPHERE = PALETTE.atmosphere;

/* ------------------------------------------------------------------ */
/* Rigs                                                                */
/* ------------------------------------------------------------------ */

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  void main() {
    float h = vDir.y * 0.5 + 0.5;
    vec3 color = mix(uBottom, uTop, smoothstep(0.02, 0.9, h));
    // Halo chaud à l'horizon + légère remontée d'accent au zénith.
    float band = pow(max(0.0, 1.0 - abs(vDir.y * 1.35)), 5.0);
    color += uGlow * band * 0.55;
    color += uGlow * pow(max(0.0, vDir.y), 7.0) * 0.18;
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Dôme de fond : suit la caméra, teinte interpolée entre les scènes. */
function SkyDome({ runtime }: { runtime: UniverseRuntime }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(ATMOSPHERE[0].bg) },
          uBottom: { value: new THREE.Color("#04060a") },
          uGlow: { value: new THREE.Color(runtime.accent).multiplyScalar(0.5) },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
      }),
    [runtime.accent],
  );

  const topColor = useMemo(() => new THREE.Color(), []);
  const fromColor = useMemo(() => new THREE.Color(), []);
  const toColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    materialRef.current = material;
    return () => material.dispose();
  }, [material]);

  useFrame(({ camera }) => {
    if (meshRef.current) meshRef.current.position.copy(camera.position);
    const mat = materialRef.current;
    if (!mat) return;

    const f = runtime.engine.state.sceneFloat;
    const i = Math.min(ATMOSPHERE.length - 1, Math.floor(f));
    const j = Math.min(ATMOSPHERE.length - 1, i + 1);
    const k = THREE.MathUtils.clamp(f - i, 0, 1);
    topColor.copy(fromColor.set(ATMOSPHERE[i].bg)).lerp(toColor.set(ATMOSPHERE[j].bg), k);
    mat.uniforms.uTop.value.copy(topColor);
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[70, 24, 16]} />
    </mesh>
  );
}

/** Brouillard + déplacement de caméra pilotés par le scroll. */
function CameraRig({ runtime }: { runtime: UniverseRuntime }) {
  const { camera, scene, size } = useThree();
  const fog = useMemo(() => new THREE.FogExp2(ATMOSPHERE[0].fog, 0.02), []);
  const fromColor = useMemo(() => new THREE.Color(), []);
  const toColor = useMemo(() => new THREE.Color(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const { engine } = runtime;
    const f = engine.state.sceneFloat;
    const focus = engine.state.focus;

    // Atmosphère interpolée.
    const i = Math.min(ATMOSPHERE.length - 1, Math.floor(f));
    const j = Math.min(ATMOSPHERE.length - 1, i + 1);
    const k = THREE.MathUtils.clamp(f - i, 0, 1);
    fromColor.set(ATMOSPHERE[i].fog);
    toColor.set(ATMOSPHERE[j].fog);
    fog.color.copy(fromColor).lerp(toColor, k);
    fog.density = THREE.MathUtils.lerp(
      ATMOSPHERE[i].density,
      ATMOSPHERE[j].density,
      k,
    );

    // Caméra : avance sur le parcours + parallaxe + rapprochement à l'interaction.
    // Recul selon le format : en portrait le champ visible est étroit.
    const aspect = size.width / Math.max(1, size.height);
    const baseDistance = aspect < 1 ? 13.4 : aspect < 1.4 ? 11.2 : 9.8;
    const targetZ = -f * SCENE_GAP + baseDistance + focus * 2.6;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4.2, dt);
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      engine.state.px * 0.9,
      2.6,
      dt,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      0.45 + engine.state.py * 0.6,
      2.6,
      dt,
    );

    lookAt.set(
      engine.state.px * 0.5,
      0.32 + engine.state.py * 0.32,
      camera.position.z - SCENE_GAP * 0.72,
    );
    camera.lookAt(lookAt);

    const persp = camera as THREE.PerspectiveCamera;
    const targetFov = 42 - focus * 4;
    if (Math.abs(persp.fov - targetFov) > 0.01) {
      persp.fov = THREE.MathUtils.damp(persp.fov, targetFov, 3, dt);
      persp.updateProjectionMatrix();
    }
  });

  return null;
}

/** Reflets procéduraux (PMREM local, aucune requête réseau). */
function EnvironmentRig({
  accent,
  enabled,
}: {
  accent: string;
  enabled: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!enabled) return;
    const environment = createStudioEnvironment(gl, accent);
    scene.environment = environment.texture;
    // Au-dessus de 1 : le studio HDR doit dominer le rendu des métaux.
    scene.environmentIntensity = 1.6;
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene, accent, enabled]);

  return null;
}

/** Signale la première image rendue (fin du voile de chargement). */
function FirstFrameSignal({ onFirstFrame }: { onFirstFrame: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onFirstFrame();
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Mondes                                                              */
/* ------------------------------------------------------------------ */

function Worlds(props: UniverseCanvasProps) {
  const { scenes, active, projects, projectSceneIndexes } = props;

  return (
    <>
      {scenes.map((kind, index) => {
        // Chargement paresseux : seuls les mondes voisins sont montés.
        if (Math.abs(index - active) > 1) return null;

        if (kind === "hero") return <HeroWorld key="hero" index={index} />;
        if (kind === "about") return <AboutWorld key="about" index={index} />;
        if (kind === "skills")
          return (
            <SkillsWorld
              key="skills"
              index={index}
              skills={props.skills}
              activeId={props.activeSkill}
              onHover={props.onSkillHover}
            />
          );
        if (kind === "contact") return <ContactWorld key="contact" index={index} />;

        const slot = projectSceneIndexes.indexOf(index);
        const project = projects[slot];
        if (!project) return null;
        return (
          <ProjectWorld
            key={project.id}
            index={index}
            project={project}
            screenTitle={props.screenTitles[project.id] ?? project.id}
            hovered={props.hoveredProject === index}
            onHoverChange={(hovered) =>
              props.onProjectHover(hovered ? index : null)
            }
          />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

export function UniverseCanvas(props: UniverseCanvasProps) {
  const { engine, budget, motion, frameloop, scenes, onFirstFrame, onDowngrade } =
    props;

  const runtime = useMemo<UniverseRuntime>(
    () => ({ engine, budget, motion, accent: PALETTE.accent }),
    [engine, budget, motion],
  );

  const pathLength = (scenes.length - 1) * SCENE_GAP;

  return (
    <Canvas
      dpr={budget.dpr}
      frameloop={frameloop}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 120 } }}
      gl={{
        antialias: budget.antialias,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      camera={{ position: [0, 0.2, 9.4], fov: 42, near: 0.1, far: 240 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color(ATMOSPHERE[0].bg), 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        // Exposition haute : indispensable pour que le métal reflète le studio.
        gl.toneMappingExposure = 1.42;
        scene.matrixWorldAutoUpdate = true;
      }}
    >
      <RuntimeProvider value={runtime}>
        <PerformanceMonitor
          onDecline={() => onDowngrade()}
          flipflops={3}
          onFallback={() => onDowngrade()}
        >
          <Suspense fallback={null}>
            <SkyDome runtime={runtime} />
            <CameraRig runtime={runtime} />
            <EnvironmentRig accent={PALETTE.accent} enabled={budget.environment} />
            <FirstFrameSignal onFirstFrame={onFirstFrame} />

            {/* Éclairage global : le métal vit surtout de l'environnement,
                ces lumières directes ne font que poser les arêtes. */}
            <hemisphereLight
              args={["#a8bed8", "#1a1208", 0.75]}
              position={[0, 10, 0]}
            />
            <directionalLight
              position={[5, 7, 6]}
              intensity={2.6}
              color="#fff0dd"
            />
            <directionalLight
              position={[-6, 2, -3]}
              intensity={1.5}
              color="#8fb0d8"
            />
            <directionalLight
              position={[0, -4, 5]}
              intensity={0.9}
              color={PALETTE.accent}
            />

            <StageFloor length={pathLength} />
            <InfiniteGrid length={pathLength} accent={PALETTE.accent} />
            <ParticleField
              count={budget.particles}
              depth={pathLength}
              color={PALETTE.accentSoft}
              size={1.4}
              pixelRatio={budget.dpr}
              motion={motion}
            />

            <Worlds {...props} />

            {budget.postprocessing && (
              <EffectComposer enableNormalPass={false} multisampling={0}>
                <Bloom
                  intensity={1.35}
                  luminanceThreshold={0.42}
                  luminanceSmoothing={0.24}
                  mipmapBlur
                  radius={0.86}
                />
                <ChromaticAberration
                  offset={new THREE.Vector2(0.00075, 0.0011)}
                  radialModulation
                  modulationOffset={0.42}
                />
                <Vignette offset={0.22} darkness={0.82} eskil={false} />
              </EffectComposer>
            )}
          </Suspense>
        </PerformanceMonitor>
      </RuntimeProvider>
    </Canvas>
  );
}
