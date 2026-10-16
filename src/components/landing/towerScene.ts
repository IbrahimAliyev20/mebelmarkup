/*
 * 3D bina səhnəsi — Building3D bunu DİNAMİK yükləyir (import("./towerScene")), ona görə
 * three.js (~600KB) əsas JS paketinə düşmür və ilk açılışı ağırlaşdırmır.
 *
 * Real model: public/3d/tower.glb (Sketchfab, CC-BY). Orijinaldan yalnız bina saxlanılıb,
 * hissələr materiala görə birləşdirilib, meshopt ilə sıxışdırılıb (11.8MB → 1.6MB).
 * Materiallar EVVO üslubunda yenidən verilir. Şeyderlər `compileAsync` ilə bloklamadan
 * kompilyasiya olunur — əvvəl ilk render 2.6s donma yaradırdı.
 *
 * Hazırlıq addım-addımdır: hər ağır addımdan əvvəl `step()` gözlənilir (Building3D onu quiet.ts-ə bağlayır —
 * yalnız istifadəçi scroll etməyəndə). Mühit xəritəsinin (PMREM) GGX şeyderi də bloklamadan kompilyasiya
 * olunur — əvvəl o, əsas axını ~0.4s sinxron tuturdu.
 *
 * Mərtəbə seçimi: raycast yalnız bina qabığına (~44 min üçbucaq), siçanlı cihazlarda BVH ilə (three-mesh-bvh) —
 * bir yoxlama ~0.07ms. Əvvəl hər siçan hərəkəti modelin 340 min üçbucağını bir-bir yoxlayırdı (~45ms donma).
 * Toxunma ekranında seçim yalnız toxunuşla (click) olur — scroll jesti raycast işə salmır.
 */
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import { device, gsap } from "./gsap";
import { GROUND_TOP, FLOOR_H, RES_FLOORS, ROOF_TOP, floorAt, floorBase, floorHeight } from "./tower";

export type TowerFrame = {
  /** binanın Y oxu ətrafında fırlanması (radian) */
  rotationY: number;
  /** kəsici müstəvinin hündürlüyü — bina aşağıdan yuxarı "tikilir" */
  clipH: number;
  /** mərtəbə seçimi aktivdir (bina tam tikilib) */
  selecting: boolean;
};

export type TowerScene = {
  /** hər kadr çağırılır; yalnız nəsə dəyişəndə render edir */
  frame: (s: TowerFrame) => void;
  dispose: () => void;
};

// Seçimə daxil olmayan materiallar: pərdələr şüşənin arxasındadır (şüa əvvəl şüşəyə dəyir),
// "Material.001" isə 230 min üçbucaqlıq çərçivə/məhəccər detalıdır — arxasındakı fasad eyni mərtəbədir.
const PICK_SKIP = new Set(["Material.001", "Cortina1"]);

// addımlar arasında ən azı növbəti tapşırığa keçmək (step verilməyibsə)
const nextTask = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

const loadHDR = (url: string) => new Promise<THREE.DataTexture>((res, rej) => new HDRLoader().load(url, res, undefined, rej));

