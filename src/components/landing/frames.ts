"use client";

/**
 * Hero kadrları (videodan çıxarılmış 120 WebP). Preloader yoxdur — arxa planda yüklənir.
 *
 * Performans: kadrlar sıxılmış Blob kimi saxlanılır (~50–110KB/ədəd), canvas-a isə yalnız
 * əvvəlcədən açılmış ImageBitmap çəkilir. Bitmap-lar `createImageBitmap` ilə arxa axında
 * açılır və yalnız cari kadrın ətrafında (pəncərə) saxlanılır — 120 açılmış kadr ~560MB
 * yaddaş tutardı. Əvvəl canvas hər yeni kadrda WebP-ni əsas axında açırdı (55–85ms donma).
 */

export const FRAME_COUNT = 120;

export function framePath(set: "desktop" | "mobile", index: number) {
  return `/frames/${set}/f_${String(index + 1).padStart(3, "0")}.webp`;
}

/** 3D halqa və kiçik kapsullar üçün 960px versiyalar (ekranda ~600px görünür). */
export function ringPath(frame: number) {
  return `/frames/ring/f_${String(frame + 1).padStart(3, "0")}.webp`;
}

const blobs: (Blob | null)[] = new Array(FRAME_COUNT).fill(null);
const bitmaps = new Map<number, ImageBitmap>();
const pending = new Set<number>();
const bitmapListeners = new Set<(index: number) => void>();
let started = false;
let center = 0;

const BEHIND = 6;
const AHEAD = 14;
const KEEP = 24;

async function decode(i: number) {
  const blob = blobs[i];
  if (!blob || bitmaps.has(i) || pending.has(i)) return;
  pending.add(i);
  try {
    const bm = await createImageBitmap(blob);
    // bu arada pəncərədən çıxıbsa saxlamırıq
    if (Math.abs(i - center) > KEEP) bm.close();
    else {
      bitmaps.set(i, bm);
      bitmapListeners.forEach((l) => l(i));
    }
  } catch {
    /* zədəli fayl — atlanır */
  } finally {
    pending.delete(i);
  }
}

function fill() {
  for (let i = Math.max(0, center - BEHIND); i <= Math.min(FRAME_COUNT - 1, center + AHEAD); i++) decode(i);
  bitmaps.forEach((bm, i) => {
    if (Math.abs(i - center) > KEEP) {
      bm.close();
      bitmaps.delete(i);
    }
  });
}

async function load(set: "desktop" | "mobile", i: number) {
  try {
    const res = await fetch(framePath(set, i));
    if (res.ok) blobs[i] = await res.blob();
  } catch {
    /* şəbəkə xətası — atlanır */
  }
  if (Math.abs(i - center) <= AHEAD) decode(i);
}

export const frames = {
  start() {
    if (started) return;
    started = true;
    const set = window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
    // birinci kadr əvvəl, sonra 6 paralel axın
    load(set, 0).then(() => {
      let next = 1;
      const worker = async () => {
        while (next < FRAME_COUNT) await load(set, next++);
      };
      for (let k = 0; k < 6; k++) worker();
    });
  },
  /** Cari kadrı bildirir — ətrafındakı kadrlar arxa axında hazırlanır. */
  focus(i: number) {
    if (i === center) return;
    center = i;
    fill();
  },
  /** i-yə ən yaxın hazır kadr (əvvəlcə i özü, sonra geriyə, sonra irəliyə). */
  nearest(i: number): ImageBitmap | null {
    for (let d = 0; d < FRAME_COUNT; d++) {
      const back = bitmaps.get(i - d);
      if (back) return back;
      const fwd = bitmaps.get(i + d);
      if (fwd) return fwd;
    }
    return null;
  },
  bitmap(i: number) {
    return bitmaps.get(i) ?? null;
  },
  onBitmap(l: (index: number) => void) {
    bitmapListeners.add(l);
    return () => void bitmapListeners.delete(l);
  },
};

/* Birinci kadr hazır olanda hero UI-ı bir dəfə görünsün */
let introDone = false;
const introListeners = new Set<() => void>();

export const intro = {
  finish() {
    // kadr 0 pəncərədən çıxıb yenidən açılanda təkrar çağırıla bilər — yalnız bir dəfə işləyir
    if (introDone) return;
    introDone = true;
    introListeners.forEach((l) => l());
    introListeners.clear();
  },
  onFinish(l: () => void) {
    if (introDone) {
      l();
      return () => {};
    }
    introListeners.add(l);
    return () => void introListeners.delete(l);
  },
};
