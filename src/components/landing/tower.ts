// Real bina modelinin (public/3d/tower.glb) ölçüləri, metr.
// Zəmin qatı 0–4.2, üstündə 12 yaşayış mərtəbəsi, hər biri ~2.93. Damda terras/hovuz ~47.5-ə qədər.
// Bu fayl three.js import etmir — həm UI, həm də (dinamik yüklənən) 3D səhnə istifadə edir.

export const GROUND_TOP = 4.2;
export const FLOOR_H = 2.93;
export const RES_FLOORS = 12;
export const TOTAL_FLOORS = RES_FLOORS + 1;
export const ROOF_TOP = 47.5;

export const floorBase = (i: number) => (i === 0 ? 0 : GROUND_TOP + (i - 1) * FLOOR_H);
export const floorHeight = (i: number) => (i === 0 ? GROUND_TOP : FLOOR_H);
export const floorAt = (y: number) =>
  y < GROUND_TOP ? 0 : Math.min(RES_FLOORS, Math.floor((y - GROUND_TOP) / FLOOR_H) + 1);
