import type * as Three from "three";
import { GLOW_TEXTURE } from "#/constants/seaScene.constants";
import type { Keep, Kit, ThreeModule } from "#/types/seaScene.types";

/** A soft round glow, shared by every sprite and particle. */
export function glowTexture(THREE: ThreeModule, keep: Keep): Three.Texture {
  const { size, stops } = GLOW_TEXTURE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g) {
    const r = size / 2;
    const gradient = g.createRadialGradient(r, r, 0, r, r, r);
    for (const [at, color] of stops) gradient.addColorStop(at, color);
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
  }
  return keep(new THREE.CanvasTexture(canvas));
}

export function glowSprite(
  { THREE, keep, glow }: Kit,
  color: Three.ColorRepresentation,
  size: number,
  opacity = 1,
): Three.Sprite {
  const sprite = new THREE.Sprite(
    keep(
      new THREE.SpriteMaterial({
        map: glow,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  sprite.scale.set(size, size, 1);
  return sprite;
}
