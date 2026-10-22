"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FresnelCore } from "../three/fresnel-core";
import { GlowSprite } from "../three/glow-sprite";
import { localProgress, sceneZ, useRuntime } from "../three/runtime";

/**
 * SCÈNE 1 — « LA FRACTURE »
 *
 * Un monolithe de graphite poli fendu en deux, écarté, laissant passer une
 * arête de lumière. Le métal est en `metalness: 1` : il ne montre que le
 * reflet du studio HDR, d'où des rugosités basses et un `envMapIntensity`
 * élevé. Tout ce qui brille vraiment est émissif et non tonemappé, donc
 * récupéré par le bloom.
 */

const SLAB_WIDTH = 1.15;
const SLAB_HEIGHT = 4.15;
/** Décalage vertical : la sculpture monte, le texte respire en bas. */
const BASE_Y = 1.05;
const SLAB_DEPTH = 1.5;
const GAP = 0.34;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function createSlab(): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(
    roundedRect(SLAB_WIDTH, SLAB_HEIGHT, 0.14),
    {
      depth: SLAB_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 3,
      curveSegments: 6,
    },
  );
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/** Matériau métal partagé : graphite poli, reflets nets. */
const METAL_PROPS = {
  color: "#1d212a",
  metalness: 1,
  roughness: 0.13,
  envMapIntensity: 2.6,
} as const;

