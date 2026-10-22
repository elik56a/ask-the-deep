import type * as Three from "three";
import {
  DIVER,
  DIVER_LAMP,
  LEGACY_LIGHT,
} from "#/constants/seaScene.constants";
import type { Creature, Kit } from "#/types/seaScene.types";
import { diverPose } from "#/utils/diver.utils";

interface DiverView {
  camY: number;
  t: number;
  dt: number;
  camera: Three.PerspectiveCamera;
  landK: number;
}

/** The diver: upright on the surface, head down underwater, and beside the chat once landed. */
export function diverRig({ THREE, scene }: Kit) {
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
  const lampOffset = new THREE.Vector3(...DIVER_LAMP.offset);
  // A soft lamp follows the diver underwater, so the suit reads against the dark water.
  const lamp = new THREE.PointLight(
    DIVER_LAMP.color,
    0,
    DIVER_LAMP.distance,
    0,
  );
  scene.add(lamp);
  let diver: Creature | null = null;
  return {
    set(creature: Creature): void {
      diver = creature;
    },
    frame({ camY, t, dt, camera, landK }: DiverView): void {
      if (!diver) return;
      const side = document.documentElement.dir === "rtl" ? -1 : 1;
      const pose = diverPose({
        camY,
        t,
        aspect: camera.aspect,
        fov: camera.fov,
        side,
        landK,
      });
      diver.root.position.set(pose.x, pose.y, pose.z);
      diver.root.quaternion.slerpQuaternions(restQ, diveQ, pose.ease);
      if (pose.hover > 0) {
        hoverQ.setFromEuler(
          hoverAt.set(DIVER.hoverPitch, DIVER.hoverTurn * side, 0),
        );
        diver.root.quaternion.slerp(hoverQ, pose.hover);
      }
      lamp.position.copy(diver.root.position).add(lampOffset);
      lamp.intensity =
        DIVER_LAMP.intensity * DIVER_LAMP.falloff * pose.ease * LEGACY_LIGHT;
      if (diver.action) diver.action.timeScale = 1 + pose.ease * DIVER.kick;
      diver.mixer.update(dt);
    },
  };
}
