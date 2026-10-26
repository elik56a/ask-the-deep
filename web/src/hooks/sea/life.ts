import type * as Three from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { BED_PROPS, SEA_LIFE } from "#/constants/seaLife.constants";
import {
  ANIMATE_RANGE,
  BOAT,
  LEGACY_LIGHT,
  OTHER_DIVERS,
  SUB,
  VISIBLE_RANGE,
  WAVES,
} from "#/constants/seaScene.constants";
import type {
  Creature,
  Drift,
  DriftSpec,
  Height,
  Kit,
  LifeGroup,
  Loaded,
  PathSpec,
  Pool,
  SwimPath,
} from "#/types/seaScene.types";
import { metersToPx, worldY } from "#/utils/depth.utils";
import { oscillate } from "#/utils/ease.utils";
import { bedSlots, members } from "#/utils/seaLife.utils";
import { spreadAt } from "#/utils/spread.utils";
import { driftPose, loopPose, pathPose } from "#/utils/swim.utils";
import { waveAt } from "#/utils/wave.utils";
import { glowSprite } from "./glow";
import type { Spawner } from "./spawn";

const random = Math.random;

function heightAt(h: Height, i: number): number {
  return "meters" in h
    ? worldY(metersToPx(spreadAt(h.meters, i, random())))
    : spreadAt(h.y, i, random());
}

function pathOf(path: PathSpec, i: number): SwimPath {
  return {
    y: heightAt(path, i),
    r: spreadAt(path.r, i, random()),
    speed: spreadAt(path.speed, i, random()),
    phase: spreadAt(path.phase, i, random()),
    z: spreadAt(path.z, i, random()),
  };
}

function driftOf(drift: DriftSpec, i: number): Drift {
  return {
    x: spreadAt(drift.x, i, random()),
    y: heightAt(drift, i),
    z: spreadAt(drift.z, i, random()),
    phase: spreadAt(drift.phase, i, random()),
  };
}

/** A glowing lure on `c`; `light` too, on the first member only. */
function addLure(
  kit: Kit,
  c: Creature,
  lure: NonNullable<LifeGroup["lure"]>,
  i: number,
  light: Three.Light,
): void {
  const sprite = glowSprite(
    kit,
    kit.color("--color-glow"),
    spreadAt(lure.size, i, random()),
  );
  sprite.position.set(...lure.at);
  c.root.add(sprite);
  if (i > 0) return;
  light.position.set(...lure.at);
  c.root.add(light);
}

/** The swimmers and drifters among `loaded`, each with a glowing lure if it has one. */
export function placeLife(
  kit: Kit,
  spawn: Spawner,
  loaded: Loaded,
  lureLight: Three.Light,
): Creature[] {
  return members(SEA_LIFE).flatMap(({ group, i }) => {
    const gltf = loaded[group.model];
    if (!gltf) return [];
    const c = spawn(gltf, spreadAt(group.length, i, random()), group, i);
    if (group.path) c.path = pathOf(group.path, i);
    if (group.drift) c.drift = driftOf(group.drift, i);
    if (group.lure) addLure(kit, c, group.lure, i, lureLight);
    return [c];
  });
}

/** The props on the sand, added to the seabed group. */
export function placeBed(
  spawn: Spawner,
  loaded: Loaded,
  bed: Three.Group,
): Creature[] {
  return bedSlots(BED_PROPS).flatMap(({ prop, place, i }) => {
    const gltf = loaded[prop.model];
    if (!gltf) return [];
    const c = spawn(gltf, spreadAt(prop.length, i, random()), prop, i);
    const side = place.mirror && i % 2 === 0 ? -1 : 1;
    bed.add(c.root);
    c.root.position.set(
      side * spreadAt(place.x, i, random()),
      spreadAt(place.y, i, random()),
      spreadAt(place.z, i, random()),
    );
    c.root.rotation.y = spreadAt(place.ry, i, random());
    c.beside = place.beside;
    return [c];
  });
}

/**
 * The other divers' torches, in the scene from the start: a light joining later would recompile
 * every lit material. Off until their divers arrive.
 */
export function torchLights({ THREE, scene }: Kit): Three.PointLight[] {
  const { torch } = OTHER_DIVERS;
  return OTHER_DIVERS.at.map(() => {
    const light = new THREE.PointLight(
      torch.color,
      0,
      torch.distance,
      torch.decay,
    );
    scene.add(light);
    return light;
  });
}

/** Other divers on the way down, swimming flat with a torch each. */
export function placeOthers(
  kit: Kit,
  spawn: Spawner,
  diver: GLTF,
  length: number,
  torches: Three.PointLight[],
): Creature[] {
  const { torch, puff } = OTHER_DIVERS;
  return OTHER_DIVERS.at.map(({ x, y, z, speed }, i) => {
    const o = spawn(diver, length, {
      speed: OTHER_DIVERS.speed,
      rot: OTHER_DIVERS.rot,
    });
    const light = torches[i];
    light.intensity = torch.intensity * LEGACY_LIGHT;
    const beam = glowSprite(kit, torch.color, torch.beam, torch.beamOpacity);
    light.position.set(...torch.at);
    beam.position.set(...torch.at);
    o.root.add(light, beam);
    o.loop = { x, y, z, speed, phase: i * OTHER_DIVERS.phaseStep };
    o.puff = random() * puff.first;
    return o;
  });
}

