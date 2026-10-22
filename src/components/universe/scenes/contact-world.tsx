"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { localProgress, sceneZ, useRuntime } from "../three/runtime";

/**
 * SCÈNE 5 — PORTAIL DE CONTACT
 * Anneau métallique, disque d'énergie animé en shader et particules aspirées
 * en spirale. Dernière scène du voyage : la lumière prend le dessus.
 */

const DISC_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DISC_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uMotion;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    float swirl = sin(a * 3.0 + r * 9.0 - uTime * 1.1 * uMotion);
    float rings = sin(r * 26.0 - uTime * 1.8 * uMotion);
    float veil = smoothstep(1.0, 0.08, r);
    float edge = smoothstep(0.72, 0.98, r) * smoothstep(1.0, 0.94, r);

    float value = veil * (0.22 + 0.3 * swirl + 0.16 * rings) + edge * 1.4;
    value *= smoothstep(0.0, 0.25, r) * 0.9 + 0.35;

    gl_FragColor = vec4(uColor * value * 1.7, clamp(value, 0.0, 1.0) * 0.9);
  }
`;

const SPIRAL_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMotion;
  varying float vAlpha;

  void main() {
    float t = fract(aSeed + uTime * 0.06 * uMotion);
    float radius = mix(5.4, 0.4, t);
    float angle = aSeed * 42.0 + uTime * 0.7 * uMotion + t * 6.0;
    vec3 p = vec3(
      cos(angle) * radius,
      sin(angle) * radius * 0.72 + (aSeed - 0.5) * 1.2 * (1.0 - t),
      sin(angle) * radius * 0.35
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = sin(t * 3.14159) * 0.9;
    gl_PointSize = uSize * uPixelRatio * (14.0 / max(0.001, -mv.z));
  }
`;

const SPIRAL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`;

export function ContactWorld({ index }: { index: number }) {
  const { engine, budget, motion, accent } = useRuntime();

  const groupRef = useRef<THREE.Group | null>(null);
  const ringsRef = useRef<THREE.Group | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const discMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const spiralMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  const discMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uMotion: { value: motion },
          uColor: { value: new THREE.Color(accent) },
        },
        vertexShader: DISC_VERTEX,
        fragmentShader: DISC_FRAGMENT,
      }),
    [accent, motion],
  );

  const spiralGeometry = useMemo(() => {
    const count = Math.round(budget.particles * 0.18);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, [budget.particles]);

  const spiralMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 1.6 },
          uPixelRatio: { value: budget.dpr },
          uMotion: { value: motion },
          uColor: { value: new THREE.Color(accent) },
        },
        vertexShader: SPIRAL_VERTEX,
        fragmentShader: SPIRAL_FRAGMENT,
      }),
    [accent, budget.dpr, motion],
  );

  useEffect(() => {
    discMaterialRef.current = discMaterial;
    spiralMaterialRef.current = spiralMaterial;
    return () => {
      discMaterial.dispose();
      spiralMaterial.dispose();
      spiralGeometry.dispose();
    };
  }, [discMaterial, spiralMaterial, spiralGeometry]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const local = localProgress({ engine, budget, motion, accent }, index);
    const presence = THREE.MathUtils.clamp(1 - Math.abs(local), 0, 1);
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        sceneZ(index) + (1 - presence) * 5,
        3,
        dt,
      );
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        engine.state.px * 0.2,
        2,
        dt,
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        -engine.state.py * 0.12,
        2,
        dt,
      );
      const target = 0.9 + presence * 0.1;
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, target, 3, dt),
      );
    }

    if (ringsRef.current) {
      const [a, b, c] = ringsRef.current.children;
      if (a) a.rotation.z += dt * 0.22 * motion;
      if (b) b.rotation.z -= dt * 0.34 * motion;
      if (c) c.rotation.z += dt * 0.14 * motion;
    }

    if (discMaterialRef.current)
      discMaterialRef.current.uniforms.uTime.value = time;
    if (spiralMaterialRef.current)
      spiralMaterialRef.current.uniforms.uTime.value = time;
    if (lightRef.current)
      lightRef.current.intensity = 14 + Math.sin(time * 0.9) * 3 * motion;
  });

  return (
    <group ref={groupRef} position={[0, 0, sceneZ(index)]}>
      <pointLight
        ref={lightRef}
        position={[0, 0, 3]}
        color={accent}
        intensity={14}
        distance={28}
        decay={2}
      />

      {/* Anneau principal */}
      <mesh>
        <torusGeometry args={[3.3, 0.13, 20, 160]} />
        <meshStandardMaterial
          color="#3a3f49"
          metalness={1}
          roughness={0.18}
          envMapIntensity={2}
        />
      </mesh>

      {/* Anneaux secondaires */}
      <group ref={ringsRef}>
        <mesh rotation={[0.16, 0.1, 0]}>
          <torusGeometry args={[4.1, 0.02, 8, 128]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.55}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        <mesh rotation={[-0.22, 0.14, 0.3]}>
          <torusGeometry args={[4.7, 0.014, 8, 128]} />
          <meshStandardMaterial
            color="#c9ccd4"
            metalness={1}
            roughness={0.16}
            envMapIntensity={2}
          />
        </mesh>
        <mesh rotation={[0.3, -0.2, 0.1]}>
          <torusGeometry args={[2.6, 0.018, 8, 128]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.4}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Disque d'énergie */}
      <mesh material={discMaterial} renderOrder={1}>
        <circleGeometry args={[3.25, 96]} />
      </mesh>

      {/* Particules aspirées */}
      <points geometry={spiralGeometry} material={spiralMaterial} frustumCulled={false} />
    </group>
  );
}
