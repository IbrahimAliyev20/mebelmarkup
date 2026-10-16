/**
 * Scroll ilə sürülən kadr ardıcıllığı.
 *
 * Kadrlar (WebP Blob-ları) artıq yaddaşdadır — burada yalnız decode idarə olunur.
 * `createImageBitmap` kadrı ayrı thread-də açır, canvas nisbətinə kəsir və lazım
 * olsa kiçildir. Cari mövqenin qabağında (hərəkət istiqamətində) və arxasında bir
 * pəncərə həmişə hazır saxlanılır, uzaqdakılar `close()` ilə dərhal yaddaşdan
 * atılır. Main thread-ə yalnız hazır bitmap-in `drawImage` ilə çəkilməsi qalır,
 * hədəf kadr hələ hazır deyilsə ən yaxın hazır kadr çəkilir — görüntü heç vaxt donmur.
 */
export type FrameStats = {
  target: number;
  shown: number;
  /** Hədəf kadr hazır olmadığı üçün başqa kadr çəkilən hallar. */
  misses: number;
  hits: number;
  decoding: number;
  decoded: number;
  /** Açıq bitmap-lərin təxmini yaddaşı (MB). */
  memory: number;
};

export type FrameSequence = {
  /** 0…1 arası mövqe; kadr dəyişməyibsə heç nə etmir. */
  draw: (progress: number) => void;
  stats: () => FrameStats;
  dispose: () => void;
};

/** Video kadrları üçün 1:1 piksel bəsdir. */
const DPR_CAP = 1;
/** Görünən bölmədə hərəkət istiqamətində əvvəlcədən açılan kadrlar. */
const AHEAD_DEFAULT = 40;
const BEHIND_DEFAULT = 14;
/** Görünüşdən uzaq bölmədə yalnız cari mövqenin ətrafı saxlanılır. */
const PARK_AHEAD = 6;
const PARK_BEHIND = 2;
/** İstiqamət dəyişəndə dərhal atılmasın deyə pəncərənin kənarında ehtiyat. */
const MARGIN = 10;
/** Eyni anda decode olunan kadrların sayı. */
const PARALLEL_DEFAULT = 6;

type Crop = { sx: number; sy: number; sw: number; sh: number; dw: number; dh: number };

/** Böyük sürətlə scroll olunan səhnə üçün pəncərə genişləndirilə bilər. */
export type WindowOptions = { ahead?: number; behind?: number; parallel?: number };

