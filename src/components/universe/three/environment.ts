import * as THREE from "three";

/**
 * CARTE D'ENVIRONNEMENT PROCÉDURALE (PMREM)
 * -----------------------------------------
 * Aucun fichier HDR téléchargé (rien ne dépend d'un CDN) : un petit studio
 * est rendu une seule fois dans une cubemap pré-filtrée, ce qui donne de
 * vrais reflets métalliques pour un coût quasi nul au runtime.
 */

const GRADIENT_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRADIENT_FRAGMENT = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uHorizon;
  void main() {
    float h = vDir.y * 0.5 + 0.5;
    vec3 color = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));
    float band = pow(1.0 - abs(vDir.y), 8.0);
    color += uHorizon * band * 0.55;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface StudioEnvironment {
  texture: THREE.Texture;
  dispose: () => void;
}

/**
 * Construit l'environnement. À appeler une fois par canvas, puis `dispose()`
 * au démontage (ressource GPU explicite).
 */
export function createStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  accent = "#f0a05a",
): StudioEnvironment {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const scene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];

  const accentColor = new THREE.Color(accent);

  // Dôme de dégradé : graphite profond en bas, gris froid en haut.
  const domeGeometry = new THREE.SphereGeometry(12, 32, 20);
  const domeMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(0.09, 0.1, 0.13) },
      uBottom: { value: new THREE.Color(0.008, 0.009, 0.012) },
      uHorizon: { value: new THREE.Color(0.05, 0.055, 0.07) },
    },
    vertexShader: GRADIENT_VERTEX,
    fragmentShader: GRADIENT_FRAGMENT,
  });
  const dome = new THREE.Mesh(domeGeometry, domeMaterial);
  scene.add(dome);
  disposables.push(domeGeometry, domeMaterial);

  // Panneaux émissifs > 1 : hautes lumières nettes sur les métaux.
  const panel = (
    color: THREE.Color,
    intensity: number,
    width: number,
    height: number,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: color.clone().multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    scene.add(mesh);
    disposables.push(geometry, material);
  };

  // Key chaude (accent) en haut à droite, fill froid à gauche, rim derrière.
  panel(accentColor, 6.5, 5, 3, [6, 5, 3], [0, -Math.PI / 3, 0]);
  panel(new THREE.Color("#9fc6e8"), 2.4, 6, 4, [-7, 2, -1], [0, Math.PI / 2.6, 0]);
  panel(new THREE.Color("#ffffff"), 3.2, 4, 1.2, [0, -6, -4], [Math.PI / 2.4, 0, 0]);
  panel(accentColor, 1.6, 10, 0.35, [0, 1.6, -8], [0, 0, 0]);

  const target = pmrem.fromScene(scene, 0.035);

  disposables.forEach((item) => item.dispose());
  pmrem.dispose();

  return {
    texture: target.texture,
    dispose: () => {
      target.dispose();
    },
  };
}
