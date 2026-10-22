import * as THREE from "three";

/**
 * TEXTURES D'ÉCRAN PROCÉDURALES
 * -----------------------------
 * Les scènes « interface » et « device » affichent une interface dessinée au
 * pinceau (CanvasTexture) : aucune image externe, aucun texte 3D (la
 * typographie reste dans le DOM, nette et accessible).
 *
 * Si le projet possède une capture réelle (projets issus de l'administration),
 * elle est chargée puis dessinée dans le même canvas.
 */

const W = 1024;
const H = 640;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawProceduralUi(
  ctx: CanvasRenderingContext2D,
  options: { title: string; accent: string; variant: number },
) {
  const { title, accent, variant } = options;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0d12");
  bg.addColorStop(0.55, "#0e1117");
  bg.addColorStop(1, "#07080c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Halo d'accent discret
  const glow = ctx.createRadialGradient(W * 0.78, H * 0.18, 10, W * 0.78, H * 0.18, 420);
  glow.addColorStop(0, `${accent}44`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Barre de fenêtre
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(0, 56, W, 1);
  ["#f0605a", "#f0c05a", "#6dd07a"].forEach((dot, i) => {
    ctx.beginPath();
    ctx.fillStyle = dot;
    ctx.globalAlpha = 0.55;
    ctx.arc(28 + i * 22, 28, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, W / 2 - 170, 14, 340, 28, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "500 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(title.slice(0, 34).toLowerCase().replace(/\s+/g, "-"), W / 2, 33);

  // Colonne latérale
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 57, 210, H - 57);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(210, 57, 1, H - 57);
  for (let i = 0; i < 7; i++) {
    const y = 96 + i * 46;
    ctx.fillStyle = i === 1 ? `${accent}33` : "transparent";
    roundRect(ctx, 18, y - 14, 176, 30, 8);
    ctx.fill();
    ctx.fillStyle = i === 1 ? accent : "rgba(255,255,255,0.18)";
    roundRect(ctx, 32, y - 4, 10, 10, 3);
    ctx.fill();
    ctx.fillStyle = i === 1 ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.24)";
    roundRect(ctx, 54, y - 3, 70 + ((i * 37) % 60), 8, 4);
    ctx.fill();
  }

  // Zone principale : titre + bloc de contenu
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 34px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(title.slice(0, 22), 250, 128);
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.font = "400 17px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Aperçu généré — contenu de démonstration", 250, 158);

  // Cartes de statistiques
  for (let i = 0; i < 3; i++) {
    const x = 250 + i * 190;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, x, 192, 172, 96, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, 192, 172, 96, 12);
    ctx.stroke();
    ctx.fillStyle = i === 0 ? accent : "rgba(255,255,255,0.55)";
    ctx.font = "600 30px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(["60", "1.2", "98"][i], x + 20, 244);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "500 13px ui-monospace, monospace";
    ctx.fillText(["FPS", "LCP", "SCORE"][i], x + 20, 268);
  }

  // Graphique : histogramme ou courbe selon la variante
  const chartTop = 322;
  const chartH = 220;
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  roundRect(ctx, 250, chartTop, 730, chartH + 40, 12);
  ctx.fill();

  if (variant % 2 === 0) {
    const bars = 22;
    for (let i = 0; i < bars; i++) {
      const h =
        40 + Math.abs(Math.sin(i * 0.7 + variant) * 130) + (i % 5) * 9;
      const x = 274 + i * 32;
      const grad = ctx.createLinearGradient(0, chartTop + chartH - h, 0, chartTop + chartH);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, `${accent}22`);
      ctx.fillStyle = i === bars - 3 ? accent : grad;
      ctx.globalAlpha = i === bars - 3 ? 0.95 : 0.55;
      roundRect(ctx, x, chartTop + chartH - h, 18, h, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accent;
    for (let i = 0; i <= 60; i++) {
      const x = 274 + (i / 60) * 680;
      const y =
        chartTop +
        chartH -
        (60 +
          Math.sin(i * 0.22 + variant) * 46 +
          Math.sin(i * 0.07) * 60 +
          i * 0.9);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.16;
    ctx.lineTo(954, chartTop + chartH);
    ctx.lineTo(274, chartTop + chartH);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Lignes de grille fines
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = chartTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(274, y);
    ctx.lineTo(954, y);
    ctx.stroke();
  }
}

export interface ScreenTextureOptions {
  title: string;
  accent: string;
  variant: number;
  /** Capture réelle (projets CMS) dessinée à la place de l'UI générée. */
  image?: string | null;
}

/** Crée la texture (synchrone) puis charge la capture réelle si fournie. */
export function createScreenTexture(options: ScreenTextureOptions): {
  texture: THREE.CanvasTexture;
  dispose: () => void;
} {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) drawProceduralUi(ctx, options);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  let cancelled = false;
  let objectUrl: string | null = null;

  if (options.image) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled || !ctx) return;
      // Fond sombre puis capture cadrée en « contain ».
      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, W, H);
      const scale = Math.min(W / img.width, H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      texture.needsUpdate = true;
    };
    img.onerror = () => {
      // Capture indisponible : l'interface générée reste affichée.
    };
    img.src = options.image;
    objectUrl = null;
  }

  return {
    texture,
    dispose: () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      texture.dispose();
    },
  };
}
