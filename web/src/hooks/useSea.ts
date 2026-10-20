import { type RefObject, useEffect, useRef } from "react";
import type * as Three from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { MODEL_URL } from "#/constants/models.constants";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import {
  AMBIENT_KEYS,
  FOG_KEYS,
  SEA_MAX_PIXEL_RATIO,
  SHAFT_KEYS,
  SUNLIGHT_KEYS,
  WATER_KEYS,
  WORLD_PER_ZONE,
  ZONE_PX,
} from "#/constants/sea.constants";
import type { ModelId } from "#/types/models.types";
import type { SeaControls } from "#/types/sea.types";
import {
  diveOffset,
  keyframe,
  metersToPx,
  smoothstep,
  zoneLabel,
} from "#/utils/depth.utils";

type ThreeModule = typeof Three;
type Keep = <T extends { dispose: () => void }>(item: T) => T;

interface Addons {
  THREE: ThreeModule;
  loader: GLTFLoader;
  clone: typeof SkeletonUtils.clone;
}

interface Sea {
  controls: SeaControls;
  dispose: () => void;
}

interface Creature {
  root: Three.Group;
  mixer: Three.AnimationMixer;
  action: Three.AnimationAction | null;
  path?: { y: number; r: number; speed: number; phase: number; z: number };
  drift?: { x: number; y: number; z: number; phase: number };
}

interface Pool {
  emit: (
    count: number,
    at: Three.Vector3,
    spread: number,
    rise: number,
    sideways: number,
  ) => void;
  step: (dt: number, gravity: number) => void;
  clear: () => void;
}

// three r155+ dropped the PI factor of legacy lights; the scene was tuned with it.
const LEGACY_LIGHT = Math.PI;
const SURFACE_Y = 2.4;
const WATERLINE_Y = -4;
const SUN_DIRECTION: [number, number, number] = [0.22, 0.12, -1];
const MODEL_IDS: ModelId[] = ["diver", "sardines", "fish", "jelly", "angler"];

function token(element: Element, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

// Px of the water column at the diver line; negative while still above the water.
function divePx(water: HTMLElement | null): number {
  const top = water
    ? water.getBoundingClientRect().top + scrollY
    : Number.POSITIVE_INFINITY;
  return diveOffset(scrollY, top, innerHeight);
}

const worldY = (px: number) => WATERLINE_Y - (px / ZONE_PX) * WORLD_PER_ZONE;

function glowTexture(THREE: ThreeModule, keep: Keep): Three.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.25, "rgba(255,255,255,.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  return keep(new THREE.CanvasTexture(canvas));
}

