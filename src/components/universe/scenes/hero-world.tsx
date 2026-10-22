"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FresnelCore } from "../three/fresnel-core";
import { localProgress, sceneZ, useRuntime } from "../three/runtime";

/**
 * SCÈNE 1 — « LE MONOLITHE »
 * Colonne hexagonale usinée (métal PBR + reflets procéduraux), couture
 * lumineuse, anneaux gyroscopiques, cage filaire et éclats en orbite.
 */

const MONOLITH_RADIUS = 1.05;
const MONOLITH_HEIGHT = 5.4;

function createMonolithGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  // Hexagone dont une face plate regarde l'axe +X (donc +Z après rotation).
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 6;
    const x = Math.cos(angle) * MONOLITH_RADIUS;
    const y = Math.sin(angle) * MONOLITH_RADIUS;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: MONOLITH_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.09,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(-Math.PI / 2);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

export function HeroWorld({ index }: { index: number }) {
  const { engine, budget, motion, accent } = useRuntime();

  const groupRef = useRef<THREE.Group | null>(null);
  const spinRef = useRef<THREE.Group | null>(null);
  const ringsRef = useRef<THREE.Group | null>(null);
  const cageRef = useRef<THREE.Mesh | null>(null);
  const shardsRef = useRef<THREE.InstancedMesh | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);

  const monolithGeometry = useMemo(() => createMonolithGeometry(), []);
  const cageGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(4.6, 1),
    [],
  );

  /* Éclats en orbite : matrices mises à jour sans allocation. */
  const shardData = useMemo(() => {
    const count = budget.shards;
    const items = Array.from({ length: count }, (_, i) => {
      const t = i / count;
      return {
        radius: 2.5 + Math.random() * 2.6,
        angle: t * Math.PI * 2 + Math.random() * 0.4,
        speed: 0.12 + Math.random() * 0.22,
        y: (Math.random() - 0.5) * 4.2,
        tilt: (Math.random() - 0.5) * 0.9,
        scale: 0.1 + Math.random() * 0.16,
      };
    });
    return items;
  }, [budget.shards]);

  const shardMatrix = useMemo(() => new THREE.Matrix4(), []);
  const shardQuat = useMemo(() => new THREE.Quaternion(), []);
  const shardPos = useMemo(() => new THREE.Vector3(), []);
  const shardScale = useMemo(() => new THREE.Vector3(), []);
  const shardEuler = useMemo(() => new THREE.Euler(), []);

  useEffect(
    () => () => {
      monolithGeometry.dispose();
      cageGeometry.dispose();
    },
    [monolithGeometry, cageGeometry],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const local = localProgress({ engine, budget, motion, accent }, index);
    const presence = THREE.MathUtils.clamp(1 - Math.abs(local), 0, 1);
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      // Entrée/sortie : la sculpture avance légèrement et se redresse.
      const targetZ = sceneZ(index) + (1 - presence) * 6 * Math.sign(local || 1);
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        targetZ,
        3,
        dt,
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        -local * 1.4,
        3,
        dt,
      );
      const targetScale = 0.86 + presence * 0.14;
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 3, dt),
      );
      // Parallaxe pointeur.
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        engine.state.px * 0.22,
        2.4,
        dt,
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        -engine.state.py * 0.12,
        2.4,
        dt,
      );
    }

    if (spinRef.current) {
      spinRef.current.rotation.y += dt * 0.16 * motion;
      spinRef.current.rotation.z = Math.sin(time * 0.25) * 0.04 * motion;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y -= dt * 0.24 * motion;
      ringsRef.current.rotation.x = Math.PI / 2.6 + Math.sin(time * 0.3) * 0.1;
      const child = ringsRef.current.children[1];
      if (child) child.rotation.z += dt * 0.42 * motion;
    }

    if (cageRef.current) {
      cageRef.current.rotation.y -= dt * 0.05 * motion;
      cageRef.current.rotation.x += dt * 0.03 * motion;
    }

    const shards = shardsRef.current;
    if (shards) {
      for (let i = 0; i < shardData.length; i++) {
        const shard = shardData[i];
        const angle = shard.angle + time * shard.speed * motion;
        shardPos.set(
          Math.cos(angle) * shard.radius,
          shard.y + Math.sin(time * 0.6 + i) * 0.25 * motion,
          Math.sin(angle) * shard.radius * Math.cos(shard.tilt),
        );
        shardEuler.set(angle * 1.4, angle * 0.9, i);
        shardQuat.setFromEuler(shardEuler);
        shardScale.setScalar(shard.scale);
        shardMatrix.compose(shardPos, shardQuat, shardScale);
        shards.setMatrixAt(i, shardMatrix);
      }
      shards.instanceMatrix.needsUpdate = true;
    }

    if (lightRef.current) {
      lightRef.current.intensity = 10 + Math.sin(time * 1.1) * 2.2 * motion;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, sceneZ(index)]}>
      <pointLight
        ref={lightRef}
        position={[2.6, 2.2, 3.4]}
        color={accent}
        intensity={10}
        distance={22}
        decay={2}
      />
      <pointLight
        position={[-3.4, -1.4, 2]}
        color="#8fb6d8"
        intensity={5}
        distance={18}
        decay={2}
      />

      {/* Colonne usinée + couture lumineuse */}
      <group ref={spinRef}>
        <mesh geometry={monolithGeometry} castShadow={false}>
          <meshStandardMaterial
            color="#2b2f37"
            metalness={1}
            roughness={0.26}
            envMapIntensity={1.35}
          />
        </mesh>
        <mesh position={[0, 0, MONOLITH_RADIUS * 0.866]}>
          <boxGeometry args={[0.1, MONOLITH_HEIGHT * 0.78, 0.05]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
        {/* Gravures horizontales : fines arêtes métalliques */}
        {[-1.7, -0.4, 0.9, 1.9].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <torusGeometry args={[MONOLITH_RADIUS * 1.005, 0.012, 6, 6]} />
            <meshStandardMaterial
              color="#7d848f"
              metalness={1}
              roughness={0.3}
              envMapIntensity={1.6}
            />
          </mesh>
        ))}
      </group>

      {/* Anneaux gyroscopiques */}
      <group ref={ringsRef} rotation={[Math.PI / 2.6, 0, 0]}>
        <mesh>
          <torusGeometry args={[3.05, 0.022, 8, 128]} />
          <meshStandardMaterial
            color="#c9ccd4"
            metalness={1}
            roughness={0.14}
            envMapIntensity={2}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3.2, 0, 0]}>
          <torusGeometry args={[3.75, 0.014, 8, 128]} />
          <meshStandardMaterial
            color={accent}
            metalness={0.9}
            roughness={0.22}
            emissive={accent}
            emissiveIntensity={0.35}
            envMapIntensity={1.6}
          />
        </mesh>
      </group>

      {/* Cage filaire */}
      <mesh ref={cageRef} geometry={cageGeometry}>
        <meshBasicMaterial
          color={accent}
          wireframe
          transparent
          opacity={0.09}
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
          color="#8c929c"
          metalness={1}
          roughness={0.2}
          envMapIntensity={1.8}
        />
      </instancedMesh>

      {/* Noyau */}
      <group position={[0, 0, 1.6]}>
        <FresnelCore radius={0.44} color={accent} intensity={2.4} pulse={motion} />
      </group>
    </group>
  );
}