export function createFrameSequence(
  canvas: HTMLCanvasElement,
  frames: readonly Blob[],
  frameWidth: number,
  frameHeight: number,
  { ahead: AHEAD = AHEAD_DEFAULT, behind: BEHIND = BEHIND_DEFAULT, parallel: PARALLEL = PARALLEL_DEFAULT }: WindowOptions = {},
): FrameSequence {
  const context = canvas.getContext("2d", { alpha: false });
  const count = frames.length;
  const bitmaps: (ImageBitmap | null)[] = new Array(count).fill(null);
  const decoding = new Set<number>();
  const failed = new Set<number>();
  let crop: Crop = { sx: 0, sy: 0, sw: frameWidth, sh: frameHeight, dw: frameWidth, dh: frameHeight };
  let generation = 0;
  let target = 0;
  let shown = -1;
  let direction = 1;
  let active = false;
  let width = 0;
  let height = 0;
  let disposed = false;
  let misses = 0;
  let hits = 0;

  const window_ = () => {
    const ahead = active ? AHEAD : PARK_AHEAD;
    const behind = active ? BEHIND : PARK_BEHIND;
    return direction > 0 ? [target - behind, target + ahead] : [target - ahead, target + behind];
  };

  const evict = () => {
    const [low, high] = window_();
    for (let index = 0; index < count; index++) {
      const bitmap = bitmaps[index];
      if (!bitmap || (index >= low - MARGIN && index <= high + MARGIN)) continue;
      bitmap.close();
      bitmaps[index] = null;
    }
  };

  /** Hədəf kadr, yoxdursa ən yaxın hazır kadr (əvvəlcə keçilmiş tərəfdən). */
  const paint = () => {
    if (!context || !width || !count) return;
    let pick = -1;
    for (let step = 0; step < count && pick < 0; step++) {
      const passed = target - direction * step;
      const upcoming = target + direction * step;
      if (passed >= 0 && passed < count && bitmaps[passed]) pick = passed;
      else if (step > 0 && upcoming >= 0 && upcoming < count && bitmaps[upcoming]) pick = upcoming;
    }
    if (pick < 0 || pick === shown) return;
    if (pick === target) hits++;
    else misses++;
    shown = pick;
    context.drawImage(bitmaps[pick]!, 0, 0, width, height);
    if (!canvas.classList.contains("is-ready")) canvas.classList.add("is-ready");
  };

  const decode = (index: number) => {
    if (index < 0 || index >= count || bitmaps[index] || decoding.has(index) || failed.has(index)) return;
    if (decoding.size >= PARALLEL) return;
    decoding.add(index);
    const ticket = generation;
    const { sx, sy, sw, sh, dw, dh } = crop;
    createImageBitmap(frames[index], sx, sy, sw, sh, { resizeWidth: dw, resizeHeight: dh, resizeQuality: "medium" })
      .then((bitmap) => {
        decoding.delete(index);
        const [low, high] = window_();
        if (disposed || ticket !== generation || index < low - MARGIN || index > high + MARGIN) {
          bitmap.close();
        } else {
          bitmaps[index] = bitmap;
          paint();
        }
        pump();
      })
      .catch(() => {
        decoding.delete(index);
        failed.add(index);
        pump();
      });
  };

  /** Ən yaxın kadrlardan başlayaraq pəncərəni doldurur. */
  const pump = () => {
    if (disposed || !width) return;
    const ahead = active ? AHEAD : PARK_AHEAD;
    const behind = active ? BEHIND : PARK_BEHIND;
    for (let step = 0; step <= ahead && decoding.size < PARALLEL; step++) {
      decode(target + direction * step);
      if (step > 0 && step <= behind) decode(target - direction * step);
    }
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const nextWidth = Math.round(canvas.clientWidth * ratio);
    const nextHeight = Math.round(canvas.clientHeight * ratio);
    if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    // object-fit: cover — kadrın lazım olan hissəsi elə decode zamanı kəsilir;
    // yalnız kiçiltmə edilir, böyütməni GPU-da drawImage görür
    const destRatio = width / height;
    let sw = frameWidth;
    let sh = frameHeight;
    if (frameWidth / frameHeight > destRatio) sw = Math.round(frameHeight * destRatio);
    else sh = Math.round(frameWidth / destRatio);
    const scale = Math.min(1, width / sw);
    crop = {
      sx: Math.round((frameWidth - sw) / 2),
      sy: Math.round((frameHeight - sh) / 2),
      sw,
      sh,
      dw: Math.max(1, Math.round(sw * scale)),
      dh: Math.max(1, Math.round(sh * scale)),
    };
    generation++;
    bitmaps.forEach((bitmap, index) => {
      if (!bitmap) return;
      bitmap.close();
      bitmaps[index] = null;
    });
    shown = -1;
    pump();
  };

  // görünüşə bir ekran qalmış pəncərə genişlənir, uzaqlaşanda yaddaş boşalır
  const watcher = new IntersectionObserver(
    (entries) => {
      const next = entries[entries.length - 1].isIntersecting;
      if (next === active) return;
      active = next;
      if (!active) evict();
      pump();
    },
    { rootMargin: "100% 50%" },
  );
  watcher.observe(canvas);

  const sizeWatcher = new ResizeObserver(resize);
  sizeWatcher.observe(canvas);
  resize();

  return {
    draw(progress) {
      if (!count) return;
      const next = Math.max(0, Math.min(count - 1, Math.round(progress * (count - 1))));
      if (next === target) return;
      direction = next > target ? 1 : -1;
      target = next;
      evict();
      paint();
      pump();
    },
    stats() {
      let decoded = 0;
      bitmaps.forEach((bitmap) => bitmap && decoded++);
      return {
        target,
        shown,
        misses,
        hits,
        decoding: decoding.size,
        decoded,
        memory: Math.round((decoded * crop.dw * crop.dh * 4) / 1048576),
      };
    },
    dispose() {
      disposed = true;
      watcher.disconnect();
      sizeWatcher.disconnect();
      bitmaps.forEach((bitmap) => bitmap?.close());
      bitmaps.fill(null);
    },
  };
}
