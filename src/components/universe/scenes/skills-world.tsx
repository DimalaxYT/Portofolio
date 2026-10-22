"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Skill } from "@/lib/universe/content";
import { localProgress, sceneZ, useRuntime } from "../three/runtime";

/**
 * SCÈNE 4 — CONSTELLATION DE COMPÉTENCES
 * Chaque technologie est un objet interactif (instanced mesh) relié à ses
 * voisins les plus proches. Le survol 3D et la liste DOM accessible partagent
 * le même état : aucune interaction ne dépend de la souris.
 */

const RADIUS = 3.5;

export interface SkillsWorldProps {
  index: number;
  skills: Skill[];
  activeId: string | null;
  onHover: (id: string | null) => void;
}

export function SkillsWorld({
  index,
  skills,
  activeId,
  onHover,
}: SkillsWorldProps) {
  const { engine, budget, motion, accent } = useRuntime();

  const groupRef = useRef<THREE.Group | null>(null);
  const nodesRef = useRef<THREE.InstancedMesh | null>(null);

  const count = Math.min(skills.length, budget.skillNodes);

  /* Répartition en sphère de Fibonacci : régulière et sans amas. */
  const positions = useMemo(() => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, i) => {
      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      return new THREE.Vector3(
        Math.cos(theta) * radius * RADIUS,
        y * RADIUS * 0.82,
        Math.sin(theta) * radius * RADIUS,
      );
    });
  }, [count]);

  /* Arêtes : chaque nœud vers ses deux plus proches voisins. */
  const linkGeometry = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      const distances = positions
        .map((p, j) => ({ j, d: p.distanceTo(positions[i]) }))
        .filter((item) => item.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of distances) {
        if (j < i) continue;
        points.push(
          positions[i].x,
          positions[i].y,
          positions[i].z,
          positions[j].x,
          positions[j].y,
          positions[j].z,
        );
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [positions]);

  const nodeGeometry = useMemo(() => new THREE.OctahedronGeometry(0.24, 0), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const scales = useRef<number[]>(Array(count).fill(1));
  const baseColor = useMemo(() => new THREE.Color("#767d89"), []);
  const activeColor = useMemo(() => new THREE.Color(accent), [accent]);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    scales.current = Array(count).fill(1);
  }, [count]);

  useEffect(
    () => () => {
      nodeGeometry.dispose();
      linkGeometry.dispose();
    },
    [nodeGeometry, linkGeometry],
  );

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
      groupRef.current.rotation.y += dt * 0.07 * motion;
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        -engine.state.py * 0.18,
        2,
        dt,
      );
      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        engine.state.px * 0.08,
        2,
        dt,
      );
    }

    const mesh = nodesRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const isActive = skills[i]?.id === activeId;
      const target = isActive ? 2.05 : 1;
      scales.current[i] = THREE.MathUtils.damp(
        scales.current[i],
        target,
        6,
        dt,
      );
      const pulse = isActive ? 1 + Math.sin(time * 3.2) * 0.07 * motion : 1;

      quaternion.setFromEuler(
        new THREE.Euler(
          time * 0.35 * motion + i,
          time * 0.24 * motion + i * 0.6,
          0,
        ),
      );
      scale.setScalar(scales.current[i] * pulse);
      matrix.compose(positions[i], quaternion, scale);
      mesh.setMatrixAt(i, matrix);

      tempColor.copy(baseColor).lerp(activeColor, isActive ? 1 : 0);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const id = event.instanceId;
    if (typeof id === "number" && skills[id]) onHover(skills[id].id);
  };

  return (
    <group ref={groupRef} position={[0, 0, sceneZ(index)]}>
      <pointLight
        position={[2, 3, 5]}
        color={accent}
        intensity={9}
        distance={22}
        decay={2}
      />

      <lineSegments geometry={linkGeometry}>
        <lineBasicMaterial
          color={accent}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </lineSegments>

      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, count]}
        geometry={nodeGeometry}
        frustumCulled={false}
        onPointerOver={handleOver}
        onPointerOut={() => onHover(null)}
      >
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.95}
          roughness={0.24}
          emissive={accent}
          emissiveIntensity={0.18}
          envMapIntensity={1.8}
        />
      </instancedMesh>

      {/* Halo central */}
      <mesh>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
