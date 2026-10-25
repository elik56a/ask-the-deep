import type * as Three from "three";
import {
  BED_MARKS,
  FLOOD,
  LEGACY_LIGHT,
  ROCKS,
  SEABED,
  VISIBLE_RANGE,
  WARM,
} from "#/constants/seaScene.constants";
import type { Kit } from "#/types/seaScene.types";
import { oscillate } from "#/utils/ease.utils";
import { sandHeight } from "#/utils/seabed.utils";
import { spreadAt } from "#/utils/spread.utils";
import { glowSprite } from "./glow";

function sand({ THREE, keep, color }: Kit): Three.Mesh {
  const geometry = keep(
    new THREE.PlaneGeometry(
      SEABED.width,
      SEABED.depth,
      SEABED.segmentsX,
      SEABED.segmentsZ,
    ),
  );
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, sandHeight(p.getX(i), p.getZ(i)));
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    keep(
      new THREE.MeshStandardMaterial({
        color: color("--color-sand"),
        flatShading: true,
        roughness: SEABED.roughness,
      }),
    ),
  );
}

function rocks({ THREE, keep, color }: Kit): Three.Mesh[] {
  const geometry = keep(new THREE.DodecahedronGeometry(1, ROCKS.detail));
  const material = keep(
    new THREE.MeshStandardMaterial({
      color: color("--color-rock"),
      flatShading: true,
      roughness: ROCKS.roughness,
    }),
  );
  return Array.from({ length: ROCKS.count }, (_, i) => {
    const rock = new THREE.Mesh(geometry, material);
    const s = spreadAt(ROCKS.scale, i, Math.random());
    rock.scale.set(
      s * spreadAt(ROCKS.stretchX, i, Math.random()),
      s * spreadAt(ROCKS.squashY, i, Math.random()),
      s,
    );
    rock.rotation.set(
      spreadAt(ROCKS.spin, i, Math.random()),
      spreadAt(ROCKS.spin, i, Math.random()),
      0,
    );
    rock.position.set(
      spreadAt(ROCKS.x, i, Math.random()),
      ROCKS.y,
      spreadAt(ROCKS.z, i, Math.random()),
    );
    return rock;
  });
}

/**
 * The sand, rocks and glowing marks, with a lander's floodlight as on real deep-sea dives,
 * so the seabed is seen and not guessed. Props are added to `bed` as they load.
 */
export function seabed(kit: Kit) {
  const { THREE, color } = kit;
  const bed = new THREE.Group();
  const flood = new THREE.SpotLight(
    FLOOD.color,
    0,
    FLOOD.distance,
    FLOOD.angle,
    FLOOD.penumbra,
    FLOOD.decay,
  );
  flood.position.set(...FLOOD.position);
  flood.target.position.set(...FLOOD.target);
  const warm = new THREE.PointLight(WARM.color, 0, WARM.distance, WARM.decay);
  warm.position.set(...WARM.position);
  bed.add(flood, flood.target, warm, sand(kit), ...rocks(kit));
  const glow = color("--color-glow");
  const coral = color("--color-coral");
  const marks = Array.from({ length: BED_MARKS.count }, (_, i) => {
    const mark = glowSprite(
      kit,
      i % BED_MARKS.coralEvery ? glow : coral,
      BED_MARKS.size,
      BED_MARKS.opacity,
    );
    mark.position.set(
      spreadAt(BED_MARKS.x, i, Math.random()),
      spreadAt(BED_MARKS.y, i, Math.random()),
      spreadAt(BED_MARKS.z, i, Math.random()),
    );
    bed.add(mark);
    return mark;
  });
  kit.scene.add(bed);
  return {
    bed,
    /** Landed (`landK` 1), the lights come up. Until the dive `placed` it, or far above it (`camY`), only the lights stay in the scene. */
    frame(t: number, landK: number, camY: number, placed: boolean): void {
      const near = placed && Math.abs(bed.position.y - camY) < VISIBLE_RANGE;
      // Every frame: the props join the bed when their models load, after it may have hidden.
      for (const child of bed.children) {
        if (!(child instanceof THREE.Light)) child.visible = near;
      }
      flood.intensity = (FLOOD.base + landK * FLOOD.landed) * LEGACY_LIGHT;
      warm.intensity = (WARM.base + landK * WARM.landed) * LEGACY_LIGHT;
      marks.forEach((mark, i) => {
        mark.material.opacity = oscillate(
          BED_MARKS.pulseBase,
          BED_MARKS.pulse,
          BED_MARKS.pulseRate,
          t,
          i,
        );
      });
    },
  };
}
