import type { RefObject } from "react";
import type * as Three from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_WAVES } from "#/constants/models.constants";
import {
  COARSE_POINTER_QUERY,
  EASE_OUT,
  REDUCED_MOTION_QUERY,
} from "#/constants/motion.constants";
import {
  FOG_KEYS,
  LAND_FOG_CUT,
  LAND_LIFT,
  SEA_MAX_PIXEL_RATIO,
  SURFACE_Y,
  VIGNETTE_KEYS,
  ZONE_PX,
} from "#/constants/sea.constants";
import {
  BED_LIFE_ZONE,
  BUBBLES,
  CAMERA,
  DEEP_LOAD_ZONE,
  DIVER,
  DUST,
  EASE_RATE,
  FOAM,
  LANDING_DUST,
  LEGACY_LIGHT,
  LIFT_EPSILON_PX,
  LITE,
  LOG_SHIFT,
  LURE,
  PLUNGE,
  SEABED,
  SPLASH,
  STREAM_BUBBLES,
  STRIDE,
  SURFACING,
  UNDER_Y,
  WAVES,
  WET,
} from "#/constants/seaScene.constants";
import type { ModelId } from "#/types/models.types";
import type {
  Addons,
  Creature,
  Kit,
  Loaded,
  Sea,
} from "#/types/seaScene.types";
import {
  keyframe,
  metersToPx,
  surfaceEye,
  worldY,
  zoneLabel,
} from "#/utils/depth.utils";
import { diveEase } from "#/utils/diver.utils";
import { approach, clamp01, frameSeconds } from "#/utils/ease.utils";
import { sandHeight } from "#/utils/seabed.utils";
import { waveAt } from "#/utils/wave.utils";
import { diverRig } from "./diver";
import { glowTexture } from "./glow";
import { legacyFalloff } from "./legacyFalloff";
import {
  boatRig,
  placeBed,
  placeLife,
  placeOthers,
  subRig,
  swimLife,
  swimOthers,
  torchLights,
} from "./life";
import { lights } from "./lights";
import { markers } from "./markers";
import { disposeModel, loadModels } from "./models";
import { ocean } from "./ocean";
import { particles } from "./particles";
import { pool } from "./pool";
import { seabed } from "./seabed";
import { shafts } from "./shafts";
import { skyDome, skyUniforms } from "./sky";
import { spawner } from "./spawn";
import { splashRig } from "./splash";
import { waterPalette } from "./water";
import { divePx } from "./zone";

function renderer(
  THREE: Addons["THREE"],
  canvas: HTMLCanvasElement,
  lite: boolean,
): Three.WebGLRenderer | null {
  // Probe first: three logs errors to the console when it cannot get a context.
  if (!document.createElement("canvas").getContext("webgl2")) return null;
  try {
    const r = new THREE.WebGLRenderer({
      canvas,
      antialias: !lite,
      powerPreference: "high-performance",
    });
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    // Reading a shader's log waits for it to compile, which stalls the page on every new material.
    r.debug.checkShaderErrors = import.meta.env.DEV;
    const maxRatio = lite ? LITE.pixelRatio : SEA_MAX_PIXEL_RATIO;
    r.setPixelRatio(Math.min(devicePixelRatio, maxRatio));
    return r;
  } catch {
    return null;
  }
}

