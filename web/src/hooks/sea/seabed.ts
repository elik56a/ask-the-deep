import type * as Three from "three";
import {
  BED_MARKS,
  FLOOD,
  LEGACY_LIGHT,
  ROCKS,
  SEABED,
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
    0,
  );
  flood.position.set(...FLOOD.position);
  flood.target.position.set(...FLOOD.target);
  const warm = new THREE.PointLight(WARM.color, 0, WARM.distance, 0);
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
    /** Landed (`landK` 1), the lights come up. */
    frame(t: number, landK: number): void {
      flood.intensity =
        (FLOOD.base + landK * FLOOD.landed) * FLOOD.falloff * LEGACY_LIGHT;
      warm.intensity =
        (WARM.base + landK * WARM.landed) * WARM.falloff * LEGACY_LIGHT;
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