/** Draws `c` only while it is within `VISIBLE_RANGE` of the camera's height `camY`. */
function showNear(c: Creature, y: number, camY: number): void {
  const on = Math.abs(y - camY) < VISIBLE_RANGE;
  if (c.meshes[0]?.visible === on) return;
  for (const mesh of c.meshes) mesh.visible = on;
}

/** Moves the swimmers and drifters; only those near the camera are drawn, and nearer still animate. */
export function swimLife(
  creatures: Creature[],
  t: number,
  dt: number,
  camY: number,
): void {
  for (const c of creatures) {
    const pose = c.path
      ? pathPose(c.path, t)
      : c.drift
        ? driftPose(c.drift, t)
        : null;
    if (pose) {
      c.root.position.set(pose.x, pose.y, pose.z);
      c.root.rotation.y = pose.ry;
    }
    showNear(c, c.root.position.y, camY);
    if (Math.abs(c.root.position.y - camY) < ANIMATE_RANGE) c.mixer.update(dt);
  }
}

/** The other divers loop and breathe out bubbles while near the camera. */
export function swimOthers(
  others: Creature[],
  t: number,
  dt: number,
  camY: number,
  bubbles: Pool | null,
  at: Three.Vector3,
): void {
  const { puff, range } = OTHER_DIVERS;
  for (const o of others) {
    if (!o.loop) continue;
    const pose = loopPose(o.loop, t);
    o.root.position.set(pose.x, pose.y, pose.z);
    o.root.rotation.y = pose.ry;
    showNear(o, pose.y, camY);
    if (Math.abs(o.loop.y - camY) >= range) continue;
    o.mixer.update(dt);
    o.puff = (o.puff ?? 0) - dt;
    if (o.puff < 0 && bubbles) {
      o.puff = puff.every + random() * puff.jitter;
      bubbles.emit(
        puff.count,
        at.copy(o.root.position).setY(pose.y + puff.dy),
        puff.spread,
        puff.rise,
        puff.sideways,
      );
    }
  }
}

/** The dive boat, riding the swell. */
export function boatRig(kit: Kit) {
  const boat = new kit.THREE.Group();
  boat.position.set(...BOAT.position);
  boat.rotation.y = BOAT.heading;
  kit.scene.add(boat);
  return {
    place(spawn: Spawner, gltf: GLTF): void {
      const b = spawn(gltf, BOAT.length, { ground: true });
      boat.add(b.root);
      b.root.position.y = BOAT.sink;
    },
    frame(t: number, camY: number, under: boolean): void {
      boat.visible = !under || camY > BOAT.hideBelow;
      // The chat sits at the inline start, so in RTL the boat moves to the other side of it.
      const side = document.documentElement.dir === "rtl" ? -1 : 1;
      boat.position.x = BOAT.position[0] * side;
      boat.rotation.y = BOAT.heading * side;
      const swell = waveAt(WAVES, boat.position.x, boat.position.z, t);
      boat.position.y = swell.h * BOAT.bob + BOAT.draft;
      boat.rotation.x = Math.atan(swell.dz) * BOAT.tilt;
      boat.rotation.z = -Math.atan(swell.dx) * BOAT.tilt;
    },
  };
}

/** The research sub in the midnight zone, lit before its model arrives. */
export function subRig(kit: Kit) {
  const { THREE } = kit;
  const sub = new THREE.Group();
  const lit = [SUB.nose, SUB.top].map(
    ({ color, intensity, distance, decay, at }) => {
      const light = new THREE.PointLight(
        color,
        intensity * LEGACY_LIGHT,
        distance,
        decay,
      );
      light.position.fromArray(at);
      return light;
    },
  );
  const beam = glowSprite(kit, SUB.nose.color, SUB.beam.size, SUB.beam.opacity);
  beam.position.set(...SUB.beam.at);
  sub.add(...lit, beam);
  sub.position.set(0, worldY(metersToPx(SUB.meters)), SUB.z);
  kit.scene.add(sub);
  let model: Creature | null = null;
  return {
    place(spawn: Spawner, gltf: GLTF): void {
      model = spawn(gltf, SUB.length, { rot: SUB.rot });
      sub.add(model.root);
    },
    frame(t: number, camY: number): void {
      if (model) showNear(model, sub.position.y, camY);
      sub.position.x = oscillate(0, SUB.swing, SUB.swingRate, t);
      sub.rotation.y = Math.cos(t * SUB.swingRate) > 0 ? 0 : Math.PI;
    },
  };
}
