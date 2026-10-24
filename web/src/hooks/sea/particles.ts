import type * as Three from "three";
import { PARTICLE_FIELD, SNOW, SPECKS } from "#/constants/seaScene.constants";
import type { Kit } from "#/types/seaScene.types";
import { oscillate } from "#/utils/ease.utils";

interface Field {
  count: number;
  from: number;
  to: number;
  size: number;
}

function field(
  { THREE, keep, glow, scene }: Kit,
  { count, from, to, size }: Field,
  colors: Three.Color[],
  glowing: boolean,
): Three.Points<Three.BufferGeometry, Three.PointsMaterial> {
  const position = new Float32Array(count * 3);
  const tint = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    position.set(
      [
        (Math.random() - 0.5) * PARTICLE_FIELD.width,
        from + Math.random() * (to - from),
        PARTICLE_FIELD.zFrom - Math.random() * PARTICLE_FIELD.depth,
      ],
      i * 3,
    );
    const c = colors[i % colors.length];
    tint.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(tint, 3));
  const points = new THREE.Points(
    geometry,
    keep(
      new THREE.PointsMaterial({
        size,
        map: glow,
        vertexColors: true,
        transparent: true,
        opacity: glowing
          ? PARTICLE_FIELD.opacity.glow
          : PARTICLE_FIELD.opacity.plain,
        depthWrite: false,
        blending: glowing ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    ),
  );
  scene.add(points);
  return points;
}

/** Marine snow drifting in the water, and glowing specks deeper down. */
export function particles(kit: Kit) {
  const { color } = kit;
  const snow = field(
    kit,
    SNOW,
    [color("--color-foam"), color("--color-shaft")],
    false,
  );
  const glow = color("--color-glow");
  const specks = field(
    kit,
    SPECKS,
    [glow, color("--color-peri"), glow, color("--color-coral")],
    true,
  );
  const f = PARTICLE_FIELD;
  return {
    frame(t: number): void {
      snow.position.set(
        oscillate(0, f.driftX, f.driftXRate, t),
        oscillate(0, f.driftY, f.driftYRate, t),
        0,
      );
      specks.material.opacity = oscillate(
        f.twinkleBase,
        f.twinkle,
        f.twinkleRate,
        t,
      );
    },
  };
}
