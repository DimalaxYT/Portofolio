import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aScale;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMotion;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.21 + aSeed * 6.2831) * 0.45 * uMotion;
    p.x += cos(uTime * 0.16 + aSeed * 4.13) * 0.35 * uMotion;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = max(0.001, -mv.z);
    float twinkle = 0.5 + 0.5 * sin(uTime * 1.25 + aSeed * 18.0);
    // Disparition progressive : proche = net, lointain = fondu.
    vAlpha = twinkle * smoothstep(95.0, 14.0, depth) * smoothstep(0.4, 2.0, depth);
    gl_PointSize = uSize * aScale * uPixelRatio * (16.0 / depth);
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, d) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export interface ParticleFieldProps {
  count: number;
  /** Longueur du parcours couvert (toutes les scènes). */
  depth: number;
  radius?: number;
  color?: string;
  size?: number;
  pixelRatio?: number;
  /** 0 = figé (reduced-motion). */
  motion?: number;
}

/**
 * Champ de particules unique, réparti sur tout le parcours : une seule
 * geometry, un seul draw call, aucune allocation par frame.
 */
export function ParticleField({
  count,
  depth,
  radius = 16,
  color = "#f0a05a",
  size = 1.5,
  pixelRatio = 1,
  motion = 1,
}: ParticleFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribution en cylindre creux : rien ne traverse l'axe de la caméra.
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.35 + Math.pow(Math.random(), 0.6) * 0.65);
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 1.15;
      positions[i * 3 + 2] = 14 - Math.random() * (depth + 28);
      seeds[i] = Math.random();
      scales[i] = 0.35 + Math.random() * 1.1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uPixelRatio: { value: pixelRatio },
        uMotion: { value: motion },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
    });

    return { geometry: geo, material: mat };
  }, [count, depth, radius, size, pixelRatio, color, motion]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-1}
    />
  );
}