export async function createTowerScene(
  el: HTMLElement,
  opts: { initialFloor: number; onFloor: (i: number) => void; step?: () => Promise<void> },
): Promise<TowerScene> {
  const step = opts.step ?? nextTask;
  // telefon/planşet: kölgə yoxdur, piksel sıxlığı 1 — mobil GPU üçün ən ağır iş bunlardır
  const lowPower = device.lowPower();
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(lowPower ? 1 : Math.min(window.devicePixelRatio, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T) => (disposables.push(d), d);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 800);
  const target = new THREE.Vector3(0, 20, 0);

  /* ---- işıq ---- */
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-70, 110, 60);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 80, bottom: -50, near: 10, far: 300 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, new THREE.HemisphereLight(0xf3f6fc, 0x7d8597, 0.4));

  /* ---- kəsici müstəvi: yalnız y < h olan hissə görünür ---- */
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const clipping = { clippingPlanes: [clipPlane], clipShadows: true };

  /* ---- materiallar (EVVO üslubu: ağ, soyuq boz, göyü əks etdirən şüşə) ---- */
  const glass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x5d6f7a, metalness: 0.6, roughness: 0.05, envMapIntensity: 2.2,
      transparent: true, opacity: 0.92, clearcoat: 1, side: THREE.DoubleSide, ...clipping,
    }),
  );
  const std = (color: number, rest: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide, ...clipping, ...rest }));
  const MATERIALS: Record<string, THREE.Material> = {
    "Bianco.001": std(0xf2f4f7),
    "": std(0xeceff3, { roughness: 0.8 }),
    concrete: std(0xc9ced6, { roughness: 0.95 }),
    "Material.001": std(0xdfe3e9, { roughness: 0.8 }),
    Grigio: std(0x3c4450, { metalness: 0.5, roughness: 0.4 }),
    Cortina1: std(0xe9edf3, { roughness: 1 }),
    Piscina: std(0x6fb7e6, { roughness: 0.1, metalness: 0.1 }),
    Trasp: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xcfe0ea, roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.5,
        depthWrite: false, side: THREE.DoubleSide, ...clipping,
      }),
    ),
    "Vetro.001": glass,
    "Vetro.002": glass,
  };

  const building = new THREE.Group();
  scene.add(building);
  const pickables: THREE.Mesh[] = [];
  const footprint = new THREE.Vector3(56, 0, 62);

  /* ---- maket altlığı: kənarlara doğru səhifə fonuna əriyir ---- */
  const fade = document.createElement("canvas");
  fade.width = fade.height = 256;
  const fg = fade.getContext("2d")!;
  const grad = fg.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.55, "#bbb");
  grad.addColorStop(1, "#000");
  fg.fillStyle = grad;
  fg.fillRect(0, 0, 256, 256);
  const plaza = new THREE.Mesh(
    track(new THREE.CircleGeometry(110, 64)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xe4e9f1, roughness: 1, transparent: true, depthWrite: false,
        alphaMap: track(new THREE.CanvasTexture(fade)),
      }),
    ),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  building.add(plaza);

  /* ---- tikinti xətti: kəsik hündürlüyündə EVVO göyü kontur ---- */
  const scan = new THREE.LineSegments(
    track(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.001, 1))),
    track(new THREE.LineBasicMaterial({ color: 0x3566e8 })),
  );
  building.add(scan);

  /* ---- seçim qabığı: mərtəbədən mərtəbəyə sürüşür ---- */
  const shellGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const shell = new THREE.Mesh(
    shellGeo,
    track(new THREE.MeshBasicMaterial({ color: 0x3566e8, transparent: true, opacity: 0.2, depthWrite: false })),
  );
  shell.add(new THREE.LineSegments(track(new THREE.EdgesGeometry(shellGeo)), track(new THREE.LineBasicMaterial({ color: 0x3566e8 }))));
  shell.visible = false;
  building.add(shell);

  let dirty = true;
  let hovered = opts.initialFloor;
  const placeShell = (i: number, instant = false) => {
    const h = floorHeight(i);
    // overwrite: tez-tez mərtəbə dəyişəndə köhnə tween-lər paralel işləməsin
    gsap.to(shell.position, {
      y: floorBase(i) + h / 2,
      duration: instant ? 0 : 0.55,
      ease: "out",
      overwrite: true,
      onUpdate: () => void (dirty = true),
    });
    gsap.to(shell.scale, { y: h + 0.08, duration: instant ? 0 : 0.55, ease: "out", overwrite: true });
  };

  /* ---- yükləmə: HDRI + model paralel ---- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const [hdr, gltf] = await Promise.all([loadHDR("/3d/sky.hdr"), loader.loadAsync("/3d/tower.glb")]);

  // PMREM şeyderlərini (ekvirektangulyar + GGX süzgəci) əvvəlcədən, bloklamadan kompilyasiya et.
  // three bunun üçün açıq API vermir — daxili sahələr yoxdursa (başqa versiya) adi yolla davam edir.
  await step();
  const pmremInternals = pmrem as unknown as {
    _setSize?: (cubeSize: number) => void;
    _allocateTargets?: () => THREE.WebGLRenderTarget;
    _ggxMaterial?: THREE.Material | null;
    _equirectMaterial?: THREE.Material | null;
  };
  if (pmremInternals._setSize && pmremInternals._allocateTargets) {
    pmremInternals._setSize(hdr.image.width / 4); // fromEquirectangular da eyni ölçünü seçir
    pmremInternals._allocateTargets().dispose();
    // Proqram variantı real çəkilişdəki ilə eyni olmalıdır, yoxsa three yenisini (yenə sinxron) qurur:
    // PMREM render hədəfinə çəkir (tone mapping yox, xətti rəng) və həndəsəsində `position` var.
    const rt = new THREE.WebGLRenderTarget(1, 1);
    const flat = new THREE.OrthographicCamera();
    const quad = new THREE.BufferGeometry();
    quad.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    renderer.setRenderTarget(rt);
    pmrem.compileEquirectangularShader();
    const ready = Promise.all(
      [pmremInternals._ggxMaterial, pmremInternals._equirectMaterial]
        .filter((m): m is THREE.Material => !!m)
        .map((m) => renderer.compileAsync(new THREE.Mesh(quad, m), flat)),
    );
    renderer.setRenderTarget(null);
    await ready;
    rt.dispose();
    quad.dispose();
  }
  await step();
  const env = track(pmrem.fromEquirectangular(hdr).texture);
  scene.environment = env;
  hdr.dispose();

  await step();
  const model = gltf.scene;
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.material as THREE.Material).name ?? "";
    mesh.material = MATERIALS[name] ?? MATERIALS[""];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (!PICK_SKIP.has(name)) pickables.push(mesh);
    track(mesh.geometry);
  });
  const bb = new THREE.Box3().setFromObject(model);
  const c = bb.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -bb.min.y, -c.z);
  bb.getSize(footprint);
  building.add(model);
  scan.scale.set(footprint.x + 1.5, 1, footprint.z + 1.5);
  shell.scale.set(footprint.x + 0.8, 1, footprint.z + 0.8);
  placeShell(hovered, true);

  /* ---- ölçü ---- */
  const resize = () => {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // <1024: mobil/planşet düzülüşü (başlıq yuxarıda, rəqəmlər aşağıda, bina ortada)
    const mobile = width < 1024;
    const narrow = width < 640;
    // dar ekranda bina başlıqla aşağıdakı rəqəmlər arasındakı sahəyə sığsın deyə uzaqlaşır
    const dist = narrow ? 430 : mobile ? 330 : 240;
    camera.position.set(dist * 0.66, dist * 0.3, dist * 0.7);
    camera.lookAt(target);
    // desktopda bina sağa, mətnin yanına sürüşür (canvas tam ekran qalır); mobildə bir az yuxarı
    if (mobile) camera.setViewOffset(width, height, 0, height * 0.04, width, height);
    else camera.setViewOffset(width, height, -width * 0.17, 0, width, height);
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();

  // şeyderləri əsas axını bloklamadan əvvəlcədən kompilyasiya et (ilk render donmasın)
  await step();
  shell.visible = true;
  scan.visible = true;
  await renderer.compileAsync(scene, camera);
  // "isinmə" render-i: həndəsə buferlərini və kölgə xəritəsini GPU-ya indi, sakit anda yüklə —
  // yoxsa bu iş bölməyə girən an ilk render-də (~0.8s donma) baş verirdi
  await step();
  renderer.render(scene, camera);
  shell.visible = false;

  el.appendChild(renderer.domElement);
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  /* ---- seçim üçün BVH (yalnız siçanlı cihazlar): sakit anlarda, hər mesh ayrıca addımda (ən böyüyü ~40ms) ---- */
  let disposed = false;
  const hover = device.hover();
  if (hover) {
    void (async () => {
      for (const mesh of pickables) {
        await step();
        if (disposed) return;
        computeBoundsTree.call(mesh.geometry);
        mesh.raycast = acceleratedRaycast;
      }
    })();
  }

  /* ---- siçan: parallaks + mərtəbə seçimi (kadrda ən çox bir dəfə) ---- */
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true;
  const pointer = new THREE.Vector2();
  const mouse = { x: 0, y: 0 };
  const local = new THREE.Vector3();
  let selecting = false;
  let wantPick = false;
  const aim = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    mouse.x = pointer.x;
    mouse.y = pointer.y;
    if (selecting) wantPick = true;
  };
  // siçan: hərəkətlə; toxunma/qələm: yalnız toxunuşla (scroll jestinin başlanğıcı seçim etmir)
  const onPointer = (e: PointerEvent) => e.pointerType === "mouse" && aim(e);
  const pick = () => {
    wantPick = false;
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (!hit) return;
    building.worldToLocal(local.copy(hit.point));
    if (local.y > GROUND_TOP + RES_FLOORS * FLOOR_H) return; // dam
    const i = floorAt(local.y);
    if (i === hovered) return;
    hovered = i;
    placeShell(i);
    opts.onFloor(i);
  };
  renderer.domElement.addEventListener("pointermove", onPointer);
  renderer.domElement.addEventListener("click", aim);

  // scrub-un sonundakı hiss olunmaz dəyişikliklər üçün səhnə yenidən çəkilmir
  let lastRot = NaN;
  let lastClip = NaN;
  return {
    frame(s) {
      // siçana görə yüngül parallaks — gecikmə ilə, yaylı kimi
      const ry = mouse.y * 0.02 - building.rotation.x;
      const rx = mouse.x * 2 - building.position.x;
      if (Math.abs(ry) > 0.0002 || Math.abs(rx) > 0.002) {
        building.rotation.x += ry * 0.05;
        building.position.x += rx * 0.05;
        dirty = true;
      }
      if (!(Math.abs(s.rotationY - lastRot) <= 5e-5 && Math.abs(s.clipH - lastClip) <= 5e-4) || s.selecting !== selecting) {
        lastRot = s.rotationY;
        lastClip = s.clipH;
        dirty = true;
      }
      if (dirty) {
        dirty = false;
        selecting = s.selecting;
        building.rotation.y = s.rotationY;
        clipPlane.constant = s.clipH;
        scan.position.y = s.clipH;
        scan.visible = s.clipH > 0.5 && s.clipH < ROOF_TOP - 0.5;
        shell.visible = s.selecting;
        renderer.render(scene, camera);
      }
      if (wantPick && selecting) pick();
    },
    dispose() {
      disposed = true;
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointer);
      renderer.domElement.removeEventListener("click", aim);
      disposables.forEach((d) => d.dispose());
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
