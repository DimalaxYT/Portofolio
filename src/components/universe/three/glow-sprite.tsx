"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * HALO VOLUMÉTRIQUE
 * Un sprite additif (dégradé radial généré localement) qui simule une lumière
 * dans l'atmosphère. Toujours face caméra, coût négligeable, et c'est ce qui
 * donne l'impression de volume autour des sources lumineuses.
 *
 * La texture appartient à l'instance et est libérée avec elle : aucun compteur
 * global muté pendant le rendu (le double-rendu StrictMode le ferait dériver).
 */

function createGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,255,255,0.62)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0.2)");
    gradient.addColorStop(0.72, "rgba(255,255,255,0.045)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function GlowSprite({
  size = 7,
  color = "#f0a05a",
  opacity = 0.55,
  position = [0, 0, 0] as [number, number, number],
}: {
  size?: number;
  color?: string;
  opacity?: number;
  position?: [number, number, number];
}) {
  const texture = useMemo(() => createGlowTexture(), []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[size, size, 1]} renderOrder={3}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}