/** Builds the sea on `canvas` and runs it from scroll depth; null when WebGL is unavailable. */
export function createSea(
  { THREE, loader, clone }: Addons,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  waterRef: RefObject<HTMLElement | null>,
): Sea | null {
  // The palette and lights were tuned without colour management and with r128's falloff.
  THREE.ColorManagement.enabled = false;
  legacyFalloff(THREE);
  const lite = matchMedia(COARSE_POINTER_QUERY).matches;
  const made = renderer(THREE, canvas, lite);
  if (!made) return null;
  const gl = made;

  const disposables: { dispose: () => void }[] = [];
  const keep: Kit["keep"] = (item) => {
    disposables.push(item);
    return item;
  };
  const style = getComputedStyle(canvas);
  const color = (name: string) =>
    new THREE.Color(style.getPropertyValue(name).trim());
  const reduced = matchMedia(REDUCED_MOTION_QUERY);
  const quiet = () => reduced.matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    1,
    CAMERA.near,
    CAMERA.far,
  );
  scene.add(camera);
  const fog = new THREE.FogExp2(color("--color-water-1"), 0);
  scene.fog = fog;
  const kit: Kit = {
    THREE,
    scene,
    keep,
    color,
    glow: glowTexture(THREE, keep),
    lite,
  };

  const time = { value: 0 };
  const skyU = skyUniforms(THREE, time);
  const sky = skyDome(kit, skyU);
  const sea = ocean(kit, skyU);
  scene.add(sky, sea);
  const light = lights(kit, camera);
  const rays = shafts(kit);
  const drift = particles(kit);
  const floor = seabed(kit);
  const restBed = worldY(metersToPx(SEABED.restMeters)) - SEABED.belowEye;
  floor.bed.position.y = restBed;
  const bubbles = pool(kit, BUBBLES.count, color("--color-foam"), BUBBLES.size);
  const dust = pool(kit, DUST.count, color("--color-dust"), DUST.size);
  const marks = markers(kit);
  const waterAt = waterPalette(kit);

  // Creatures are CC BY / CC0 models (credited on the page).
  const spawn = spawner(kit, clone);
  const lureLight = new THREE.PointLight(
    color("--color-glow"),
    0,
    LURE.distance,
    LURE.decay,
  );
  scene.add(lureLight);
  const torches = torchLights(kit);
  const boat = boatRig(kit);
  const sub = subRig(kit);
  const splash = splashRig(kit);
  const diver = diverRig(kit, {
    entry: (at) => splash.start(at, quiet()),
    trail: (at) => {
      const b = STRIDE.trail;
      bubbles.emit(b.count, at, b.spread, b.rise, b.sideways);
    },
  });
  const creatures: Creature[] = [];
  const others: Creature[] = [];
  const bedProps: Creature[] = [];
  const models: GLTF[] = [];
  let disposed = false;

  function populate(loaded: Loaded): void {
    const gltfs = Object.values(loaded).filter((g) => g !== undefined);
    if (disposed) {
      for (const gltf of gltfs) disposeModel(THREE, gltf);
      return;
    }
    models.push(...gltfs);
    creatures.push(...placeLife(kit, spawn, loaded, lureLight));
    if (loaded.diver) {
      diver.set(spawn(loaded.diver, DIVER.length));
      others.push(
        ...placeOthers(kit, spawn, loaded.diver, DIVER.length, torches),
      );
    }
    if (loaded.boat) boat.place(spawn, loaded.boat);
    const subModel = loaded["research-sub"];
    if (subModel) sub.place(spawn, subModel);
    bedProps.push(...placeBed(spawn, loaded, floor.bed));
    wake();
  }

  // Shaders compile off the main thread (KHR_parallel_shader_compile) before a wave joins the scene.
  const compiled = (loaded: Loaded) =>
    Promise.all(
      Object.values(loaded).map((gltf) =>
        gltf ? gl.compileAsync(gltf.scene, camera, scene) : null,
      ),
    )
      .catch(() => null)
      .then(() => loaded);
  const load = (ids: ModelId[]) =>
    loadModels(loader, ids).then(compiled).then(populate);
  // Surface life loads at once; everything deeper when the first dive starts (ADR 0019).
  const [firstWave, nearWave, deepWave, bedWave] = MODEL_WAVES;
  load(firstWave);
  load(nearWave);
  let deepLoading = false;
  function loadDeep(): void {
    if (deepLoading) return;
    deepLoading = true;
    load(deepWave).then(() => load(bedWave));
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const splashAt = new THREE.Vector3();
  let lampOn = false;
  let lampLevel = 0;
  let camY = SURFACE_Y;
  let wasUnder = false;
  let wet = 0;
  let shownVignette = -1;
  const foam = host.querySelector<HTMLElement>("[data-foam]");
  const vignette = host.querySelector<HTMLElement>("[data-vignette]");
  // The dive has put the sand under its landing spot; `landing` only waits for the dust to settle.
  let placed = false;
  let landing: number | null = null;
  let zoneName = "";
  let clock = 0;
  let last = 0;
  let frame = 0;
  let lost = false;
  let landed = false;
  let shifted = false;
  let shift = 0;
  let landK = 0;
  let lift = 0;
  let liftSet = Number.NaN;
  let shiftSet = Number.NaN;

  function resize(): void {
    gl.setSize(innerWidth, innerHeight, false);
    liftSet = Number.NaN;
    shiftSet = Number.NaN;
    camera.aspect = innerWidth / innerHeight;
    camera.fov =
      camera.aspect < CAMERA.narrowAspect ? CAMERA.narrowFov : CAMERA.fov;
    camera.updateProjectionMatrix();
    wake();
  }

  function setZone(px: number): void {
    const next = zoneLabel(px);
    if (next === zoneName) return;
    zoneName = next;
    host.dataset.zone = next;
  }

  const probe = new THREE.Vector3();
  /**
   * The x on the sand at `at`'s height and depth that lands at `ndcX` across the view (−1 left, 1
   * right), wherever the camera has shifted. Projection is linear in x: the camera never turns sideways.
   */
  function besideX(ndcX: number, at: Three.Vector3): number {
    const ndcAt = (x: number) =>
      probe.set(x, at.y, at.z).add(floor.bed.position).project(camera).x;
    const zero = ndcAt(0);
    return (ndcX - zero) / (ndcAt(1) - zero);
  }

  // Landed: the view lifts so the seabed shows above the chat; rereading looks like the way down.
  function aim(
    dt: number,
    t: number,
    eye: number,
    under: boolean,
    side: number,
  ): void {
    const ease = (from: number, to: number, rate: number) =>
      quiet() ? to : approach(from, to, rate, dt);
    pointer.x = approach(pointer.x, pointer.tx, EASE_RATE.pointer, dt);
    pointer.y = approach(pointer.y, pointer.ty, EASE_RATE.pointer, dt);
    lift = ease(lift, landed ? innerHeight * LAND_LIFT : 0, EASE_RATE.lift);
    landK = ease(landK, landed ? 1 : 0, EASE_RATE.land);
    const wide = innerWidth >= LOG_SHIFT.minWidth;
    const shiftTo =
      shifted && wide
        ? (side * (LOG_SHIFT.logStart + LOG_SHIFT.cardEnd)) / 2
        : 0;
    shift = ease(shift, shiftTo, EASE_RATE.lift);
    const still =
      Math.abs(lift - liftSet) < LIFT_EPSILON_PX &&
      Math.abs(shift - shiftSet) < LIFT_EPSILON_PX;
    if (!still) {
      liftSet = lift;
      shiftSet = shift;
      camera.setViewOffset(
        innerWidth,
        innerHeight,
        -shift,
        lift,
        innerWidth,
        innerHeight,
      );
    }
    const bob = under
      ? 0
      : waveAt(WAVES, CAMERA.bobAt.x, CAMERA.bobAt.z, t).h * CAMERA.bob;
    camera.position.set(pointer.x * CAMERA.sway, eye + bob, CAMERA.z);
    camera.lookAt(
      pointer.x * CAMERA.lookSway,
      eye -
        (under ? CAMERA.lookDropUnder : CAMERA.lookDropAbove) -
        pointer.y * CAMERA.lookTilt,
      CAMERA.lookZ,
    );
  }

  function shade(zone: number, under: boolean, dt: number): void {
    const w = waterAt(zone);
    sky.visible = !under;
    scene.background = under ? w : null;
    gl.setClearColor(w);
    fog.color.copy(w);
    // Landed: the water clears, so the seabed reads instead of fading into the fog.
    fog.density = keyframe(zone, FOG_KEYS) * (1 - LAND_FOG_CUT * landK) * wet;
    sea.material.uniforms.uUnder.value.copy(w);
    lampLevel = approach(lampLevel, lampOn ? 1 : 0, EASE_RATE.lamp, dt);
    light.frame({ zone, under, wet, lamp: lampLevel });
    const dim = Math.round(keyframe(zone, VIGNETTE_KEYS) * wet * 100) / 100;
    if (vignette && dim !== shownVignette) {
      shownVignette = dim;
      vignette.style.opacity = String(dim);
    }
  }

  function animate(
    dt: number,
    t: number,
    zone: number,
    under: boolean,
    side: number,
  ): void {
    const still = quiet() ? 0 : dt;
    swimLife(creatures, t, still, camY);
    swimOthers(others, t, still, camY, quiet() ? null : bubbles, splashAt);
    for (const c of bedProps) {
      if (c.beside !== undefined) {
        const at = c.root.position;
        at.x = besideX(side * c.beside, at);
        at.y = sandHeight(at.x, at.z);
        c.root.lookAt(camera.position);
      }
      if (c.action && zone > BED_LIFE_ZONE) c.mixer.update(still);
    }
    boat.frame(t, camY, under);
    sub.frame(t, camY);
    diver.frame({ camY, t, dt: still, camera, landK, quiet: quiet() });
    splash.frame(still, t);
    lureLight.intensity =
      (LURE.intensity + Math.sin(t * LURE.flickerRate) * LURE.flicker) *
      LEGACY_LIGHT;
    rays.frame(zone, wet, t);
    drift.frame(t);
    floor.frame(t, landK, camY, placed);
    marks.frame(dt, t);
    if (landing !== null && camY <= landing + LANDING_DUST.within) {
      if (!quiet()) {
        const d = LANDING_DUST;
        splashAt.set(0, floor.bed.position.y + d.dy, d.z);
        dust.emit(d.count, splashAt, d.spread, d.rise, d.sideways);
      }
      landing = null;
    }
    bubbles.step(dt, BUBBLES.gravity);
    dust.step(dt, DUST.gravity);
  }

  // Breaking the surface on the way up: a burst of bubbles and the foam wash.
  function surface(): void {
    const s = SURFACING;
    splashAt.set(0, camY + s.dy, s.z);
    bubbles.emit(s.count, splashAt, s.spread, s.rise, s.sideways);
    foam?.animate(
      [
        {
          opacity: 0,
          transform: `translateY(${FOAM.fromY})`,
          easing: EASE_OUT,
        },
        {
          opacity: FOAM.peak,
          transform: `translateY(${FOAM.peakY})`,
          offset: FOAM.peakAt,
          easing: FOAM.easeIn,
        },
        { opacity: 0, transform: `translateY(${FOAM.toY})` },
      ],
      { duration: FOAM.durationMs },
    );
  }

  // Going under: froth rises up the view as the water closes over the lens.
  function plunge(): void {
    const p = PLUNGE;
    foam?.animate(
      [
        { opacity: 0, transform: `translateY(${p.fromY})`, easing: EASE_OUT },
        {
          opacity: p.peak,
          transform: `translateY(${p.peakY})`,
          offset: p.peakAt,
          easing: EASE_OUT,
        },
        { opacity: 0, transform: `translateY(${p.toY})` },
      ],
      { duration: p.durationMs },
    );
  }

  function draw(dt: number): void {
    const t = clock;
    time.value = t;
    const px = divePx(waterRef.current);
    setZone(px);
    camY = px < 0 ? surfaceEye(scrollY, px) : worldY(px);
    const zone = Math.max(0, px / ZONE_PX);
    // Ready to jump, the camera comes down to the diver; following him under, it hands back.
    const drop =
      camera.aspect > DIVER.wideAspect
        ? STRIDE.camDrop.wide
        : STRIDE.camDrop.narrow;
    const eye = camY - drop * diver.close() * (1 - diveEase(camY));
    const under = eye < UNDER_Y;
    if (under && !wasUnder && !quiet()) {
      plunge();
      splashAt.set(0, eye + SPLASH.dy, SPLASH.z);
      bubbles.emit(
        SPLASH.count,
        splashAt,
        SPLASH.spread,
        SPLASH.rise,
        SPLASH.sideways,
      );
    }
    // Only a real ascent breaks the surface; the water closing (a new dive, Watch again) is not one.
    if (!under && wasUnder && !quiet() && waterRef.current) surface();
    wasUnder = under;
    const wetTo = clamp01((WET.dryY - eye) / WET.band);
    wet = quiet() ? wetTo : approach(wet, wetTo, WET.rate, dt);
    if (zone > DEEP_LOAD_ZONE) loadDeep();
    // The log sits at the inline start, so in RTL the free water is on the left.
    const side = document.documentElement.dir === "rtl" ? -1 : 1;
    aim(dt, t, eye, under, side);
    shade(zone, under, dt);
    animate(dt, t, zone, under, side);
    gl.render(scene, camera);
  }

  function tick(now: number): void {
    frame = 0;
    if (lite && last && now - last < LITE.frameMs) {
      wake();
      return;
    }
    const dt = frameSeconds(now, last);
    last = now;
    if (!quiet()) clock += dt;
    draw(dt);
    if (quiet()) last = 0;
    else wake();
  }

  // Reduced motion draws one still frame per scroll, resize or event, never a loop.
  function wake(): void {
    if (!frame && !lost && !disposed && !document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  }

  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || quiet()) return;
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

  return {
    controls: {
      reset() {
        lampOn = false;
        lampLevel = 0;
        marks.reset();
        landing = null;
        placed = false;
        bubbles.clear();
        dust.clear();
        splash.clear();
        floor.bed.position.y = restBed;
        wake();
      },
      lamp(on) {
        lampOn = on;
        wake();
      },
      sonar(px) {
        if (!quiet()) marks.ping(worldY(px));
      },
      lanterns(px, passages, threshold) {
        marks.show(worldY(px), passages, threshold, quiet());
        wake();
      },
      bubbles(count) {
        if (quiet()) return;
        const b = STREAM_BUBBLES;
        splashAt.set((Math.random() - 0.5) * b.spreadX, camY + b.dy, b.z);
        bubbles.emit(count, splashAt, b.spread, b.rise, b.sideways);
      },
      landed(on) {
        landed = on;
        wake();
      },
      shifted(on) {
        shifted = on;
        wake();
      },
      seabed(px) {
        floor.bed.position.y = worldY(px) - SEABED.belowEye;
        landing = worldY(px);
        placed = true;
        wake();
      },
      loadDeep,
      ready(on) {
        diver.ready(on);
        wake();
      },
      follow(on) {
        diver.hold(on);
        wake();
      },
      jump(entered) {
        diver.jump(entered, quiet());
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
      for (const c of [...creatures, ...others, ...bedProps]) {
        c.mixer.stopAllAction();
      }
      for (const gltf of models) disposeModel(THREE, gltf);
      for (const item of disposables) item.dispose();
      gl.dispose();
    },
  };
}