function skyDome(
  THREE: ThreeModule,
  keep: Keep,
  color: (name: string) => Three.Color,
  sun: Three.Vector3,
): Three.Mesh {
  return new THREE.Mesh(
    keep(new THREE.SphereGeometry(600, 32, 16)),
    keep(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uSun: { value: sun },
          uTop: { value: color("--color-sky") },
          uLow: { value: color("--color-haze") },
          uSunCol: { value: color("--color-sun") },
        },
        vertexShader:
          "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform vec3 uSun, uTop, uLow, uSunCol; varying vec3 vDir;
          void main(){ vec3 d = normalize(vDir); float h = clamp(d.y * 2.4, 0.0, 1.0); vec3 c = mix(uLow, uTop, pow(h, 0.55));
            float sd = max(dot(d, uSun), 0.0); c += uSunCol * pow(sd, 18.0) * 0.5; c = mix(c, uSunCol, smoothstep(0.9986, 0.9992, sd));
            gl_FragColor = vec4(c, 1.0); }`,
      }),
    ),
  );
}

// Facets come from screen-space derivatives, so the swell reads flat-shaded.
function ocean(
  THREE: ThreeModule,
  keep: Keep,
  color: (name: string) => Three.Color,
  sun: Three.Vector3,
  time: { value: number },
): Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> {
  const geometry = keep(new THREE.PlaneGeometry(600, 600, 130, 130));
  geometry.rotateX(-Math.PI / 2);
  const material = keep(
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uTime: time,
        uSun: { value: sun },
        uDeep: { value: color("--color-swell-deep") },
        uShallow: { value: color("--color-swell") },
        uHaze: { value: color("--color-haze") },
        uSunCol: { value: color("--color-sun") },
        uUnder: { value: color("--color-water-0") },
      },
      vertexShader: `uniform float uTime; varying vec3 vW;
        float wave(vec2 p){ return 0.6 * sin(p.x * 0.15 + uTime * 0.7) + 0.38 * sin(p.y * 0.2 - uTime * 0.55 + p.x * 0.05) + 0.17 * sin((p.x + p.y) * 0.43 + uTime * 1.3) + 0.07 * sin(p.x * 1.05 - p.y * 0.8 + uTime * 2.0); }
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); w.y += wave(w.xz); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uSun, uDeep, uShallow, uHaze, uSunCol, uUnder; varying vec3 vW;
        void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (n.y < 0.0) n = -n;
          vec3 v = normalize(cameraPosition - vW); float d = length(cameraPosition - vW); vec3 c;
          if (cameraPosition.y > vW.y) {
            float diff = clamp(dot(n, uSun) * 0.5 + 0.5, 0.0, 1.0); c = mix(uDeep, uShallow, diff * diff);
            float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0); c = mix(c, uHaze, fres * 0.5);
            vec3 r = reflect(-uSun, n); c += uSunCol * pow(max(dot(r, v), 0.0), 40.0) * 0.85;
            c = mix(c, uHaze, 1.0 - exp(-d * 0.0062));
          } else {
            float up = clamp(-v.y, 0.0, 1.0); c = mix(uUnder, uSunCol, smoothstep(0.55, 1.0, up) * 0.75 + n.x * 0.08);
            c = mix(c, uUnder, 1.0 - exp(-d * 0.06));
          }
          gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  return new THREE.Mesh(geometry, material);
}

function shafts(
  THREE: ThreeModule,
  keep: Keep,
  color: (name: string) => Three.Color,
  scene: Three.Scene,
) {
  const material = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uOpacity: { value: 0 },
        uCol: { value: color("--color-shaft") },
      },
      vertexShader:
        "varying float vH; void main(){ vH = position.y / 60.0 + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "uniform float uOpacity; uniform vec3 uCol; varying float vH; void main(){ gl_FragColor = vec4(uCol, pow(vH, 1.6) * uOpacity); }",
    }),
  );
  const geometry = keep(new THREE.ConeGeometry(4, 60, 10, 1, true));
  const rays = Array.from({ length: 7 }, (_, i) => {
    const ray = new THREE.Mesh(geometry, material);
    ray.position.set(
      -24 + i * 8 + Math.random() * 3,
      -32,
      -16 - Math.random() * 30,
    );
    ray.userData.phase = Math.random() * 6;
    scene.add(ray);
    return ray;
  });
  return { material, rays };
}

