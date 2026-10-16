import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { COLORS } from "./content";

/*
 * Forma studiyası — hekayə bölməsinin arxasındakı canlı səhnə.
 * Həqiqi 3D maketlər (public/forma/models/*.glb) yüklənir; scroll onları sökür,
 * ölçü xətlərini çəkir və yenidən yığır. Rəng seçimi parça materialına anında keçir.
 */

export type ScreenPoint = { x: number; y: number };
export type Annotation = { w0: ScreenPoint; w1: ScreenPoint; h0: ScreenPoint; h1: ScreenPoint; d0: ScreenPoint; d1: ScreenPoint };
export type Measurements = { width: string; height: string; depth: string };

export type StudioScene = {
  setColor: (hex: string) => void;
  dispose: () => void;
};

type Part = {
  object: THREE.Object3D;
  home: THREE.Vector3;
  away: THREE.Vector3;
  spin: THREE.Euler;
  baseRotation: THREE.Euler;
};

const SOFA_WIDTH = 4;          // səhnə vahidi ilə divanın eni
const SOFA_WIDTH_CM = 240;     // eyni divan santimetrlə — ölçü yazıları buradan hesablanır

export function createStudioScene(options: {
  canvas: HTMLCanvasElement;
  story: HTMLElement;
  onReady: () => void;
  /** Kreslo da yüklənib GPU-ya hazırlananda (və ya alınmayanda) çağırılır. */
  onComplete?: () => void;
  onMeasure: (measurements: Measurements) => void;
  onAnnotate: (points: Annotation, strength: number) => void;
}): StudioScene {
  const { canvas, story, onReady, onComplete, onMeasure, onAnnotate } = options;
  gsap.registerPlugin(ScrollTrigger);

  const compact = window.matchMedia("(max-width: 760px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !compact, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.5 : 1.85));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const key = new THREE.SpotLight(0xfff1dd, 70, 0, 0.55, 0.9);
  key.position.set(4.2, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
  key.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-6, 4, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x8e857a, 0.45));

  const room = new THREE.Group();
  scene.add(room);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.ShadowMaterial({ opacity: 0.24 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const dustCount = compact ? 180 : 420;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustPositions.length; i++) dustPositions[i] = (Math.random() - 0.5) * 16;
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ size: 0.022, color: 0xb3a999, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  scene.add(dust);

  /* ---- maketlər ---- */
  const parts: Part[] = [];
  const fabrics: THREE.MeshStandardMaterial[] = [];
  let blueprint: THREE.LineSegments | null = null;
  const anchorsLocal = {
    w0: new THREE.Vector3(), w1: new THREE.Vector3(),
    h0: new THREE.Vector3(), h1: new THREE.Vector3(),
    d0: new THREE.Vector3(), d1: new THREE.Vector3(),
  };
  const anchorKeys = Object.keys(anchorsLocal) as (keyof typeof anchorsLocal)[];
  const projected = { w0: { x: 0, y: 0 }, w1: { x: 0, y: 0 }, h0: { x: 0, y: 0 }, h1: { x: 0, y: 0 }, d0: { x: 0, y: 0 }, d1: { x: 0, y: 0 } };
  const scratch = new THREE.Vector3();
  let loaded = false;
  let disposed = false;
  let activeColor: string = COLORS[0].value;

  /** Maketi verilmiş enə görə ölçüləndirir, mərkəzləyir və döşəməyə oturdur. */
  const place = (model: THREE.Object3D, scale: number, x: number, rotationY: number) => {
    model.scale.setScalar(scale);
    model.rotation.y = rotationY;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(x - center.x, -box.min.y, -center.z);
    model.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(model);
  };

  /** Maketin materiallarını səhnəyə hazırlayır və parça materiallarını yığır. */
  const prepare = (model: THREE.Object3D) => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial && /fabric|velvet|parça/i.test(`${material.name} ${object.name}`)) {
          fabrics.push(material);
        }
      });
    });
  };

  const register = (object: THREE.Object3D, away: THREE.Vector3, spin: THREE.Euler) => {
    parts.push({
      object,
      home: object.position.clone(),
      away: object.position.clone().add(away),
      baseRotation: object.rotation.clone(),
      spin,
    });
  };

  /**
   * Obyektin shader-lərini və teksturalarını əvvəlcədən GPU-ya hazırlayır.
   * Əks halda three.js bunu obyekt kadra ilk girdiyi anda edir və scroll donur.
   */
  const warm = async (object: THREE.Object3D) => {
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes.push(mesh);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) =>
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) renderer.initTexture(value);
        }),
      );
    });
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    // kadrdan kənarda olsa da bir dəfə çəkilsin ki, geometriya da yüklənsin
    meshes.forEach((mesh) => (mesh.frustumCulled = false));
    renderer.render(scene, camera);
    meshes.forEach((mesh) => (mesh.frustumCulled = true));
  };

  const loader = new GLTFLoader();
  // əvvəlcə divan görünür, kreslo arxa planda sonradan əlavə olunur
  loader
    .loadAsync("/forma/models/sofa.glb")
    .then((sofaFile) => {
      if (disposed) return;
      const sofa = sofaFile.scene;
      sofa.updateMatrixWorld(true);
      const native = new THREE.Box3().setFromObject(sofa).getSize(new THREE.Vector3());
      const scale = SOFA_WIDTH / native.x;
      const sofaBox = place(sofa, scale, 0, 0);
      room.add(sofa);

      loader
        .loadAsync("/forma/models/chair.glb")
        .then((chairFile) => {
          if (disposed) return;
          const chair = chairFile.scene;
          place(chair, scale, sofaBox.max.x + 1.25, -0.7);
          prepare(chair);
          setFabricColor(activeColor, 0);
          room.add(chair);
          register(chair, new THREE.Vector3(1.6, 0.5, -0.5), new THREE.Euler(0, -0.4, 0.12));
          return warm(chair);
        })
        .catch(() => {
          // kreslo yüklənməsə, divan tək qalır
        })
        .finally(() => {
          if (!disposed) onComplete?.();
        });

      const size = sofaBox.getSize(new THREE.Vector3());
      const centimetres = (value: number) => `${Math.round((value / size.x) * SOFA_WIDTH_CM)} sm`;
      onMeasure({ width: `${SOFA_WIDTH_CM} sm`, height: centimetres(size.y), depth: centimetres(size.z) });

      prepare(sofa);
      if (fabrics.length) setFabricColor(COLORS[0].value, 0);

      // sökülmə: hər maket hissəsi öz mərkəzindən kənara və yuxarı-aşağı açılır
      const pivot = sofaBox.getCenter(new THREE.Vector3());
      const pieces = sofa.children.filter((child) => child.type !== "Camera");
      pieces.forEach((piece, index) => {
        const box = new THREE.Box3().setFromObject(piece);
        const center = box.getCenter(new THREE.Vector3());
        const lift = THREE.MathUtils.clamp((center.y - pivot.y) * 1.5, -0.75, 1.1) + 0.3;
        const sideways = Math.sign(center.x - pivot.x || 1) * 0.22;
        register(piece, new THREE.Vector3(sideways, lift, (center.z - pivot.z) * 0.8), new THREE.Euler(0.08 * (index + 1), 0, 0.05 * (index - 1)));
      });

      blueprint = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x * 1.02, size.y * 1.04, size.z * 1.04)),
        new THREE.LineBasicMaterial({ color: 0x3f5a46, transparent: true, opacity: 0 }),
      );
      blueprint.position.copy(pivot);
      room.add(blueprint);

      const pad = 0.08;
      anchorsLocal.w0.set(sofaBox.min.x, sofaBox.min.y + 0.02, sofaBox.max.z + pad);
      anchorsLocal.w1.set(sofaBox.max.x, sofaBox.min.y + 0.02, sofaBox.max.z + pad);
      anchorsLocal.h0.set(sofaBox.max.x + pad, sofaBox.min.y + 0.02, sofaBox.max.z);
      anchorsLocal.h1.set(sofaBox.max.x + pad, sofaBox.max.y, sofaBox.max.z);
      anchorsLocal.d0.set(sofaBox.max.x + pad, sofaBox.min.y + 0.02, sofaBox.max.z);
      anchorsLocal.d1.set(sofaBox.max.x + pad, sofaBox.min.y + 0.02, sofaBox.min.z);

      loaded = true;
      sync();
    })
    .catch(() => {
      // maket yüklənməsə, səhifə foto fonu ilə qalır
    });

  function setFabricColor(hex: string, duration = 0.9) {
    activeColor = hex;
    const target = new THREE.Color(hex);
    fabrics.forEach((material) => {
      if (duration === 0) material.color.copy(target);
      else gsap.to(material.color, { r: target.r, g: target.g, b: target.b, duration, ease: "power2.out", overwrite: true });
      if ("sheenColor" in material) {
        const sheen = (material as THREE.MeshPhysicalMaterial).sheenColor;
        const soft = target.clone().lerp(new THREE.Color(0xffffff), 0.45);
        if (duration === 0) sheen.copy(soft);
        else gsap.to(sheen, { r: soft.r, g: soft.g, b: soft.b, duration, ease: "power2.out", overwrite: true });
      }
    });
  }

  /* ---- scroll xoreoqrafiyası ---- */
  const rig = { angle: 0.52, height: 1.65, radius: 8.4, offsetX: 1.15, turn: 0, look: 1, explode: 0, roll: 0, shift: 0 };
  const pointer = { x: 0, y: 0 };
  const onPointerMove = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth - 0.5;
    pointer.y = event.clientY / window.innerHeight - 0.5;
  };
  if (window.matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", onPointerMove, { passive: true });

  const timeline = gsap.timeline({ scrollTrigger: { trigger: story, start: "top top", end: "bottom bottom", scrub: 1.1 } });
  timeline.to(rig, { angle: 1.38, height: 1.1, radius: 6.1, turn: 0.45, look: 0.95, shift: 0.19, duration: 1, ease: "power1.inOut" });
  timeline.to(rig, { angle: -0.3, height: 2.25, radius: 9.6, offsetX: 0, turn: -0.12, look: 1.15, shift: -0.17, duration: 1, ease: "power1.inOut" });
  timeline.to(rig, { explode: 1, duration: 0.72, ease: "power2.inOut" }, "<0.14");
  timeline.to(rig, { angle: 0.95, height: 1.5, radius: 8.2, turn: -0.3, look: 1, shift: 0.2, duration: 1, ease: "power1.inOut" });
  timeline.to(rig, { explode: 0, duration: 0.6, ease: "power2.inOut" }, "<");

  const velocity = ScrollTrigger.create({
    trigger: story,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      rig.roll = gsap.utils.clamp(-0.05, 0.05, self.getVelocity() / 34000);
    },
  });

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = window.innerWidth < 760 ? 47 : 32;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Timer();
  let active = false;
  let ready = false;
  let frame: number | null = null;

  const render = () => {
    if (!active || !loaded || document.hidden) {
      frame = null;
      return;
    }
    clock.update();
    const time = clock.getElapsed();
    const explode = rig.explode;

    for (const part of parts) {
      part.object.position.lerpVectors(part.home, part.away, explode);
      part.object.rotation.set(
        part.baseRotation.x + part.spin.x * explode,
        part.baseRotation.y + part.spin.y * explode,
        part.baseRotation.z + part.spin.z * explode,
      );
    }
    if (blueprint) (blueprint.material as THREE.LineBasicMaterial).opacity = explode * 0.4;
    (floor.material as THREE.ShadowMaterial).opacity = 0.24 * (1 - explode * 0.75);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const narrow = width < 760;
    const angle = rig.angle + pointer.x * 0.22;
    const radius = narrow ? rig.radius * 1.32 : rig.radius;
    camera.setViewOffset(width, height, (narrow ? rig.shift * 0.35 : rig.shift) * width, 0, width, height);
    camera.position.set(Math.sin(angle) * radius, rig.height - pointer.y * 0.45 + explode * 0.3, Math.cos(angle) * radius);
    camera.lookAt(0, rig.look, 0);
    camera.rotateZ(rig.roll);

    room.position.x = narrow ? rig.offsetX * 0.3 : rig.offsetX;
    room.position.y = Math.sin(time * 0.8) * 0.012;
    room.rotation.y = rig.turn;
    dust.rotation.y = time * 0.02;
    dust.position.y = Math.sin(time * 0.3) * 0.2;

    renderer.render(scene, camera);

    if (explode > 0.02) {
      room.updateMatrixWorld(true);
      for (const anchor of anchorKeys) {
        scratch.copy(anchorsLocal[anchor]).applyMatrix4(room.matrixWorld).project(camera);
        projected[anchor].x = (scratch.x * 0.5 + 0.5) * width;
        projected[anchor].y = (-scratch.y * 0.5 + 0.5) * height;
      }
      onAnnotate(projected, gsap.utils.clamp(0, 1, (explode - 0.25) / 0.5));
    } else {
      onAnnotate(projected, 0);
    }

    if (!ready) {
      ready = true;
      onReady();
    }
    frame = requestAnimationFrame(render);
  };

  const sync = () => {
    if (!active || !loaded || document.hidden) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    } else if (frame === null) {
      render();
    }
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      sync();
    },
    { rootMargin: "25% 0px" },
  );
  observer.observe(story);
  document.addEventListener("visibilitychange", sync);

  return {
    setColor(hex) {
      setFabricColor(hex);
    },
    dispose() {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      velocity.kill();
      timeline.scrollTrigger?.kill();
      timeline.kill();
      fabrics.forEach((material) => gsap.killTweensOf(material.color));
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            material.dispose();
          });
        }
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
