import { useEffect, useMemo } from "react";
import * as THREE from "three";

const GRID_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GRID_FRAGMENT = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uSpacing;

  float lineMask(vec2 p, float width) {
    vec2 g = abs(fract(p / uSpacing - 0.5) - 0.5) / fwidth(p / uSpacing);
    float l = min(g.x, g.y);
    return 1.0 - min(l / width, 1.0);
  }

  void main() {
    float fine = lineMask(vWorld.xz, 1.1);
    float bold = lineMask(vWorld.xz, 1.8) * step(0.5, mod(floor(vWorld.x / (uSpacing * 5.0)) + floor(vWorld.z / (uSpacing * 5.0)), 2.0));

    float radial = length(vWorld.xz - vec2(0.0, vWorld.z)) * 0.0;
    float fade = smoothstep(120.0, 18.0, vDepth) * smoothstep(1.0, 9.0, vDepth);
    float axisGlow = exp(-abs(vWorld.x) * 0.28) * 0.5;

    vec3 color = mix(uColor, uAccent, axisGlow);
    float alpha = (fine * 0.30 + bold * 0.22) * fade;
    alpha += axisGlow * 0.05 * fade;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Sol grillagé infini : un seul plan, fondu par la profondeur. Donne la
 * sensation de traverser un espace cohérent entre les scènes.
 */
export function InfiniteGrid({
  length,
  y = -3.6,
  color = "#5d6472",
  accent = "#f0a05a",
  spacing = 2,
}: {
  length: number;
  y?: number;
  color?: string;
  accent?: string;
  spacing?: number;
}) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(180, length + 120, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uAccent: { value: new THREE.Color(accent) },
        uSpacing: { value: spacing },
      },
      vertexShader: GRID_VERTEX,
      fragmentShader: GRID_FRAGMENT,
    });
    return { geometry: geo, material: mat };
  }, [length, color, accent, spacing]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, y, -length / 2]}
      frustumCulled={false}
      renderOrder={-2}
    />
  );
}
