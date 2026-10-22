"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { localProgress, sceneZ, useRuntime } from "../three/runtime";

/**
 * SCÈNE 2 — « CATHÉDRALE DE DONNÉES »
 * Une matrice de piliers instanciés réagit au curseur (proximité + onde),
 * trois dalles flottantes s'inclinent vers le pointeur. La typographie reste
 * dans le DOM : nette, sélectionnable, lisible par les lecteurs d'écran.
 */

const SPACING = 1.18;

export function AboutWorld({ index }: { index: number }) {
  const { engine, budget, motion, accent } = useRuntime();

  const groupRef = useRef<THREE.Group | null>(null);
  const pillarsRef = useRef<THREE.InstancedMesh | null>(null);
  const slabARef = useRef<THREE.Mesh | null>(null);
  const slabBRef = useRef<THREE.Mesh | null>(null);
  const slabCRef = useRef<THREE.Mesh | null>(null);

  const side = Math.max(4, Math.round(Math.sqrt(budget.pillars)));
  const count = side * side;

  const pillarGeometry = useMemo(() => new THREE.BoxGeometry(0.46, 1, 0.46), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  /* Teintes statiques : accent au centre, graphite en périphérie. */
  useEffect(() => {
    const mesh = pillarsRef.current;
    if (!mesh) return;
    const dark = new THREE.Color("#22252c");
    const lit = new THREE.Color(accent);
    const half = (side - 1) / 2;
    for (let i = 0; i < count; i++) {
      const gx = i % side;
      const gz = Math.floor(i / side);
      const dist = Math.hypot(gx - half, gz - half) / Math.max(1, half);
      const color = dark.clone().lerp(lit, Math.pow(1 - dist, 3) * 0.55);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [accent, count, side]);

  useEffect(
    () => () => {
      pillarGeometry.dispose();
    },
    [pillarGeometry],
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
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        engine.state.px * 0.14,
        2,
        dt,
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        -0.06 - engine.state.py * 0.06,
        2,
        dt,
      );
    }

    const mesh = pillarsRef.current;
    if (mesh) {
      // Foyer du curseur projeté sur la matrice.
      const focusX = engine.state.px * (side * SPACING) * 0.42;
      const focusZ = -engine.state.py * (side * SPACING) * 0.3;
      const half = (side - 1) / 2;

      for (let i = 0; i < count; i++) {
        const gx = i % side;
        const gz = Math.floor(i / side);
        const x = (gx - half) * SPACING;
        const z = (gz - half) * SPACING;

        const dist = Math.hypot(x - focusX, z - focusZ);
        const proximity = Math.exp(-(dist * dist) / 5.2);
        const wave =
          Math.sin(x * 0.55 + time * 0.9 * motion) *
          Math.cos(z * 0.5 + time * 0.7 * motion);

        const height =
          0.32 + Math.max(0, wave) * 0.5 + proximity * 3.1 * (0.4 + presence * 0.6);

        position.set(x, -3.2 + height / 2, z);
        scale.set(1, height, 1);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    /* Dalles flottantes : inclinaison vers le pointeur. */
    const tiltX = -engine.state.py * 0.3;
    const tiltY = engine.state.px * 0.34;
    const slabs: [React.RefObject<THREE.Mesh | null>, number, number][] = [
      [slabARef, 1.1, 0.6],
      [slabBRef, -1.3, -0.8],
      [slabCRef, 0.4, 1.6],
    ];
    for (let i = 0; i < slabs.length; i++) {
      const [ref, floatSpeed, floatAmp] = slabs[i];
      const meshSlab = ref.current;
      if (!meshSlab) continue;
      meshSlab.rotation.x = THREE.MathUtils.damp(
        meshSlab.rotation.x,
        tiltX * (i % 2 === 0 ? 1 : -0.7),
        2.2,
        dt,
      );
      meshSlab.rotation.z = THREE.MathUtils.damp(
        meshSlab.rotation.z,
        tiltY * (i % 2 === 0 ? 0.5 : -0.4),
        2.2,
        dt,
      );
      meshSlab.position.y =
        meshSlab.position.y * 0 +
        (i === 0 ? 1.9 : i === 1 ? -0.6 : 0.7) +
        Math.sin(time * floatSpeed * motion + i) * 0.18 * floatAmp * motion;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, sceneZ(index)]}>
      <pointLight
        position={[0, 4, 4]}
        color={accent}
        intensity={150}
        distance={30}
        decay={2}
      />

      <instancedMesh
        ref={pillarsRef}
        args={[undefined, undefined, count]}
        geometry={pillarGeometry}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#2a2f3a"
          metalness={1}
          roughness={0.17}
          envMapIntensity={2.7}
        />
      </instancedMesh>

      {/* Dalles */}
      <mesh ref={slabARef} position={[2.4, 1.9, -1.2]}>
        <boxGeometry args={[3.1, 0.07, 1.5]} />
        <meshStandardMaterial
          color="#3d434f"
          metalness={1}
          roughness={0.1}
          envMapIntensity={3.1}
        />
      </mesh>
      <mesh ref={slabBRef} position={[-2.8, -0.6, 0.6]}>
        <boxGeometry args={[2.4, 0.06, 2.2]} />
        <meshStandardMaterial
          color="#2b303a"
          metalness={1}
          roughness={0.14}
          envMapIntensity={2.8}
        />
      </mesh>
      <mesh ref={slabCRef} position={[0.6, 0.7, 2.2]}>
        <boxGeometry args={[1.6, 0.05, 1.1]} />
        <meshStandardMaterial
          color={accent}
          metalness={0.9}
          roughness={0.16}
          emissive={accent}
          emissiveIntensity={1.8}
          toneMapped={false}
          envMapIntensity={2.4}
        />
      </mesh>
    </group>
  );
}
