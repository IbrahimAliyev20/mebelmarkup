// scripts/pack-frames.py tərəfindən yaradılıb — əl ilə dəyişmə.
export const FRAME_PACKS = {
  shop1: { url: "/forma/seq/shop1.bin", bytes: 4477956, count: 144, width: 1280, height: 720 },
  shop2: { url: "/forma/seq/shop2.bin", bytes: 4131920, count: 144, width: 1280, height: 720 },
  shop3: { url: "/forma/seq/shop3.bin", bytes: 3499828, count: 144, width: 1280, height: 720 },
  shop4: { url: "/forma/seq/shop4.bin", bytes: 3279046, count: 144, width: 1280, height: 720 },
  room: { url: "/forma/seq/room.bin", bytes: 1990472, count: 144, width: 1280, height: 720 },
  craft: { url: "/forma/seq/craft.bin", bytes: 2262262, count: 144, width: 960, height: 540 },
  living: { url: "/forma/seq/living.bin", bytes: 2216026, count: 144, width: 960, height: 540 },
  lathe: { url: "/forma/seq/lathe.bin", bytes: 2104980, count: 144, width: 1280, height: 360 },
  store1: { url: "/forma/seq/store1.bin", bytes: 8738216, count: 192, width: 1280, height: 720 },
  store2: { url: "/forma/seq/store2.bin", bytes: 6094790, count: 192, width: 1280, height: 720 },
  store3: { url: "/forma/seq/store3.bin", bytes: 5818234, count: 240, width: 1280, height: 720 },
  store4: { url: "/forma/seq/store4.bin", bytes: 1890366, count: 96, width: 1280, height: 720 },
  store5: { url: "/forma/seq/store5.bin", bytes: 2339582, count: 96, width: 1280, height: 720 },
} as const;

export type FramePackKey = keyof typeof FRAME_PACKS;
