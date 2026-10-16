import { memo } from "react";

/**
 * İməkləyən körpə — yan görünüş, sağa baxır. Qollar/ayaqlar ayrı qruplardır
 * (data-limb), CraneHook scroll-a görə onları çiyin/omba oynağı ətrafında fırladır.
 * Real görünüş üçün: dəri radial gradientləri, arxa əl-ayaq tünd çalarda (dərinlik),
 * yanaq qızartısı, gözdə parıltı, qıvrım saç, bodi + bez, yumşaq kölgə.
 *
 * memo: əl-ayaqların transform-unu CraneHook birbaşa DOM-da yazır — lövhənin yazısı dəyişəndə
 * React bu SVG ağacına ümumiyyətlə toxunmasın.
 */

// oynaq nöqtələri (viewBox koordinatları) — CraneHook da bunlardan istifadə edir
export const BABY_PIVOTS = {
  fa: [53, 30], // ön qol — çiyin
  ba: [47, 29], // arxa qol
  fl: [25, 33], // ön ayaq — omba
  bl: [28, 32], // arxa ayaq
} as const;

export const CrawlingBaby = memo(function CrawlingBaby() {
  return (
    <svg viewBox="0 0 80 54" className="block h-full w-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="bb-skin" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#fde8da" />
          <stop offset="0.55" stopColor="#f4c9ad" />
          <stop offset="1" stopColor="#e2a585" />
        </radialGradient>
        <radialGradient id="bb-skin-back" cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ecc0a3" />
          <stop offset="1" stopColor="#cf9275" />
        </radialGradient>
        <linearGradient id="bb-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f6ff" />
          <stop offset="0.5" stopColor="#cddcfb" />
          <stop offset="1" stopColor="#a9bff3" />
        </linearGradient>
        <linearGradient id="bb-diaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe6f1" />
        </linearGradient>
        <radialGradient id="bb-hair" cx="45%" cy="35%" r="70%">
          <stop offset="0" stopColor="#4a4448" />
          <stop offset="1" stopColor="#1f1c20" />
        </radialGradient>
        <filter id="bb-blur" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* yerə düşən kölgə */}
      <ellipse cx="38" cy="51.5" rx="30" ry="2.4" fill="#101e52" opacity="0.22" filter="url(#bb-blur)" />

      {/* arxa ayaq */}
      <g data-limb="bl">
        <rect x="24" y="30" width="8" height="17" rx="4" fill="url(#bb-skin-back)" />
        <rect x="9" y="42.5" width="20" height="7" rx="3.5" fill="url(#bb-skin-back)" />
        <ellipse cx="9" cy="44.5" rx="3.2" ry="4" fill="#d99b7f" />
      </g>

      {/* arxa qol */}
      <g data-limb="ba">
        <rect x="44" y="27" width="6.5" height="20" rx="3.2" fill="url(#bb-skin-back)" />
        <ellipse cx="48.5" cy="48" rx="4.2" ry="2.5" fill="url(#bb-skin-back)" />
      </g>

      {/* gövdə + baş birlikdə yüngül tullanır */}
      <g data-limb="body">
        {/* bodi */}
        <path
          d="M14 33 C 13 23, 24 18.5, 36 19 C 47 19.5, 57 22, 58 29 C 59 36, 50 39.5, 38 39.5 C 26 39.5, 15 40, 14 33 Z"
          fill="url(#bb-suit)"
        />
        {/* bodinin qırışı və yaxa */}
        <path d="M30 21.5 C 33 27, 33 33, 30 38" stroke="#9fb4e8" strokeWidth="0.7" fill="none" opacity="0.6" />
        <path d="M52 22.5 C 55 25, 56 28, 56 31" stroke="#ffffff" strokeWidth="1.4" fill="none" opacity="0.7" />
        {/* bez — arxada qabarıq */}
        <ellipse cx="19" cy="31.5" rx="9.5" ry="8.5" fill="url(#bb-diaper)" />
        <path d="M13 28 C 16 25, 22 24.5, 26 26.5" stroke="#c9d3e4" strokeWidth="0.8" fill="none" />

        {/* baş */}
        <g data-limb="head">
          <circle cx="64" cy="20" r="11.2" fill="url(#bb-skin)" />
          {/* qulaq */}
          <ellipse cx="58.6" cy="21.5" rx="2.6" ry="3.4" fill="#eab296" />
          <path d="M58.2 19.8 C 59.6 20.6, 59.6 22.6, 58.4 23.2" stroke="#cf8f73" strokeWidth="0.6" fill="none" />
          {/* saç: qıvrımlar */}
          <path
            d="M54.5 17 C 54 10, 60 6.5, 66 7.5 C 70 8, 73 10.5, 73.5 13 C 70 11, 66.5 11.2, 64 12.6 C 61 11.8, 57.5 13.5, 56.5 17.5 Z"
            fill="url(#bb-hair)"
          />
          <path d="M63 8.2 C 64.5 5.8, 67.5 5.6, 68.5 7.4" stroke="#2a2629" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          {/* qaş, göz (parıltı ilə), burun, ağız */}
          <path d="M68 14.6 C 69.4 13.9, 71 14, 72 14.8" stroke="#8a6a5c" strokeWidth="0.5" fill="none" opacity="0.6" />
          <ellipse cx="70.2" cy="18" rx="1.35" ry="1.7" fill="#22232b" />
          <circle cx="70.7" cy="17.4" r="0.45" fill="#ffffff" />
          <path d="M74.6 19.8 C 75.8 20.6, 75.8 22, 74.7 22.5" stroke="#d9987a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M71 25.3 C 72 26.1, 73.2 26, 73.8 25.2" stroke="#c87a72" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          {/* yanaq qızartısı */}
          <circle cx="68.5" cy="23" r="3.3" fill="#f39c9c" opacity="0.32" />
          {/* alında işıq */}
          <ellipse cx="66" cy="13.5" rx="3" ry="1.6" fill="#ffffff" opacity="0.35" />
        </g>
      </g>

      {/* ön ayaq */}
      <g data-limb="fl">
        <rect x="21" y="31" width="8.5" height="17" rx="4.2" fill="url(#bb-skin)" />
        <rect x="6" y="43" width="21" height="7.4" rx="3.7" fill="url(#bb-skin)" />
        {/* ayaqaltı — yuxarı baxır */}
        <ellipse cx="6.2" cy="45" rx="3.4" ry="4.3" fill="#f6c3ad" />
        <ellipse cx="5.6" cy="43.2" rx="1.2" ry="1.6" fill="#fbd8c8" />
      </g>

      {/* ön qol */}
      <g data-limb="fa">
        <rect x="50" y="28" width="7" height="20" rx="3.5" fill="url(#bb-skin)" />
        <ellipse cx="55" cy="48.6" rx="4.6" ry="2.7" fill="url(#bb-skin)" />
        <path d="M57.5 48 L 59.2 48.6" stroke="#d9987a" strokeWidth="0.5" strokeLinecap="round" />
      </g>
    </svg>
  );
});
