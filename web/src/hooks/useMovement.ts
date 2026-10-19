import { type RefObject, useEffect, useRef } from "react";
import type * as Three from "three";
import { REDUCED_MOTION_QUERY } from "#/constants/motion.constants";
import {
  BALANCE_AT,
  BALANCE_HZ,
  BALANCE_SWING,
  GEAR_MODULE,
  GEAR_TRAIN,
  GLOW_FALL,
  GLOW_RISE,
  MAX_PIXEL_RATIO,
  RUN_SPEED,
  STAGE_KICK,
  TRAIN_SHIFT_X,
} from "#/constants/movement.constants";
import type { PlacedGear } from "#/types/movement.types";
import type { StageId, TraceSpan } from "#/types/trace.types";
import {
  meshedAngle,
  placeTrain,
  spokeWindows,
  toothOutline,
} from "#/utils/gear.utils";

type ThreeModule = typeof Three;

interface Movement {
  update: (spans: TraceSpan[], running: boolean) => void;
  dispose: () => void;
}

interface Wheel extends PlacedGear {
  mesh: Three.Mesh;
  material: Three.MeshStandardMaterial;
  angle: number;
  glow: number;
  target: number;
}

function token(element: Element, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

function gearShape(THREE: ThreeModule, gear: PlacedGear): Three.Shape {
  const shape = new THREE.Shape();
  toothOutline(gear.teeth, GEAR_MODULE).forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const arbor = new THREE.Path();
  arbor.absarc(0, 0, 0.1, 0, Math.PI * 2, true);
  shape.holes.push(arbor);
  for (const w of spokeWindows(gear.teeth, GEAR_MODULE, gear.spokes)) {
    const cut = new THREE.Path();
    cut.moveTo(
      w.hub * Math.cos(w.from + w.hubGap),
      w.hub * Math.sin(w.from + w.hubGap),
    );
    cut.absarc(0, 0, w.hub, w.from + w.hubGap, w.to - w.hubGap, false);
    cut.lineTo(
      w.rim * Math.cos(w.to - w.rimGap),
      w.rim * Math.sin(w.to - w.rimGap),
    );
    cut.absarc(0, 0, w.rim, w.to - w.rimGap, w.from + w.rimGap, true);
    cut.closePath();
    shape.holes.push(cut);
  }
  return shape;
}

function stageCounts(spans: TraceSpan[]): Map<StageId, number> {
  const counts = new Map<StageId, number>();
  for (const span of spans) {
    counts.set(span.stage, (counts.get(span.stage) ?? 0) + 1);
  }
  return counts;
}

/** Builds the scene on `canvas`; null when WebGL is unavailable. */
function createMovement(
  THREE: ThreeModule,
  canvas: HTMLCanvasElement,
): Movement | null {
  let renderer: Three.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
  camera.position.set(0, -3, 17);
  camera.lookAt(0, 0, 0);
  const root = new THREE.Group();
  root.position.x = TRAIN_SHIFT_X;
  scene.add(root);
  scene.add(new THREE.AmbientLight(0x8a93b0, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(-6, 8, 10);
  scene.add(key);
  const glint = new THREE.PointLight(0xdfe6ff, 30, 40);
  glint.position.set(4, 2, 7);
  scene.add(glint);
  const halo = new THREE.PointLight(0xffffff, 0, 12);
  root.add(halo);

  const plateMaterial = keep(
    new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.9 }),
  );
  const plate = new THREE.Mesh(
    keep(new THREE.CircleGeometry(8.5, 96)),
    plateMaterial,
  );
  plate.position.z = -0.5;
  root.add(plate);
  const ringMaterial = keep(new THREE.MeshBasicMaterial());
  for (let radius = 1.2; radius < 8.5; radius += 0.55) {
    const ring = new THREE.Mesh(
      keep(new THREE.RingGeometry(radius, radius + 0.025, 128)),
      ringMaterial,
    );
    ring.position.z = -0.49;
    root.add(ring);
  }

  const jewelGeometry = keep(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24));
  jewelGeometry.rotateX(Math.PI / 2);
  const jewelMaterial = keep(
    new THREE.MeshStandardMaterial({
      metalness: 0.4,
      roughness: 0.25,
      emissiveIntensity: 0.25,
    }),
  );
  const steelMaterial = keep(
    new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3 }),
  );
  const wheels: Wheel[] = placeTrain(GEAR_TRAIN, GEAR_MODULE).map((gear) => {
    const geometry = keep(
      new THREE.ExtrudeGeometry(gearShape(THREE, gear), {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2,
        curveSegments: 18,
      }),
    );
    geometry.translate(0, 0, -0.11);
    const material = keep(
      new THREE.MeshStandardMaterial({
        metalness: 0.85,
        roughness: 0.38,
        emissiveIntensity: 0,
      }),
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(gear.x, gear.y, 0);
    root.add(mesh);
    const jewel = new THREE.Mesh(jewelGeometry, jewelMaterial);
    jewel.position.set(gear.x, gear.y, 0.2);
    root.add(jewel);
    return { ...gear, mesh, material, angle: 0, glow: 0, target: 0 };
  });

  const balance = new THREE.Group();
  balance.position.set(BALANCE_AT[0], BALANCE_AT[1], 0.1);
  root.add(balance);
  balance.add(
    new THREE.Mesh(
      keep(new THREE.TorusGeometry(1.25, 0.09, 12, 72)),
      steelMaterial,
    ),
  );
  balance.add(
    new THREE.Mesh(keep(new THREE.BoxGeometry(2.5, 0.12, 0.08)), steelMaterial),
  );
  const spiral = Array.from({ length: 261 }, (_, i) => {
    const angle = i * 0.09;
    const radius = 0.12 + angle * 0.028;
    return new THREE.Vector3(
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      0.14,
    );
  });
  const springMaterial = keep(
    new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8 }),
  );
  balance.add(
    new THREE.Line(
      keep(new THREE.BufferGeometry().setFromPoints(spiral)),
      springMaterial,
    ),
  );

  // Colors come from the design tokens, so the movement follows the theme.
  function paint(): void {
    const accent = new THREE.Color(token(canvas, "--color-accent"));
    const base = new THREE.Color(token(canvas, "--color-case"));
    const ink = new THREE.Color(token(canvas, "--color-text"));
    plateMaterial.color.copy(base).lerp(ink, 0.03);
    ringMaterial.color.copy(base).lerp(ink, 0.07);
    steelMaterial.color.copy(base).lerp(ink, 0.6);
    for (const wheel of wheels) {
      wheel.material.color.copy(base).lerp(ink, 0.45);
      wheel.material.emissive.copy(accent);
    }
    jewelMaterial.color.copy(accent);
    jewelMaterial.emissive.copy(accent);
    springMaterial.color.copy(accent);
    halo.color.copy(accent);
  }
  paint();

  const reduced = matchMedia(REDUCED_MOTION_QUERY);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let driver = 0;
  let speed = 0;
  let swing = 0;
  let clock = 0;
  let last = 0;
  let frame = 0;
  let running = false;
  let visible = true;
  let counts: Map<StageId, number> | null = null;

  function pose(): void {
    for (const wheel of wheels) {
      const parent = wheels.find((item) => item.stage === wheel.parent);
      wheel.angle = parent
        ? meshedAngle(parent.angle, parent.teeth, wheel.teeth, wheel.theta ?? 0)
        : driver;
      wheel.mesh.rotation.z = wheel.angle;
    }
    let brightest = wheels[0];
    for (const wheel of wheels) {
      wheel.material.emissiveIntensity = wheel.glow * 0.6;
      if (brightest && wheel.glow > brightest.glow) brightest = wheel;
    }
    if (brightest) {
      halo.intensity = brightest.glow * 18;
      halo.position.set(brightest.x, brightest.y, 2.4);
    }
  }

  function render(): void {
    renderer.render(scene, camera);
  }

  function step(now: number): void {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    clock += dt;
    speed += ((running ? RUN_SPEED : 0) - speed) * Math.min(dt * 2.5, 1);
    driver += speed * dt;
    swing += ((running ? BALANCE_SWING : 0) - swing) * Math.min(dt * 3, 1);
    balance.rotation.z = swing * Math.sin(clock * Math.PI * 2 * BALANCE_HZ);
    let settled = !running && Math.abs(speed) < 0.002 && swing < 0.01;
    for (const wheel of wheels) {
      const rate = wheel.target > wheel.glow ? GLOW_RISE : GLOW_FALL;
      wheel.glow += (wheel.target - wheel.glow) * Math.min(dt * rate, 1);
      if (Math.abs(wheel.target - wheel.glow) > 0.004) settled = false;
    }
    pointer.x += (pointer.tx - pointer.x) * Math.min(dt * 4, 1);
    pointer.y += (pointer.ty - pointer.y) * Math.min(dt * 4, 1);
    if (
      Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) >
      0.002
    ) {
      settled = false;
    }
    root.rotation.set(-0.18 + pointer.y * 0.08, pointer.x * 0.12, 0);
    glint.position.set(4 + pointer.x * 6, 2 - pointer.y * 4, 7);
    pose();
    render();
    if (settled) last = 0;
    else wake();
  }

  function wake(): void {
    if (!frame && visible && !document.hidden) {
      frame = requestAnimationFrame(step);
    }
  }

  // Reduced motion: one still frame with the current state, no turning.
  function draw(): void {
    if (!reduced.matches) {
      wake();
      return;
    }
    for (const wheel of wheels) wheel.glow = wheel.target;
    root.rotation.set(-0.18, 0, 0);
    pose();
    if (visible) render();
  }

  const host = canvas.parentElement ?? canvas;
  const resize = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width / height < 1.6 ? 40 : 30;
    camera.updateProjectionMatrix();
    draw();
  });
  resize.observe(host);
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) draw();
  });
  seen.observe(canvas);
  const theme = new MutationObserver(() => {
    paint();
    draw();
  });
  theme.observe(document.documentElement, { attributeFilter: ["data-theme"] });

  const panel = canvas.closest("header") ?? host;
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || reduced.matches) return;
    const rect = panel.getBoundingClientRect();
    pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    wake();
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
    if (!reduced.matches) wake();
  };
  const onVisible = () => {
    if (!document.hidden) draw();
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
  };
  panel.addEventListener("pointermove", onPointer);
  panel.addEventListener("pointerleave", onLeave);
  addEventListener("blur", onLeave);
  document.addEventListener("visibilitychange", onVisible);
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    update(spans, isRunning) {
      const next = stageCounts(spans);
      // A restored chat sets the state silently; only new spans move the wheels.
      const previous = counts;
      counts = next;
      running = isRunning;
      for (const wheel of wheels) {
        const open = spans.some(
          (span) => span.stage === wheel.stage && span.end === null,
        );
        wheel.target = open ? 1 : 0;
        const started =
          previous !== null &&
          (next.get(wheel.stage) ?? 0) > (previous.get(wheel.stage) ?? 0);
        if (started) {
          wheel.glow = 1;
          speed += STAGE_KICK;
        }
      }
      draw();
    },
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
      theme.disconnect();
      panel.removeEventListener("pointermove", onPointer);
      panel.removeEventListener("pointerleave", onLeave);
      removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisible);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Runs the watch movement on `canvas` (P5.10): one wheel per pipeline stage,
 * turning and lighting only when that stage's span starts. three.js loads
 * lazily on the client; without WebGL the canvas stays empty.
 */
export function useMovement(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  spans: TraceSpan[],
  running: boolean,
): void {
  const movement = useRef<Movement | null>(null);
  const latest = useRef({ spans, running });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    import("three").then((THREE) => {
      if (cancelled) return;
      movement.current = createMovement(THREE, canvas);
      movement.current?.update(latest.current.spans, latest.current.running);
    });
    return () => {
      cancelled = true;
      movement.current?.dispose();
      movement.current = null;
    };
  }, [canvasRef]);

  useEffect(() => {
    latest.current = { spans, running };
    movement.current?.update(spans, running);
  }, [spans, running]);
}
