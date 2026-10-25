import {
  GATE,
  LANTERNS,
  SONAR,
  SPLASH_RINGS,
} from "#/constants/seaScene.constants";
import type { LanternFrame, RingFrame } from "#/types/seaScene.types";
import { easeOutCubic } from "#/utils/ease.utils";

/** A sonar ring `age` seconds after its ping: growing and fading out. */
export function ringFrame(age: number): RingFrame {
  const k = age / SONAR.life;
  return {
    visible: k < 1,
    scale: SONAR.startScale + k * SONAR.growth,
    opacity: Math.max(1 - k, 0) * SONAR.opacity,
  };
}

/** A foam ring `age` seconds after the diver went in: spreading fast, then slowing and thinning. */
export function foamRingFrame(age: number): RingFrame {
  const k = age / SPLASH_RINGS.lifeS;
  if (age < 0 || k >= 1) return { visible: false, scale: 0, opacity: 0 };
  const r = SPLASH_RINGS;
  return {
    visible: true,
    scale: r.from + (r.to - r.from) * easeOutCubic(k),
    opacity: (1 - k) ** 2 * r.opacity,
  };
}

/** The score gate fades in, holds, then fades out. */
export function gateOpacity(age: number): number {
  if (age >= GATE.life) return 0;
  const fadeIn = Math.min(age * GATE.fadeInRate, 1);
  const fadeOut = 1 - Math.max(age - GATE.fadeOutFrom, 0) / GATE.fadeOut;
  return fadeIn * GATE.opacity * fadeOut;
}

/** A passage's lantern: above the gate it rises and flickers, below it sinks and dims. */
export function lanternFrame(
  age: number,
  t: number,
  index: number,
  up: boolean,
): LanternFrame {
  if (age > LANTERNS.life) return { dy: 0, dz: 0, opacity: 0 };
  const ease = easeOutCubic(age / LANTERNS.rise);
  const fade =
    Math.min(age * LANTERNS.fadeIn, 1) *
    Math.min((LANTERNS.life - age) / LANTERNS.fadeOut, 1);
  if (up) {
    return {
      dy: Math.sin(t * LANTERNS.bobRate + index) * LANTERNS.bob,
      dz: ease * LANTERNS.forward,
      opacity:
        fade *
        (LANTERNS.glow +
          Math.sin(t * LANTERNS.flickerRate + index) * LANTERNS.flicker),
    };
  }
  return {
    dy: -ease * LANTERNS.sink,
    dz: 0,
    opacity: fade * (LANTERNS.dimFrom - ease * LANTERNS.dimBy),
  };
}
