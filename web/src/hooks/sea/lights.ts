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
  /** 0 above the water to 1 below it: the light changes over a band, not at a line. */
  wet: number;
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
  const lamp = new THREE.PointLight(
    color("--color-foam"),
    0,
    LAMP.distance,
    LAMP.decay,
  );
  lamp.position.set(...LAMP.position);
  const torch = new THREE.SpotLight(
    TORCH.color,
    0,
    TORCH.distance,
    TORCH.angle,
    TORCH.penumbra,
    TORCH.decay,
  );
  torch.position.set(...TORCH.position);
  torch.target.position.set(...TORCH.target);
  camera.add(lamp, torch, torch.target);
  return {
    frame({ zone, under, wet, lamp: level }: LightState): void {
      const blend = (surface: number, below: number) =>
        (surface + (below - surface) * wet) * LEGACY_LIGHT;
      hemi.intensity = blend(HEMI.surface, keyframe(zone, AMBIENT_KEYS));
      hemi.color.copy(under && zone > HEMI.deepZone ? deepSky : surfaceSky);
      sun.intensity = blend(SUN_LIGHT.surface, keyframe(zone, SUNLIGHT_KEYS));
      lamp.intensity =
        ((zone > LAMP.deepZone ? LAMP.deep : 0) + level * LAMP.on) *
        LEGACY_LIGHT;
      torch.intensity = keyframe(zone, TORCH_KEYS) * LEGACY_LIGHT;
    },
  };
}
