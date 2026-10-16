/**
 * Saytın bütün mətnləri və nümunə məlumatları bir yerdə — mətni dəyişmək üçün komponentlərə
 * girmək lazım deyil. Bu fayl "use client" deyil: həm server (page.tsx), həm client komponentlər istifadə edir.
 *
 * Qeyd: qiymətlər, mərtəbə məlumatları, telefon və ünvan NÜMUNƏDİR — realları ilə əvəz edin.
 */

import { TOTAL_FLOORS } from "./tower";

export const BRAND = "Markup";
export const BRAND_FULL = "Markup Residence";

/** Kran lövhəsinin son bölmədə göstərdiyi yazı (açar ikonu ilə). */
export const FINAL_LABEL = "Açar sizdə";

/* ---------------- Hero ---------------- */

// videoda baş verənlər — alıcının dilində, texniki termin yox
export const HERO_STAGES = ["Torpaq qazılır", "Mərtəbələr ucalır", "Şüşələr taxılır", "İşıqlar yanır"];

/* ---------------- Tikinti halqası ---------------- */

export const STAGE_DATA = [
  { frame: 0, title: "Tikinti meydançası", subtitle: "2024 · yanvar", text: "Ərazi hasarlanır, texnika gəlir — ilk gün." },
  { frame: 16, title: "Torpaq qazılır", subtitle: "2024 · mart", text: "Dərin təməl qoyulur. Bina zəlzələyə davamlı layihə ilə tikilir." },
  { frame: 32, title: "İlk sütunlar", subtitle: "2024 · iyun", text: "Dəmir-beton sütunlar yerə möhkəm bağlanır." },
  { frame: 48, title: "Mərtəbələr ucalır", subtitle: "2025 · fevral", text: "Bina mərtəbə-mərtəbə qalxır. Hər mərtəbəni mühəndislərimiz yoxlayır." },
  { frame: 64, title: "Bina boy atır", subtitle: "2025 · avqust", text: "13 mərtəbənin hamısı yerindədir, dam bağlanır." },
  { frame: 80, title: "Şüşələr taxılır", subtitle: "2026 · mart", text: "İsti saxlayan şüşələr — qışda isti, yayda sərin." },
  { frame: 100, title: "Həyət salınır", subtitle: "2026 · oktyabr", text: "Ağaclar əkilir, oyun meydançası və yollar hazırlanır." },
  { frame: 119, title: "İşıqlar yanır", subtitle: "2027 · aprel", text: "Pəncərələrdə işıq yanır — açarı sizə veririk." },
];

/* ---------------- 3D bina ---------------- */

export type FloorInfo = { floor: number; free: number; price: number; view: string };

/** Mərtəbə kartının məlumatı — NÜMUNƏ, real satış bazası ilə əvəz edin. i = 0 zəmin qatı. */
export function floorInfo(i: number): FloorInfo {
  return {
    floor: i + 1,
    free: i === 0 ? 0 : ((i * 7) % 5) + 1,
    price: 1350 + i * 35,
    view: i < 4 ? "Həyət" : i < 9 ? "Şəhər" : "Dəniz",
  };
}

/** Bina tikilərkən solda bir-bir görünən rəqəmlər. */
export const FACTS = [
  { value: TOTAL_FLOORS, unit: "mərtəbə", note: "Aşağıda mağazalar, üstdə 12 yaşayış mərtəbəsi" },
  { value: 96, unit: "mənzil", note: "1, 2 və 3 otaqlı planlar" },
  { value: 2400, unit: "m² həyət", note: "Maşın girməyən, ağaclı daxili həyət" },
  { value: 2027, unit: "təhvil", note: "Açarlar 2027-nin yazında verilir" },
];

/* ---------------- Mənzillər ---------------- */

export const APARTMENTS = [
  { rooms: "1 otaqlı", area: "52 m²-dən", price: "78 000", frame: 80 },
  { rooms: "2 otaqlı", area: "84 m²-dən", price: "121 000", frame: 100 },
  { rooms: "3 otaqlı", area: "118 m²-dən", price: "165 000", frame: 119 },
];

/* ---------------- Üstünlüklər ---------------- */

// Şəkillər: Unsplash (pulsuz lisenziya) — Hero ding, Claudio Schwarz, Scott Webb, Tristan Hill, Aalo Lens, Jakub Zerdzicki
export const FEATURES = [
  { img: "/features/courtyard.webp", title: "Yaşıl həyət", text: "2 400 m², maşın girməyən, ağaclı daxili həyət." },
  { img: "/features/parking.webp", title: "Yeraltı parkinq", text: "Hər mənzilə bir yer, liftlə birbaşa mərtəbəyə." },
  { img: "/features/security.webp", title: "24/7 mühafizə", text: "Kamera və girişdə kartla nəzarət." },
  { img: "/features/playground.webp", title: "Uşaq meydançası", text: "Yumşaq örtüklü, kölgəli, həyətin içində." },
  { img: "/features/lift.webp", title: "Lift və generator", text: "İşıq kəsilsə də liftlər işləməyə davam edir." },
  { img: "/features/keys.webp", title: "İpoteka", text: "Bank partnyorlarımızla, ilkin ödəniş 20%-dən." },
];

/* ---------------- Əlaqə ---------------- */

export const CONTACT = {
  phone: "+994 00 000 00 00",
  phoneHref: "tel:+994000000000",
  whatsappHref: "https://wa.me/994000000000",
  office: "Bakı, Nərimanov r., Atatürk pr. 00",
  hours: "Hər gün, 10:00 – 20:00",
};

/* ---------------- Footer ---------------- */

export const FOOTER_NAV = [
  { href: "#haqqimizda", label: "Haqqımızda" },
  { href: "#tikinti", label: "Bina necə tikilir" },
  { href: "#mertebeler", label: "Mərtəbələr" },
  { href: "#menziller", label: "Mənzillər" },
  { href: "#ustunlukler", label: "Üstünlüklər" },
  { href: "#elaqe", label: "Əlaqə" },
];

export const FOOTER_SOCIAL = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "WhatsApp", href: CONTACT.whatsappHref },
  { label: "YouTube", href: "#" },
];
