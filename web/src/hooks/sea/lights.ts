import type * as Three from "three";
import {
  AMBIENT_KEYS,
  SUNLIGHT_KEYS,
  TORCH_KEYS,
} from "#/constants/sea.constants";
import {
  HEMI,
  LAMP,
  LEGACY_LIGHT,
  SUN_LIGHT,
  TORCH,
} from "#/constants/seaScene.constants";
import type { Kit } from "#/types/seaScene.types";
import { keyframe } from "#/utils/depth.utils";

interface LightState {
  zone: number;
  under: boolean;
  /** The stream's lamp, 0 to 1. */
  lamp: number;
}

/** Sky and sun light, and the camera's lamp and torch for the dark water. */
export function lights({ THREE, color, scene }: Kit, camera: Three.Camera) {
  const surfaceSky = new THREE.Color(HEMI.sky);
  const deepSky = new THREE.Color(HEMI.deepSky);
  const hemi = new THREE.HemisphereLight(surfaceSky, color("--color-ink"), 0);
  const sun = new THREE.DirectionalLight(SUN_LIGHT.color, 0);
  sun.position.set(...SUN_LIGHT.position);
  scene.add(hemi, sun);
  const lamp = new THREE.PointLight(color("--color-foam"), 0, LAMP.distance, 0);
  lamp.position.set(...LAMP.position);
  const torch = new THREE.SpotLight(
    TORCH.color,
    0,
    TORCH.distance,
    TORCH.angle,
    TORCH.penumbra,
    0,
  );
  torch.position.set(...TORCH.position);
  torch.target.position.set(...TORCH.target);
  camera.add(lamp, torch, torch.target);
  return {
    frame({ zone, under, lamp: level }: LightState): void {
      hemi.intensity =
        (under ? keyframe(zone, AMBIENT_KEYS) : HEMI.surface) * LEGACY_LIGHT;
      hemi.color.copy(under && zone > HEMI.deepZone ? deepSky : surfaceSky);
      sun.intensity =
        (under ? keyframe(zone, SUNLIGHT_KEYS) : SUN_LIGHT.surface) *
        LEGACY_LIGHT;
      lamp.intensity =
        ((zone > LAMP.deepZone ? LAMP.deep : 0) + level * LAMP.on) *
        LEGACY_LIGHT;
      torch.intensity =
        keyframe(zone, TORCH_KEYS) * TORCH.falloff * LEGACY_LIGHT;
    },
  };
}
