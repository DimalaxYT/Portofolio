"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { UniverseProject } from "@/lib/universe/projects";
import { createScreenTexture } from "../three/screen-texture";
import { localProgress, sceneZ, useRuntime } from "../three/runtime";

/**
 * SCÈNE 3 — PROJETS COMME MONDES INTERACTIFS
 * Un seul composant réutilisable : la mise en scène (stage) est choisie par
 * projet, le reste (caméra qui se rapproche, réaction au curseur, révélation)
 * est partagé. Ajouter un projet n'implique aucun nouveau composant 3D.
 */

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const v = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return v * v * (3 - 2 * v);
};

/** Texture d'écran créée côté client, libérée au démontage. */
function useScreenTexture(
  title: string,
  accent: string,
  variant: number,
  image: string | null,
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const handle = createScreenTexture({ title, accent, variant, image });
    setTexture(handle.texture);
    return () => handle.dispose();
  }, [title, accent, variant, image]);

  return texture;
}

/* ------------------------------------------------------------------ */
/* Stages                                                              */
/* ------------------------------------------------------------------ */

function InterfaceStage({
  texture,
  accent,
}: {
  texture: THREE.Texture | null;
  accent: string;
}) {
  const chipsRef = useRef<THREE.Group | null>(null);
  const { motion } = useRuntime();

  useFrame(({ clock }, delta) => {
    if (!chipsRef.current) return;
    chipsRef.current.rotation.y += Math.min(delta, 0.05) * 0.18 * motion;
    const t = clock.getElapsedTime();
    chipsRef.current.children.forEach((chip, i) => {
      chip.position.y =
        chip.userData.baseY + Math.sin(t * 0.8 + i * 1.7) * 0.12 * motion;
    });
  });

  const chips = [
    { pos: [-3.9, 1.5, 0.6] as const, size: [1.25, 0.72] as const },
    { pos: [3.9, 0.4, 0.4] as const, size: [1.05, 0.62] as const },
    { pos: [-3.4, -1.6, 0.9] as const, size: [0.95, 0.55] as const },
  ];

  return (
    <group>
      {/* Corps de l'écran */}
      <mesh>
        <boxGeometry args={[6.6, 4.25, 0.16]} />
        <meshStandardMaterial
          color="#1b1f27"
          metalness={1}
          roughness={0.14}
          envMapIntensity={2.8}
        />
      </mesh>
      {/* Dalle affichée */}
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[6.25, 3.9]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            emissive="#ffffff"
            emissiveMap={texture}
            emissiveIntensity={0.85}
            roughness={0.42}
            metalness={0}
          />
        ) : (
          <meshStandardMaterial color="#0c0e12" roughness={0.5} metalness={0} />
        )}
      </mesh>
      {/* Liseré lumineux */}
      <mesh position={[0, -2.16, 0.02]}>
        <boxGeometry args={[6.6, 0.03, 0.18]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {/* Pied */}
      <mesh position={[0, -2.7, -0.2]}>
        <cylinderGeometry args={[0.09, 0.16, 1, 12]} />
        <meshStandardMaterial
          color="#2a2e35"
          metalness={1}
          roughness={0.16}
          envMapIntensity={2.6}
        />
      </mesh>

      {/* Éclats d'interface flottants */}
      <group ref={chipsRef}>
        {chips.map((chip, i) => (
          <group key={i} position={chip.pos} userData={{ baseY: chip.pos[1] }}>
            <mesh>
              <planeGeometry args={[chip.size[0] + 0.06, chip.size[1] + 0.06]} />
              <meshBasicMaterial
                color={accent}
                transparent
                opacity={0.5}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[chip.size[0], chip.size[1]]} />
              <meshStandardMaterial
                color="#15181d"
                metalness={0.6}
                roughness={0.4}
                emissive={accent}
                emissiveIntensity={0.45}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function DeviceStage({
  texture,
  accent,
}: {
  texture: THREE.Texture | null;
  accent: string;
}) {
  const ringRef = useRef<THREE.Mesh | null>(null);
  const { motion } = useRuntime();

  useFrame((_, delta) => {
    if (ringRef.current)
      ringRef.current.rotation.z += Math.min(delta, 0.05) * 0.5 * motion;
  });

  return (
    <group>
      <mesh>
        <boxGeometry args={[3.5, 6.9, 0.34]} />
        <meshStandardMaterial
          color="#22262f"
          metalness={1}
          roughness={0.11}
          envMapIntensity={3}
        />
      </mesh>
      <mesh position={[0, 0, 0.18]}>
        <planeGeometry args={[3.15, 6.4]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            emissive="#ffffff"
            emissiveMap={texture}
            emissiveIntensity={0.9}
            roughness={0.4}
            metalness={0}
          />
        ) : (
          <meshStandardMaterial color="#0c0e12" roughness={0.5} metalness={0} />
        )}
      </mesh>
      {/* Tranche lumineuse */}
      <mesh position={[0, 3.47, 0]}>
        <boxGeometry args={[3.5, 0.03, 0.36]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {/* Socle */}
      <mesh ref={ringRef} position={[0, -4.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.025, 8, 96]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2.6}
          toneMapped={false}
          metalness={0.95}
          roughness={0.18}
        />
      </mesh>
      <mesh position={[0, -4.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 2.28, 64]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z) / 4.6;
  const falloff = 1 - smoothstep(0.5, 1, r);
  const relief =
    Math.sin(x * 0.62) * Math.cos(z * 0.55) * 0.95 +
    Math.sin(x * 1.15 + z * 0.8) * 0.32;
  return relief * falloff - (1 - falloff) * 2.6;
}

function WorldStage({ accent, segments }: { accent: string; segments: number }) {
  const haloRef = useRef<THREE.Mesh | null>(null);
  const { motion } = useRuntime();

  const { solid, wire } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(9.6, 9.6, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    geo.computeVertexNormals();

    const wireGeo = new THREE.PlaneGeometry(9.6, 9.6, 22, 22);
    wireGeo.rotateX(-Math.PI / 2);
    const wirePos = wireGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < wirePos.count; i++) {
      const x = wirePos.getX(i);
      const z = wirePos.getZ(i);
      wirePos.setY(i, terrainHeight(x, z) + 0.02);
    }
    wireGeo.computeVertexNormals();

    return { solid: geo, wire: wireGeo };
  }, [segments]);

  const structures = useMemo(() => {
    const items: { x: number; z: number; h: number; w: number }[] = [];
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + i * 0.7;
      const radius = 1.1 + ((i * 37) % 100) / 42;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.hypot(x, z) > 4) continue;
      items.push({
        x,
        z,
        h: 0.3 + ((i * 53) % 100) / 60,
        w: 0.16 + ((i * 17) % 100) / 420,
      });
    }
    return items;
  }, []);

  useEffect(
    () => () => {
      solid.dispose();
      wire.dispose();
    },
    [solid, wire],
  );

  useFrame((_, delta) => {
    if (haloRef.current)
      haloRef.current.rotation.z += Math.min(delta, 0.05) * 0.25 * motion;
  });

  return (
    <group position={[0, -1.1, 0]}>
      <mesh geometry={solid}>
        <meshStandardMaterial
          color="#20252e"
          metalness={0.72}
          roughness={0.44}
          flatShading
          envMapIntensity={1.8}
        />
      </mesh>
      <lineSegments geometry={new THREE.WireframeGeometry(wire)}>
        <lineBasicMaterial
          color={accent}
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </lineSegments>

      {structures.map((item, i) => (
        <mesh
          key={i}
          position={[item.x, terrainHeight(item.x, item.z) + item.h / 2, item.z]}
        >
          <boxGeometry args={[item.w, item.h, item.w]} />
          <meshStandardMaterial
            color="#454b58"
            metalness={1}
            roughness={0.18}
            envMapIntensity={2.6}
            emissive={accent}
            emissiveIntensity={i % 4 === 0 ? 2.4 : 0.12}
            toneMapped={i % 4 !== 0}
          />
        </mesh>
      ))}

      <mesh ref={haloRef} position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.9, 0.02, 8, 128]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2.8}
          toneMapped={false}
          metalness={0.95}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function ArchitectureStage({ accent }: { accent: string }) {
  const stackRef = useRef<THREE.Group | null>(null);
  const { motion } = useRuntime();

  useFrame((_, delta) => {
    if (stackRef.current)
      stackRef.current.rotation.y += Math.min(delta, 0.05) * 0.1 * motion;
  });

  const slabs = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        y: -2.4 + i * 0.62,
        x: Math.sin(i * 1.35) * 1.05,
        z: Math.cos(i * 1.1) * 0.55,
        w: 3.6 - (i % 3) * 0.42,
        d: 2.3 - (i % 2) * 0.35,
        lit: i % 3 === 1,
      })),
    [],
  );

  return (
    <group ref={stackRef}>
      {slabs.map((slab, i) => (
        <group key={i} position={[slab.x, slab.y, slab.z]}>
          <mesh>
            <boxGeometry args={[slab.w, 0.16, slab.d]} />
            <meshStandardMaterial
              color="#22262f"
              metalness={1}
              roughness={0.13}
              envMapIntensity={2.9}
            />
          </mesh>
          {slab.lit && (
            <mesh position={[slab.w / 2 - 0.06, 0.1, 0]}>
              <boxGeometry args={[0.04, 0.05, slab.d * 0.9]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      {/* Noyau vertical */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 6.4, 0.5]} />
        <meshStandardMaterial
          color="#1a1e26"
          metalness={1}
          roughness={0.09}
          envMapIntensity={3.2}
        />
      </mesh>
      <mesh position={[0, 0.4, 0.26]}>
        <boxGeometry args={[0.06, 6.2, 0.02]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[0, -3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.1, 0.018, 8, 96]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2.4}
          toneMapped={false}
          metalness={0.95}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scène projet                                                        */
/* ------------------------------------------------------------------ */

export interface ProjectWorldProps {
  project: UniverseProject;
  index: number;
  /** Titre résolu dans la langue courante (texture d'écran). */
  screenTitle: string;
  /** Piloté par le panneau DOM : survol ou focus clavier. */
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
}

export function ProjectWorld({
  project,
  index,
  screenTitle,
  hovered,
  onHoverChange,
}: ProjectWorldProps) {
  const { engine, budget, motion, accent: baseAccent } = useRuntime();
  const accent = project.accent ?? baseAccent;

  const groupRef = useRef<THREE.Group | null>(null);
  const stageRef = useRef<THREE.Group | null>(null);
  const [pointerOver, setPointerOver] = useState(false);
  const engaged = hovered || pointerOver;

  const variant = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < project.id.length; i++)
      hash = (hash * 31 + project.id.charCodeAt(i)) % 97;
    return hash;
  }, [project.id]);

  const texture = useScreenTexture(screenTitle, accent, variant, project.image);

  useEffect(() => {
    engine.setFocus(engaged ? 1 : 0);
    return () => engine.setFocus(0);
  }, [engine, engaged]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const local = localProgress({ engine, budget, motion, accent }, index);
    const presence = THREE.MathUtils.clamp(1 - Math.abs(local), 0, 1);
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        sceneZ(index) + (1 - presence) * 5 * Math.sign(local || 1),
        3,
        dt,
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        -local * 0.9,
        3,
        dt,
      );
      const target = (0.9 + presence * 0.1) * (engaged ? 1.05 : 1);
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, target, 3.4, dt),
      );
    }

    if (stageRef.current) {
      // Rapprochement + inclinaison vers le curseur.
      stageRef.current.position.z = THREE.MathUtils.damp(
        stageRef.current.position.z,
        engaged ? 1.5 : 0,
        3,
        dt,
      );
      stageRef.current.rotation.y = THREE.MathUtils.damp(
        stageRef.current.rotation.y,
        engine.state.px * 0.3 + Math.sin(time * 0.22) * 0.05 * motion,
        2.2,
        dt,
      );
      stageRef.current.rotation.x = THREE.MathUtils.damp(
        stageRef.current.rotation.x,
        -engine.state.py * 0.16,
        2.2,
        dt,
      );
    }
  });

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setPointerOver(true);
    onHoverChange(true);
  };
  const leave = () => {
    setPointerOver(false);
    onHoverChange(false);
  };

  return (
    <group ref={groupRef} position={[0, 0, sceneZ(index)]}>
      <pointLight
        position={[3, 3, 5]}
        color={accent}
        intensity={engaged ? 240 : 150}
        distance={30}
        decay={2}
      />

      <group ref={stageRef}>
        {project.stageKind === "interface" && (
          <InterfaceStage texture={texture} accent={accent} />
        )}
        {project.stageKind === "device" && (
          <DeviceStage texture={texture} accent={accent} />
        )}
        {project.stageKind === "world" && (
          <WorldStage accent={accent} segments={budget.terrainSegments} />
        )}
        {project.stageKind === "architecture" && (
          <ArchitectureStage accent={accent} />
        )}
      </group>

      {/* Volume d'interaction : invisible mais raycastable. `depthWrite` et
          `depthTest` coupés — sinon cette boîte écrirait dans le Z-buffer et
          masquerait les objets transparents dessinés après elle. */}
      <mesh onPointerOver={enter} onPointerOut={leave} renderOrder={999}>
        <boxGeometry args={[8, 7.4, 4]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          colorWrite={false}
        />
      </mesh>
    </group>
  );
}
