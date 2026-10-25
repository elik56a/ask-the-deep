import type * as Three from "three";
import {
  DIVER,
  DIVER_LAMP,
  LEGACY_LIGHT,
  STRIDE,
} from "#/constants/seaScene.constants";
import type { Creature, Kit, StridePose } from "#/types/seaScene.types";
import {
  diverPose,
  heroPose,
  strideEntryS,
  stridePose,
} from "#/utils/diver.utils";
import { approach } from "#/utils/ease.utils";

interface DiverView {
  camY: number;
  t: number;
  dt: number;
  camera: Three.PerspectiveCamera;
  landK: number;
  quiet: boolean;
}

interface StrideEffects {
  /** The head breaks the water here. */
  entry: (at: Three.Vector3) => void;
  /** Bubbles from the diver while he slides under. */
  trail: (at: Three.Vector3) => void;
}

/**
 * The diver: upright on the surface, head down underwater, and beside the chat once landed.
 * Before a dive he swims up close (`ready`) and takes a giant stride (`jump`); the dive starts as
 * his head goes under, and he hands over to the head-down pose as the camera follows him down.
 */
export function diverRig({ THREE, scene }: Kit, effects: StrideEffects) {
  const restQ = new THREE.Quaternion();
  const up = new THREE.Vector3(...DIVER.diveUp).normalize();
  const forward = new THREE.Vector3(0, 0, 1);
  const diveQ = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(
      new THREE.Vector3().crossVectors(up, forward),
      up,
      forward,
    ),
  );
  const hoverQ = new THREE.Quaternion();
  const hoverAt = new THREE.Euler();
  const baseQ = new THREE.Quaternion();
  const strideQ = new THREE.Quaternion();
  // Heading first, then pitching head first about the body's own side axis.
  const strideAt = new THREE.Euler(0, 0, 0, "YXZ");
  const base = new THREE.Vector3();
  const place = new THREE.Vector3();
  const head = new THREE.Vector3();
  const lampOffset = new THREE.Vector3(...DIVER_LAMP.offset);
  // A soft lamp follows the diver underwater, so the suit reads against the dark water.
  const lamp = new THREE.PointLight(
    DIVER_LAMP.color,
    0,
    DIVER_LAMP.distance,
    DIVER_LAMP.decay,
  );
  scene.add(lamp);
  let diver: Creature | null = null;
  let readyOn = false;
  let readyK = 0;
  let hero: StridePose | null = null;
  let jumpT: number | null = null;
  let onEntry: (() => void) | null = null;
  let trailIn = 0;

  const turn = (pose: StridePose) =>
    strideQ.setFromEuler(strideAt.set(pose.pitch, pose.yaw, 0));

  return {
    set(creature: Creature): void {
      diver = creature;
    },
    ready(on: boolean): void {
      readyOn = on;
    },
    /** Leaps in, calling `entered` as the head goes under; at once without the diver or motion. */
    jump(entered: () => void, quiet: boolean): void {
      let done = false;
      const once = () => {
        if (done) return;
        done = true;
        entered();
      };
      if (!diver || !hero || quiet) {
        once();
        return;
      }
      jumpT = 0;
      onEntry = once;
      trailIn = 0;
      // Frames stop in a hidden tab and crawl in a software renderer; the dive starts on time anyway.
      setTimeout(once, strideEntryS() * 1000 + STRIDE.entryGraceMs);
    },
    /** 0 to 1: how far the camera has come down to meet the diver. */
    close(): number {
      return readyK;
    },
    frame({ camY, t, dt, camera, landK, quiet }: DiverView): void {
      if (!diver) return;
      const side = document.documentElement.dir === "rtl" ? -1 : 1;
      const view = { t, aspect: camera.aspect, fov: camera.fov, side };
      const pose = diverPose({ ...view, camY, landK });
      base.set(pose.x, pose.y, pose.z);
      baseQ.slerpQuaternions(restQ, diveQ, pose.ease);
      if (pose.hover > 0) {
        hoverQ.setFromEuler(
          hoverAt.set(DIVER.hoverPitch, DIVER.hoverTurn * side, 0),
        );
        baseQ.slerp(hoverQ, pose.hover);
      }
      const root = diver.root;
      if (jumpT !== null && hero) {
        jumpT += dt;
        const s = stridePose(jumpT, hero, side);
        place.set(s.x, s.y, s.z);
        turn(s);
        if (onEntry && jumpT >= strideEntryS()) {
          head
            .set(0, DIVER.length / 2, 0)
            .applyQuaternion(strideQ)
            .add(place);
          head.y = 0;
          effects.entry(head);
          const entered = onEntry;
          onEntry = null;
          entered();
        }
        trailIn -= dt;
        if (!onEntry && trailIn <= 0) {
          trailIn = STRIDE.trailEvery;
          effects.trail(place);
        }
        // The camera following him down hands him over to the dive's head-down pose.
        root.position.lerpVectors(place, base, pose.ease);
        root.quaternion.slerpQuaternions(strideQ, baseQ, pose.ease);
        if (pose.ease > 0.999) {
          jumpT = null;
          hero = null;
          readyK = 0;
        }
      } else {
        readyK = quiet
          ? Number(readyOn)
          : approach(readyK, readyOn ? 1 : 0, STRIDE.readyRate, dt);
        hero = readyK > 0 ? heroPose(view) : null;
        if (hero) {
          root.position.lerpVectors(
            base,
            place.set(hero.x, hero.y, hero.z),
            readyK,
          );
          root.quaternion.slerpQuaternions(baseQ, turn(hero), readyK);
        } else {
          root.position.copy(base);
          root.quaternion.copy(baseQ);
        }
      }
      lamp.position.copy(root.position).add(lampOffset);
      lamp.intensity = DIVER_LAMP.intensity * pose.ease * LEGACY_LIGHT;
      const kick = jumpT !== null ? 1 : pose.ease;
      if (diver.action) diver.action.timeScale = 1 + kick * DIVER.kick;
      diver.mixer.update(dt);
    },
  };
}