function cloud(
  THREE: ThreeModule,
  keep: Keep,
  texture: Three.Texture,
  count: number,
  range: [number, number],
  size: number,
  colors: Three.Color[],
  glowing: boolean,
): Three.Points<Three.BufferGeometry, Three.PointsMaterial> {
  const position = new Float32Array(count * 3);
  const tint = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    position.set(
      [
        (Math.random() - 0.5) * 70,
        range[0] + Math.random() * (range[1] - range[0]),
        -2 - Math.random() * 60,
      ],
      i * 3,
    );
    const c = colors[i % colors.length];
    tint.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(tint, 3));
  return new THREE.Points(
    geometry,
    keep(
      new THREE.PointsMaterial({
        size,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: glowing ? 0.9 : 0.5,
        depthWrite: false,
        blending: glowing ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    ),
  );
}

// Bubbles rise and sand settles; a ring buffer, so emitting never allocates.
function pool(
  THREE: ThreeModule,
  keep: Keep,
  scene: Three.Scene,
  count: number,
  color: Three.Color,
  size: number,
): Pool {
  const position = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const velocity = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const points = new THREE.Points(
    geometry,
    keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uColor: { value: color }, uSize: { value: size } },
        vertexShader:
          "attribute float aAlpha; uniform float uSize; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; vA = aAlpha; }",
        fragmentShader:
          "uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.4, d) * (0.3 + 0.7 * smoothstep(0.2, 0.45, d)); gl_FragColor = vec4(uColor, a * vA); }",
      }),
    ),
  );
  points.frustumCulled = false;
  scene.add(points);
  let next = 0;
  const flag = () => {
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  };
  return {
    emit(n, at, spread, rise, sideways) {
      for (let k = 0; k < n; k++) {
        const i = next;
        next = (next + 1) % count;
        position.set(
          [
            at.x + (Math.random() - 0.5) * spread,
            at.y + (Math.random() - 0.5) * spread * 0.4,
            at.z + (Math.random() - 0.5) * spread,
          ],
          i * 3,
        );
        velocity.set(
          [
            (Math.random() - 0.5) * sideways,
            rise * (0.6 + Math.random() * 0.8),
            (Math.random() - 0.5) * sideways,
          ],
          i * 3,
        );
        life[i] = 1;
      }
    },
    step(dt, gravity) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) {
          alpha[i] = 0;
          continue;
        }
        life[i] -= dt * 0.35;
        velocity[i * 3 + 1] += gravity * dt;
        velocity[i * 3] *= 1 - dt * 0.8;
        velocity[i * 3 + 2] *= 1 - dt * 0.8;
        position[i * 3] +=
          velocity[i * 3] * dt + Math.sin(life[i] * 9 + i) * 0.01;
        position[i * 3 + 1] += velocity[i * 3 + 1] * dt;
        position[i * 3 + 2] += velocity[i * 3 + 2] * dt;
        alpha[i] = Math.max(life[i], 0);
      }
      flag();
    },
    clear() {
      life.fill(0);
      alpha.fill(0);
      flag();
    },
  };
}

function seabed(
  THREE: ThreeModule,
  keep: Keep,
  color: (name: string) => Three.Color,
  texture: Three.Texture,
) {
  const bed = new THREE.Group();
  const geometry = keep(new THREE.PlaneGeometry(260, 200, 48, 40));
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setY(
      i,
      Math.sin(x * 0.08) * 1.6 +
        Math.cos(z * 0.11 + x * 0.03) * 1.3 +
        Math.sin(x * 0.31 + z * 0.27) * 0.45,
    );
  }
  geometry.computeVertexNormals();
  bed.add(
    new THREE.Mesh(
      geometry,
      keep(
        new THREE.MeshPhongMaterial({
          color: color("--color-sand"),
          flatShading: true,
          shininess: 4,
        }),
      ),
    ),
  );
  const rockGeometry = keep(new THREE.DodecahedronGeometry(1, 0));
  const rockMaterial = keep(
    new THREE.MeshPhongMaterial({
      color: color("--color-rock"),
      flatShading: true,
      shininess: 8,
    }),
  );
  for (let i = 0; i < 14; i++) {
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    const s = 0.8 + Math.random() * 3;
    rock.scale.set(
      s * (1 + Math.random() * 0.6),
      s * (0.6 + Math.random() * 0.5),
      s,
    );
    rock.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    rock.position.set((Math.random() - 0.5) * 60, 0.4, -6 - Math.random() * 46);
    bed.add(rock);
  }
  const marks = Array.from({ length: 18 }, (_, i) => {
    const mark = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: texture,
          color: color(i % 3 ? "--color-glow" : "--color-coral"),
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    mark.scale.set(0.7, 0.7, 1);
    mark.position.set(
      (Math.random() - 0.5) * 50,
      1 + Math.random() * 1.5,
      -6 - Math.random() * 40,
    );
    bed.add(mark);
    return mark;
  });
  return { bed, marks };
}

/** Bounds of the animated pose; a skinned mesh's rest bounds can be far off. */
function posedBox(THREE: ThreeModule, root: Three.Object3D): Three.Box3 {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const position = node.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(position.count / 300));
    for (let i = 0; i < position.count; i += stride) {
      point.fromBufferAttribute(position, i);
      if (node instanceof THREE.SkinnedMesh) node.applyBoneTransform(i, point);
      box.expandByPoint(point.applyMatrix4(node.matrixWorld));
    }
  });
  return box;
}

