"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    float core = 0.25 + fresnel * uIntensity;
    gl_FragColor = vec4(uColor * core, clamp(core, 0.0, 1.0));
  }
`;

/**
 * Noyau lumineux « fresnel » : un halo additif qui joue avec le bloom.
 * Une seule geometry partagée, aucun post-traitement obligatoire.
 */
export function FresnelCore({
  radius = 0.42,
  color = "#f0a05a",
  intensity = 2.2,
  power = 2.4,
  pulse = 1,
}: {
  radius?: number;
  color?: string;
  intensity?: number;
  power?: number;
  pulse?: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, 3);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
        uPower: { value: power },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    return { geometry: geo, material: mat };
  }, [radius, color, intensity, power]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (pulse <= 0) return;
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 1.4) * 0.06 * pulse;
    if (meshRef.current) meshRef.current.scale.setScalar(scale);
    if (materialRef.current)
      materialRef.current.uniforms.uIntensity.value =
        intensity * (1 + Math.sin(t * 0.9) * 0.18 * pulse);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={2}
    />
  );
}
