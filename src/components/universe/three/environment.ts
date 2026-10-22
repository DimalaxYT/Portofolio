import * as THREE from "three";

/**
 * CARTE D'ENVIRONNEMENT PROCÉDURALE (PMREM)
 * -----------------------------------------
 * Point critique de l'identité visuelle : les matériaux de l'expérience sont
 * des métaux (`metalness: 1`). Un métal ne renvoie **aucune** lumière diffuse :
 * sa couleur visible EST le reflet de son environnement. Un studio sombre
 * donne donc des objets noirs — d'où un studio volontairement très lumineux,
 * en HDR (valeurs > 1), rendu une seule fois dans une cubemap pré-filtrée.
 *
 * Aucun fichier HDR téléchargé : tout est généré ici, hors ligne.
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
    float band = pow(1.0 - abs(vDir.y), 6.0);
    color += uHorizon * band;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface StudioEnvironment {
  texture: THREE.Texture;
  dispose: () => void;
}

/**
 * Construit le studio. À appeler une fois par canvas, puis `dispose()` au
 * démontage (ressource GPU explicite).
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

  /* Dôme : gris froid lisible en haut, noir profond en bas, liseré d'accent
     à l'horizon. Assez clair pour que le métal ait quelque chose à refléter. */
  const domeGeometry = new THREE.SphereGeometry(14, 48, 32);
  const domeMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(0.34, 0.37, 0.45) },
      uBottom: { value: new THREE.Color(0.012, 0.014, 0.02) },
      uHorizon: { value: new THREE.Color(0.16, 0.13, 0.11) },
    },
    vertexShader: GRADIENT_VERTEX,
    fragmentShader: GRADIENT_FRAGMENT,
  });
  scene.add(new THREE.Mesh(domeGeometry, domeMaterial));
  disposables.push(domeGeometry, domeMaterial);

  /**
   * Panneau émissif. `intensity` > 1 : la cubemap PMREM est en demi-flottant,
   * les hautes lumières survivent et produisent des reflets nets sur le métal.
   */
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
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    scene.add(mesh);
    disposables.push(geometry, material);
  };

  const white = new THREE.Color("#ffffff");
  const cool = new THREE.Color("#bcd6f2");

  /* Key light : très large softbox au-dessus, légèrement en arrière.
     C'est elle qui donne le large reflet brillant sur les faces supérieures. */
  panel(white, 26, 15, 11, [0, 8.5, -3.5], [Math.PI / 2.35, 0, 0]);

  /* Rim chaud à droite : dessine le contour et chauffe le métal. */
  panel(accentColor, 34, 4.5, 12, [9, 2, -2], [0, -Math.PI / 2.4, 0]);

  /* Rim froid à gauche : sépare l'objet du fond, évite l'effet « tout cuivre ». */
  panel(cool, 20, 4.5, 12, [-9, 2.5, -1], [0, Math.PI / 2.4, 0]);

  /* Bandeau d'accent face caméra : reflet fin et très brillant, presque une
     arête de lumière sur les surfaces polies. */
  panel(accentColor, 48, 13, 0.7, [0, 2.6, 10], [0, Math.PI, 0]);

  /* Second bandeau, plus bas et plus froid, pour un reflet double. */
  panel(cool, 16, 11, 0.5, [0, -1.6, 10], [0, Math.PI, 0]);

  /* Rebond au sol : débouche les dessous sans les rendre laiteux. */
  panel(new THREE.Color("#8a7461"), 5.5, 14, 14, [0, -8, 0], [-Math.PI / 2, 0, 0]);

  const target = pmrem.fromScene(scene, 0.02);

  disposables.forEach((item) => item.dispose());
  pmrem.dispose();

  return {
    texture: target.texture,
    dispose: () => {
      target.dispose();
    },
  };
}