export function HeroWorld({ index }: { index: number }) {
  const { engine, budget, motion, accent } = useRuntime();

  const groupRef = useRef<THREE.Group | null>(null);
  const spinRef = useRef<THREE.Group | null>(null);
  const leftRef = useRef<THREE.Group | null>(null);
  const rightRef = useRef<THREE.Group | null>(null);
  const seamRef = useRef<THREE.Mesh | null>(null);
  const ringsRef = useRef<THREE.Group | null>(null);
  const cageRef = useRef<THREE.Mesh | null>(null);
  const shardsRef = useRef<THREE.InstancedMesh | null>(null);

  const slabGeometry = useMemo(() => createSlab(), []);
  const cageGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(5.1, 1),
    [],
  );

  const shardData = useMemo(() => {
    const count = budget.shards;
    return Array.from({ length: count }, (_, i) => {
      const t = i / count;
      return {
        radius: 2.9 + Math.random() * 3.1,
        angle: t * Math.PI * 2 + Math.random() * 0.5,
        speed: 0.1 + Math.random() * 0.26,
        y: (Math.random() - 0.5) * 5.2,
        tilt: (Math.random() - 0.5) * 0.8,
        scale: 0.09 + Math.random() * 0.17,
      };
    });
  }, [budget.shards]);

  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  useEffect(
    () => () => {
      slabGeometry.dispose();
      cageGeometry.dispose();
    },
    [slabGeometry, cageGeometry],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const local = localProgress({ engine, budget, motion, accent }, index);
    const presence = THREE.MathUtils.clamp(1 - Math.abs(local), 0, 1);
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        sceneZ(index) + (1 - presence) * 7 * Math.sign(local || 1),
        3,
        dt,
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        BASE_Y - local * 1.5,
        3,
        dt,
      );
      const targetScale = 0.84 + presence * 0.16;
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 3, dt),
      );
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        engine.state.px * 0.3,
        2.4,
        dt,
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        -engine.state.py * 0.14,
        2.4,
        dt,
      );
    }

    if (spinRef.current) {
      spinRef.current.rotation.y += dt * 0.13 * motion;
    }

    /* Respiration de la fracture : les deux moitiés s'écartent doucement. */
    const breathe = (Math.sin(time * 0.55) * 0.5 + 0.5) * motion;
    const spread = GAP / 2 + breathe * 0.16;
    if (leftRef.current) {
      leftRef.current.position.x = -spread;
      leftRef.current.rotation.y = 0.16 + breathe * 0.05;
    }
    if (rightRef.current) {
      rightRef.current.position.x = spread;
      rightRef.current.rotation.y = -0.16 - breathe * 0.05;
    }
    if (seamRef.current) {
      const material = seamRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.72 + breathe * 0.28;
      seamRef.current.scale.x = 0.85 + breathe * 0.35;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y -= dt * 0.22 * motion;
      ringsRef.current.rotation.x =
        Math.PI / 2.4 + Math.sin(time * 0.28) * 0.12 * motion;
      const inner = ringsRef.current.children[1];
      if (inner) inner.rotation.z += dt * 0.5 * motion;
    }

    if (cageRef.current) {
      cageRef.current.rotation.y -= dt * 0.045 * motion;
      cageRef.current.rotation.x += dt * 0.028 * motion;
    }

    const shards = shardsRef.current;
    if (shards) {
      for (let i = 0; i < shardData.length; i++) {
        const shard = shardData[i];
        const angle = shard.angle + time * shard.speed * motion;
        pos.set(
          Math.cos(angle) * shard.radius,
          shard.y + Math.sin(time * 0.55 + i) * 0.3 * motion,
          Math.sin(angle) * shard.radius * Math.cos(shard.tilt),
        );
        euler.set(angle * 1.5, angle * 0.85, i);
        quat.setFromEuler(euler);
        scl.setScalar(shard.scale);
        matrix.compose(pos, quat, scl);
        shards.setMatrixAt(i, matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={[0, BASE_Y, sceneZ(index)]}>
      {/* Lumières de scène : chaudes et proches pour des reflets francs. */}
      <pointLight
        position={[3.4, 3, 4.2]}
        color={accent}
        intensity={140}
        distance={26}
        decay={2}
      />
      <pointLight
        position={[-4.2, -1.2, 3]}
        color="#9cc4ea"
        intensity={70}
        distance={22}
        decay={2}
      />
      <pointLight
        position={[0, 0, 1.2]}
        color={accent}
        intensity={55}
        distance={12}
        decay={2}
      />

      {/* Halo volumétrique derrière la fracture. */}
      <GlowSprite size={13} color={accent} opacity={0.5} position={[0, 0, -1.6]} />
      <GlowSprite size={5} color="#ffd9b0" opacity={0.75} position={[0, 0, 0.1]} />

      <group ref={spinRef}>
        {/* Moitié gauche */}
        <group ref={leftRef} position={[-GAP / 2, 0, 0]}>
          <mesh geometry={slabGeometry}>
            <meshStandardMaterial {...METAL_PROPS} />
          </mesh>
          {/* Gravures : fines arêtes qui accrochent la lumière */}
          {[-1.5, -0.5, 0.6, 1.6].map((y) => (
            <mesh key={y} position={[0, y, SLAB_DEPTH / 2 + 0.01]}>
              <boxGeometry args={[SLAB_WIDTH * 0.72, 0.018, 0.01]} />
              <meshStandardMaterial
                color="#c9a184"
                metalness={1}
                roughness={0.2}
                envMapIntensity={3}
              />
            </mesh>
          ))}
        </group>

        {/* Moitié droite */}
        <group ref={rightRef} position={[GAP / 2, 0, 0]}>
          <mesh geometry={slabGeometry}>
            <meshStandardMaterial {...METAL_PROPS} />
          </mesh>
          {[-1.5, -0.5, 0.6, 1.6].map((y) => (
            <mesh key={y} position={[0, y, SLAB_DEPTH / 2 + 0.01]}>
              <boxGeometry args={[SLAB_WIDTH * 0.72, 0.018, 0.01]} />
              <meshStandardMaterial
                color="#c9a184"
                metalness={1}
                roughness={0.2}
                envMapIntensity={3}
              />
            </mesh>
          ))}
        </group>

        {/* Arête de lumière au cœur de la fracture */}
        <mesh ref={seamRef} position={[0, 0, 0]} renderOrder={2}>
          <planeGeometry args={[GAP * 1.5, SLAB_HEIGHT * 0.94]} />
          <meshBasicMaterial
            color="#fff0dc"
            transparent
            opacity={0.9}
            toneMapped={false}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Noyau visible à travers la fracture */}
      <group position={[0, 0, 0.25]}>
        <FresnelCore radius={0.62} color={accent} intensity={3.4} pulse={motion} />
      </group>

      {/* Anneaux gyroscopiques */}
      <group ref={ringsRef} rotation={[Math.PI / 2.4, 0, 0]}>
        <mesh>
          <torusGeometry args={[3.5, 0.028, 12, 180]} />
          <meshStandardMaterial
            color="#d8dbe2"
            metalness={1}
            roughness={0.08}
            envMapIntensity={3.2}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[4.3, 0.018, 10, 180]} />
          <meshStandardMaterial
            color={accent}
            metalness={0.95}
            roughness={0.16}
            emissive={accent}
            emissiveIntensity={2.2}
            toneMapped={false}
            envMapIntensity={2.4}
          />
        </mesh>
      </group>

      {/* Cage filaire */}
      <mesh ref={cageRef} geometry={cageGeometry}>
        <meshBasicMaterial
          color={accent}
          wireframe
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>

      {/* Éclats en orbite */}
      <instancedMesh
        ref={shardsRef}
        args={[undefined, undefined, budget.shards]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#aeb4c0"
          metalness={1}
          roughness={0.11}
          envMapIntensity={3}
        />
      </instancedMesh>
    </group>
  );
}
