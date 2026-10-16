import { FRAME_PACKS, type FramePackKey } from "./framePacks";

/**
 * Bütün kadr paketlərini sayt açılarkən bir dəfə yükləyir.
 *
 * Hər paket tək `.bin` faylıdır (format: scripts/pack-frames.py). Yükləmə
 * axınla oxunur ki, faiz real baytlarla hesablansın. Sonra kadrlar
 * `Blob.slice` ilə kopyalanmadan ayrılır — scroll zamanı şəbəkəyə heç bir
 * sorğu getmir.
 */
const packs = new Map<FramePackKey, Blob[]>();
const listeners = new Set<(fraction: number) => void>();
let fraction = 0;
let loading: Promise<void> | null = null;

/** `store*` paketləri yalnız /magaza səhifəsində yüklənir (`loadPacks`). */
const KEYS = (Object.keys(FRAME_PACKS) as FramePackKey[]).filter((key) => !key.startsWith("store"));
const TOTAL = KEYS.reduce((sum, key) => sum + FRAME_PACKS[key].bytes, 0);

function report(received: Map<FramePackKey, number>) {
  let sum = 0;
  received.forEach((value) => (sum += value));
  fraction = Math.min(1, sum / TOTAL);
  listeners.forEach((listener) => listener(fraction));
}

async function loadPack(key: FramePackKey, received: Map<FramePackKey, number>, notify = () => report(received)) {
  const { url, count } = FRAME_PACKS[key];
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${url}: ${response.status}`);
  const reader = response.body.getReader();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value as Uint8Array<ArrayBuffer>);
    got += value.byteLength;
    received.set(key, got);
    notify();
  }
  const whole = new Blob(parts);
  const header = new DataView(await whole.slice(0, 12 + 4 * (count + 1)).arrayBuffer());
  if (header.getUint32(0, false) !== 0x46534551) throw new Error(`${url}: FSEQ deyil`);
  const frames: Blob[] = [];
  for (let index = 0; index < count; index++) {
    const start = header.getUint32(12 + 4 * index, true);
    const end = header.getUint32(16 + 4 * index, true);
    frames.push(whole.slice(start, end, "image/webp"));
  }
  packs.set(key, frames);
}

/** Bütün paketləri yükləyir (təkrar çağırış eyni vədi qaytarır). Xəta olsa da həll olunur ki, sayt ilişməsin. */
export function loadFrames(): Promise<void> {
  if (!loading) {
    const received = new Map<FramePackKey, number>();
    loading = Promise.all(
      KEYS.map((key) =>
        loadPack(key, received).catch(() => {
          // paket açılmasa həmin bölmə boş qalır, amma yükləmə dayanmır
          received.set(key, FRAME_PACKS[key].bytes);
          report(received);
        }),
      ),
    ).then(() => {
      fraction = 1;
      listeners.forEach((listener) => listener(1));
    });
  }
  return loading;
}

/** İstənilən paketləri yükləyir; `onProgress` real bayt payını (0…1) alır. */
export function loadPacks(keys: readonly FramePackKey[], onProgress?: (value: number) => void): Promise<void> {
  const total = keys.reduce((sum, key) => sum + FRAME_PACKS[key].bytes, 0);
  const received = new Map<FramePackKey, number>();
  const tick = () => {
    let sum = 0;
    received.forEach((value) => (sum += value));
    onProgress?.(Math.min(1, sum / total));
  };
  return Promise.all(
    keys.map((key) => {
      if (packs.has(key)) {
        received.set(key, FRAME_PACKS[key].bytes);
        tick();
        return undefined;
      }
      return loadPack(key, received, tick).catch(() => {
        received.set(key, FRAME_PACKS[key].bytes);
        tick();
      });
    }),
  ).then(() => onProgress?.(1));
}

/** Yükləmə faizinə abunə (0…1); abunəlikdən çıxmaq üçün funksiya qaytarır. */
export function onFrameProgress(listener: (value: number) => void) {
  listeners.add(listener);
  listener(fraction);
  return () => {
    listeners.delete(listener);
  };
}

/** Bir və ya bir neçə paketin kadrları ardıcıl (məs. emalatxananın dörd klipi bir lent kimi). */
export function getFrames(...keys: FramePackKey[]): Blob[] {
  return keys.flatMap((key) => packs.get(key) ?? []);
}