function disposeModel(THREE: ThreeModule, gltf: GLTF): void {
  gltf.scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

/** Builds the sea on `canvas`; null when WebGL is unavailable. */
function createSea(
  { THREE, loader, clone }: Addons,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  waterRef: RefObject<HTMLElement | null>,
): Sea | null {
  // The palette was tuned without colour management, like the prototype.
  THREE.ColorManagement.enabled = false;
  // Probe first: three logs errors to the console when it cannot get a context.
  if (!document.createElement("canvas").getContext("webgl2")) return null;
  let renderer: Three.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, SEA_MAX_PIXEL_RATIO));

  const disposables: { dispose: () => void }[] = [];
  const keep: Keep = (item) => {
    disposables.push(item);
    return item;
  };
  const color = (name: string) => new THREE.Color(token(canvas, name));
  const reduced = matchMedia(REDUCED_MOTION_QUERY);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
  scene.add(camera);
  const fog = new THREE.FogExp2(color("--color-water-1"), 0);
  scene.fog = fog;
  const sun = new THREE.Vector3(...SUN_DIRECTION).normalize();
  const time = { value: 0 };
  const glow = glowTexture(THREE, keep);
  const palette = {
    glow: color("--color-glow"),
    coral: color("--color-coral"),
    peri: color("--color-peri"),
  };

  const sky = skyDome(THREE, keep, color, sun);
  scene.add(sky);
  const sea = ocean(THREE, keep, color, sun, time);
  scene.add(sea);
  const hemi = new THREE.HemisphereLight(
    color("--color-foam"),
    color("--color-ink"),
    LEGACY_LIGHT,
  );
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(color("--color-sun"), 0);
  sunLight.position.set(12, 40, -20);
  scene.add(sunLight);
  const lamp = new THREE.PointLight(color("--color-foam"), 0, 36, 0);
  lamp.position.set(0, 0.5, 1);
  camera.add(lamp);
  const rays = shafts(THREE, keep, color, scene);
  const snow = cloud(
    THREE,
    keep,
    glow,
    1600,
    [-330, -12],
    0.22,
    [color("--color-foam"), color("--color-shaft")],
    false,
  );
  const specks = cloud(
    THREE,
    keep,
    glow,
    520,
    [-330, -110],
    0.55,
    [palette.glow, palette.peri, palette.glow, palette.coral],
    true,
  );
  scene.add(snow, specks);
  const { bed, marks } = seabed(THREE, keep, color, glow);
  const restBed = worldY(metersToPx(5600)) - 9;
  bed.position.y = restBed;
  scene.add(bed);
  const bubbles = pool(THREE, keep, scene, 320, color("--color-foam"), 0.5);
  const dust = pool(THREE, keep, scene, 220, color("--color-dust"), 0.9);

  const rings = Array.from({ length: 2 }, () => {
    const mesh = new THREE.Mesh(
      keep(new THREE.RingGeometry(0.94, 1, 72)),
      keep(
        new THREE.MeshBasicMaterial({
          color: palette.glow,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    );
    scene.add(mesh);
    return { mesh, age: 99 };
  });
  const lanterns = Array.from({ length: 8 }, () => {
    const sprite = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: glow,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      ),
    );
    sprite.scale.set(1.6, 1.6, 1);
    scene.add(sprite);
    return { sprite, age: 99, up: true, y0: 0, z0: 0 };
  });
  // The retrieval score gate drawn as a thermocline.
  const gate = new THREE.Line(
    keep(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-11, 0, 0),
        new THREE.Vector3(11, 0, 0),
      ]),
    ),
    keep(
      new THREE.LineDashedMaterial({
        color: color("--color-foam"),
        transparent: true,
        opacity: 0,
        dashSize: 0.5,
        gapSize: 0.35,
        fog: false,
      }),
    ),
  );
  gate.computeLineDistances();
  scene.add(gate);

  const water = WATER_KEYS.map(([at, name]): [number, Three.Color] => [
    at,
    color(name),
  ]);
  const waterColor = new THREE.Color();
  function waterAt(zone: number): Three.Color {
    const next = water.findIndex(([at]) => zone <= at);
    if (next <= 0)
      return waterColor.copy(water[next === 0 ? 0 : water.length - 1][1]);
    const [from, a] = water[next - 1];
    const [to, b] = water[next];
    return waterColor.copy(a).lerp(b, (zone - from) / (to - from));
  }

  // Creatures are CC BY models (credited on the page); each clone has its own mixer and phase.
  const creatures: Creature[] = [];
  const models: GLTF[] = [];
  let diver: Creature | null = null;
  let disposed = false;
  const lure = new THREE.Sprite(
    keep(
      new THREE.SpriteMaterial({
        map: glow,
        color: palette.glow,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  lure.scale.set(1.6, 1.6, 1);
  const lureLight = new THREE.PointLight(palette.glow, 0, 18, 0);

  function instance(
    gltf: GLTF,
    length: number,
    speed: number,
    tint?: (material: Three.MeshStandardMaterial) => void,
  ): Creature {
    const model = clone(gltf.scene);
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.frustumCulled = false;
      if (tint && node.material instanceof THREE.MeshStandardMaterial) {
        node.material = keep(node.material.clone());
        tint(node.material);
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations[0];
    const action = clip ? mixer.clipAction(clip) : null;
    if (action && clip) {
      action.play();
      action.time = Math.random() * clip.duration;
      action.timeScale = speed;
    }
    mixer.update(0);
    const box = posedBox(THREE, model);
    const size = box.getSize(new THREE.Vector3());
    const k = length / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(k);
    model.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-k);
    const root = new THREE.Group();
    root.add(model);
    scene.add(root);
    return { root, mixer, action };
  }

  function populate(loaded: Partial<Record<ModelId, GLTF>>): void {
    const { sardines, fish, jelly, angler } = loaded;
    if (sardines) {
      for (let i = 0; i < 3; i++) {
        const c = instance(sardines, 7 + i * 1.5, 0.9);
        c.path = {
          y: -10 - i * 14,
          r: 13 + i * 3,
          speed: 0.09 + i * 0.03,
          phase: i * 2.1,
          z: -20,
        };
        creatures.push(c);
      }
    }
    if (fish) {
      for (let i = 0; i < 9; i++) {
        const c = instance(fish, 1.2 + Math.random() * 0.9, 1.3);
        c.path = {
          y: -6 - Math.random() * 46,
          r: 6 + Math.random() * 14,
          speed: 0.14 + Math.random() * 0.12,
          phase: Math.random() * 6,
          z: -9 - Math.random() * 18,
        };
        creatures.push(c);
      }
      for (let i = 0; i < 5; i++) {
        const c = instance(fish, 3 + Math.random() * 2, 0.6, (m) => {
          m.color.multiplyScalar(0.3);
        });
        c.path = {
          y: -78 - i * 30,
          r: 18,
          speed: 0.05,
          phase: i * 1.3,
          z: -18 - Math.random() * 10,
        };
        creatures.push(c);
      }
    }
    if (jelly) {
      const glows = [palette.glow, palette.peri, palette.coral];
      for (let i = 0; i < 10; i++) {
        const c = instance(jelly, 2.6 + Math.random() * 2.6, 0.8, (m) => {
          m.emissive.copy(glows[i % glows.length]);
          m.emissiveIntensity = 0.9;
          m.transparent = true;
          m.opacity = 0.75;
          m.depthWrite = false;
        });
        c.drift = {
          x: (Math.random() - 0.5) * 32,
          y: -66 - Math.random() * 175,
          z: -10 - Math.random() * 26,
          phase: Math.random() * 6,
        };
        creatures.push(c);
      }
    }
    if (angler) {
      const c = instance(angler, 6, 0.7);
      c.path = {
        y: worldY(metersToPx(4600)),
        r: 9,
        speed: 0.07,
        phase: 0,
        z: -16,
      };
      lure.position.set(0, 0.9, 3.1);
      lureLight.position.copy(lure.position);
      c.root.add(lure, lureLight);
      creatures.push(c);
    }
    if (loaded.diver) diver = instance(loaded.diver, 3, 1);
    wake();
  }

  Promise.all(
    MODEL_IDS.map((id) =>
      loader.loadAsync(MODEL_URL[id]).then(
        (gltf): [ModelId, GLTF] => [id, gltf],
        () => null,
      ),
    ),
  ).then((results) => {
    const loaded = results.filter((item) => item !== null);
    if (disposed) {
      for (const [, gltf] of loaded) disposeModel(THREE, gltf);
      return;
    }
    models.push(...loaded.map(([, gltf]) => gltf));
    populate(Object.fromEntries(loaded));
  });

  const restQ = new THREE.Quaternion();
  const diveQ = (() => {
    const y = new THREE.Vector3(0.3, -0.95, 0).normalize();
    const z = new THREE.Vector3(0, 0, 1);
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, z),
    );
  })();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const splashAt = new THREE.Vector3();
  let lampOn = false;
  let lampLevel = 0;
  let camY = SURFACE_Y;
  let wasUnder = false;
  let gateAge = 99;
  let landing: number | null = null;
  let zoneName = "";
  let clock = 0;
  let last = 0;
  let frame = 0;
  let lost = false;

  function resize(): void {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.8 ? 70 : 55;
    camera.updateProjectionMatrix();
    wake();
  }

  function setZone(px: number): void {
    const next = zoneLabel(px);
    if (next === zoneName) return;
    zoneName = next;
    host.dataset.zone = next;
  }

  function swim(c: Creature, t: number): void {
    const p = c.path;
    if (!p) return;
    const a = t * p.speed + p.phase;
    c.root.position.set(
      Math.sin(a) * p.r,
      p.y + Math.sin(a * 1.7) * 0.8,
      p.z + Math.cos(a * 0.8) * 7,
    );
    c.root.rotation.y = Math.atan2(Math.cos(a) * p.r, -Math.sin(a * 0.8) * 5.6);
  }

  function animate(dt: number, t: number): void {
    const still = reduced.matches ? 0 : dt;
    for (const c of creatures) {
      swim(c, t);
      const d = c.drift;
      if (d) {
        c.root.position.set(
          d.x + Math.sin(t * 0.1 + d.phase) * 2,
          d.y + Math.sin(t * 0.35 + d.phase) * 1.6,
          d.z,
        );
        c.root.rotation.y = t * 0.05 + d.phase;
      }
      if (Math.abs(c.root.position.y - camY) < 70) c.mixer.update(still);
    }
    lureLight.intensity = (1.4 + Math.sin(t * 2.4) * 0.3) * LEGACY_LIGHT;
    if (diver) {
      const ease = smoothstep((SURFACE_Y - camY) / (SURFACE_Y - WATERLINE_Y));
      const halfW =
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 9 * camera.aspect;
      const wide = camera.aspect > 1.2;
      // The diver floats on the side away from the hero, which follows the reading direction.
      const side = document.documentElement.dir === "rtl" ? -1 : 1;
      const restX = side * halfW * (wide ? 0.32 : 0.45);
      const restY = -1.25 + Math.sin(t * 0.7) * 0.2;
      const diveX = wide ? 0.8 : 0;
      diver.root.position.set(
        restX + (diveX - restX) * ease,
        restY + (camY - 1.2 - restY) * ease,
        -1 - 2 * ease,
      );
      diver.root.quaternion.slerpQuaternions(restQ, diveQ, ease);
      if (diver.action) diver.action.timeScale = 1 + ease * 0.6;
      diver.mixer.update(still);
    }
    marks.forEach((mark, i) => {
      mark.material.opacity = 0.45 + Math.sin(t * 1.2 + i) * 0.3;
    });
  }

  function effects(dt: number, t: number): void {
    for (const ring of rings) {
      ring.age += dt;
      const k = ring.age / 1.6;
      ring.mesh.visible = k < 1;
      if (k < 1) {
        ring.mesh.scale.setScalar(0.5 + k * 16);
        ring.mesh.material.opacity = (1 - k) * 0.8;
      }
    }
    gateAge += dt;
    gate.material.opacity =
      gateAge < 9
        ? Math.min(gateAge * 2, 1) * 0.5 * (1 - Math.max(gateAge - 7, 0) / 2)
        : 0;
    lanterns.forEach((l, i) => {
      l.age += dt;
      if (l.age > 14) {
        l.sprite.material.opacity = 0;
        return;
      }
      const ease = 1 - (1 - Math.min(l.age / 2.2, 1)) ** 3;
      const fade = Math.min(l.age * 1.5, 1) * Math.min((14 - l.age) / 2, 1);
      if (l.up) {
        l.sprite.position.y = l.y0 + Math.sin(t * 1.4 + i) * 0.2;
        l.sprite.position.z = l.z0 + ease * 4;
        l.sprite.material.opacity = fade * (0.85 + Math.sin(t * 3 + i) * 0.15);
      } else {
        l.sprite.position.y = l.y0 - ease * 5;
        l.sprite.material.opacity = fade * (0.65 - ease * 0.45);
      }
    });
    if (landing !== null && camY <= landing + 1.5) {
      if (!reduced.matches) {
        dust.emit(110, splashAt.set(0, bed.position.y + 1.5, -12), 14, 1.2, 4);
      }
      landing = null;
    }
    bubbles.step(dt, 1.5);
    dust.step(dt, -0.6);
  }

  function draw(dt: number): void {
    const t = clock;
    time.value = t;
    const px = divePx(waterRef.current);
    setZone(px);
    const s0 = scrollY - px;
    camY =
      px < 0
        ? SURFACE_Y + (WATERLINE_Y - SURFACE_Y) * smoothstep(scrollY / s0)
        : worldY(px);
    const zone = Math.max(0, px / ZONE_PX);
    const under = camY < -0.4;
    if (under && !wasUnder && !reduced.matches) {
      bubbles.emit(70, splashAt.set(0, camY - 1.5, -5), 6, 3, 2);
    }
    wasUnder = under;

    pointer.x += (pointer.tx - pointer.x) * Math.min(dt * 3, 1);
    pointer.y += (pointer.ty - pointer.y) * Math.min(dt * 3, 1);
    const bob = under ? 0 : Math.sin(t * 0.7) * 0.14;
    camera.position.set(pointer.x * 0.9, camY + bob, 8);
    camera.lookAt(
      pointer.x * 0.4,
      camY - (under ? 0.4 : 0.7) - pointer.y * 0.3,
      -30,
    );

    const w = waterAt(zone);
    sky.visible = !under;
    scene.background = under ? w : null;
    renderer.setClearColor(w);
    fog.color.copy(w);
    fog.density = under ? keyframe(zone, FOG_KEYS) : 0;
    sea.material.uniforms.uUnder.value.copy(w);
    hemi.intensity =
      (under ? keyframe(zone, AMBIENT_KEYS) : 1.1) * LEGACY_LIGHT;
    sunLight.intensity =
      (under ? keyframe(zone, SUNLIGHT_KEYS) : 0.85) * LEGACY_LIGHT;
    rays.material.uniforms.uOpacity.value = under
      ? keyframe(zone, SHAFT_KEYS)
      : 0;
    for (const ray of rays.rays) {
      ray.rotation.z = -0.2 + Math.sin(t * 0.25 + ray.userData.phase) * 0.05;
    }
    lampLevel += ((lampOn ? 1 : 0) - lampLevel) * Math.min(dt * 5, 1);
    lamp.intensity = ((zone > 1.1 ? 0.75 : 0) + lampLevel * 1.4) * LEGACY_LIGHT;
    snow.position.set(Math.sin(t * 0.08) * 0.8, Math.sin(t * 0.05) * 1.2, 0);
    specks.material.opacity = 0.7 + Math.sin(t * 1.3) * 0.2;

    animate(dt, t);
    effects(dt, t);
    renderer.render(scene, camera);
  }

  function tick(now: number): void {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!reduced.matches) clock += dt;
    draw(dt);
    if (reduced.matches) last = 0;
    else wake();
  }

  // Reduced motion draws one still frame per scroll, resize or event, never a loop.
  function wake(): void {
    if (!frame && !lost && !document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  }

  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || reduced.matches) return;
    pointer.tx = (event.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (event.clientY / innerHeight - 0.5) * 2;
  };
  const onBlur = () => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  const onVisible = () => {
    last = 0;
    wake();
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    lost = true;
    host.dataset.gl = "off";
  };
  addEventListener("pointermove", onPointer);
  addEventListener("blur", onBlur);
  addEventListener("resize", resize);
  addEventListener("scroll", wake, { passive: true });
  document.addEventListener("visibilitychange", onVisible);
  reduced.addEventListener("change", wake);
  canvas.addEventListener("webglcontextlost", onLost);
  resize();

  const quiet = () => reduced.matches;
  return {
    controls: {
      reset() {
        lampOn = false;
        lampLevel = 0;
        for (const ring of rings) ring.age = 99;
        for (const l of lanterns) {
          l.age = 99;
          l.sprite.material.opacity = 0;
        }
        gateAge = 99;
        landing = null;
        bubbles.clear();
        dust.clear();
        bed.position.y = restBed;
        wake();
      },
      lamp(on) {
        lampOn = on;
        wake();
      },
      sonar(px) {
        if (quiet()) return;
        const ring = rings.find((item) => item.age > 1.6) ?? rings[0];
        ring.age = 0;
        ring.mesh.position.set(0, worldY(px), -10);
      },
      lanterns(px, passages, threshold) {
        const y = worldY(px);
        gate.position.set(0, y, -13);
        gateAge = 0;
        passages.slice(0, lanterns.length).forEach((passage, i) => {
          const l = lanterns[i];
          l.age = quiet() ? 3 : 0;
          l.up = passage.above_threshold;
          l.y0 = y + (passage.score - threshold) * 14;
          l.z0 = -15;
          l.sprite.position.set(
            -9 + (i / Math.max(passages.length - 1, 1)) * 18,
            l.y0,
            l.z0,
          );
          l.sprite.material.color.copy(
            passage.above_threshold ? palette.glow : palette.coral,
          );
          const s = 1 + passage.score * 2.2;
          l.sprite.scale.set(s, s, 1);
        });
        wake();
      },
      bubbles(count) {
        if (quiet()) return;
        bubbles.emit(
          count,
          splashAt.set((Math.random() - 0.5) * 4, camY - 3, -6),
          2,
          2.6,
          0.6,
        );
      },
      seabed(px) {
        bed.position.y = worldY(px) - 9;
        landing = worldY(px);
        wake();
      },
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", onPointer);
      removeEventListener("blur", onBlur);
      removeEventListener("resize", resize);
      removeEventListener("scroll", wake);
      document.removeEventListener("visibilitychange", onVisible);
      reduced.removeEventListener("change", wake);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const c of creatures) c.mixer.stopAllAction();
      for (const gltf of models) disposeModel(THREE, gltf);
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}

/** Zone shown before three.js loads, and kept when WebGL is off. */
function trackZone(
  host: HTMLElement,
  waterRef: RefObject<HTMLElement | null>,
): () => void {
  const update = () => {
    host.dataset.zone = zoneLabel(divePx(waterRef.current));
  };
  update();
  addEventListener("scroll", update, { passive: true });
  return () => removeEventListener("scroll", update);
}

/**
 * Runs the sea behind the page (P5.20): sky and swell at the surface, the
 * water darkening with scroll depth below `waterRef`, creatures and the
 * diver. three.js and the models load lazily on the client. Without WebGL,
 * `data-gl="off"` and `data-zone` on the host drive a CSS gradient instead.
 */
export function useSea(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  waterRef: RefObject<HTMLElement | null>,
): RefObject<SeaControls | null> {
  const controls = useRef<SeaControls | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    let sea: Sea | null = null;
    let untrack: (() => void) | null = trackZone(host, waterRef);
    let cancelled = false;
    Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/utils/SkeletonUtils.js"),
    ]).then(([THREE, gltf, skeleton]) => {
      if (cancelled) return;
      sea = createSea(
        { THREE, loader: new gltf.GLTFLoader(), clone: skeleton.clone },
        canvas,
        host,
        waterRef,
      );
      if (!sea) {
        host.dataset.gl = "off";
        return;
      }
      untrack?.();
      untrack = null;
      host.dataset.gl = "on";
      controls.current = sea.controls;
    });
    return () => {
      cancelled = true;
      untrack?.();
      sea?.dispose();
      controls.current = null;
    };
  }, [canvasRef, waterRef]);

  return controls;
}
