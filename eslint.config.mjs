import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: ["node_modules/**", ".next/**", "next-env.d.ts", "coverage/**"] },
  {
    rules: {
      // Text is French prose. Images may be remote URLs entered by the admin;
      // optimized local media use next/image separately.
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      // Existing Radix form synchronization is intentional and tested. Keep the
      // correctness rules (dependencies, purity, rules-of-hooks) enabled.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // WebGL layer only (three.js / React Three Fiber). The React Compiler
    // rules below assume plain immutable data, which does not hold here:
    //  - geometries, materials and textures are mutable GPU resources built
    //    once inside useMemo and explicitly disposed on unmount;
    //  - Math.random() seeds a particle distribution once, not per render;
    //  - R3F hands out the scene/camera objects precisely so useFrame can
    //    mutate them in place (position, fov, fog) without re-rendering.
    // The DOM components of the experience stay fully strict.
    files: [
      "src/components/universe/three/**/*.{ts,tsx}",
      "src/components/universe/scenes/**/*.{ts,tsx}",
      "src/components/universe/universe-canvas.tsx",
    ],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
