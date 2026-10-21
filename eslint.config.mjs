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
];

export default config;
