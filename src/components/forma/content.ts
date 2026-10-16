export const NAV = [
  { href: "#story", label: "Hekayə" },
  { href: "#manifest", label: "Fəlsəfə" },
  { href: "#seq", label: "Emalatxana" },
  { href: "#col", label: "Kolleksiya" },
  { href: "#end", label: "Əlaqə" },
] as const;

export const COLORS = [
  { name: "Qum", value: "#c9b79c" },
  { name: "Zeytun", value: "#6b6f45" },
  { name: "Şokolad", value: "#5b4636" },
  { name: "Qrafit", value: "#3a3a3c" },
] as const;

/** Divanın üstündə scroll zamanı çəkilən ölçü xətləri. */
export const DIMENSIONS = {
  width: "240 sm",
  height: "82 sm",
  depth: "95 sm",
} as const;

export const PRODUCTS = [
  { name: "Nara divan", price: "2 450 ₼", detail: "3 nəfərlik · kətan", image: "/forma/nara/photo.webp", alt: "Taxta altlıqlı açıq boz üç nəfərlik divan" },
  { name: "Oda kreslo", price: "980 ₼", detail: "Qoz ağacı karkas", image: "/forma/oda/photo.webp", alt: "Bukle parçalı, taxta karkaslı kreslo" },
  { name: "Sol masa", price: "1 320 ₼", detail: "Masiv palıd", image: "/forma/sol/photo.webp", alt: "Divanın qarşısında masiv taxta jurnal masası" },
  { name: "Kumo puf", price: "420 ₼", detail: "Dəri üz", image: "/forma/kumo/photo.webp", alt: "Oval formalı tünd narıncı dəri puf" },
  { name: "Ayo rəf", price: "1 780 ₼", detail: "Modul sistem", image: "/forma/ayo/photo.webp", alt: "Divara quraşdırılmış nazik taxta rəflər" },
] as const;

export const WORKSHOP = [
  { title: "Taxta seçilir", description: "Hər lövhə əllə seçilir, 14 ay qurudulur və ölçülür." },
  { title: "Kəsik açılır", description: "Dəzgah lövhəni açır — yonqar tökülür, ölçü santimetrinə qədər tutulur." },
  { title: "Karkas qurulur", description: "Usta əlləri ilə birləşmələr — mismarsız, yalnız kərtmə." },
  { title: "Parça gərilir", description: "Son toxunuş: parça əllə gərilir və tikilir." },
] as const;

export const STATS = [
  { value: 12, suffix: "", label: "İllik təcrübə" },
  { value: 4800, suffix: "+", label: "Bəzədilmiş ev" },
  { value: 100, suffix: "%", label: "Əl işi" },
  { value: 25, suffix: "", label: "İl zəmanət" },
] as const;

export const SERVICES = [
  { title: "Dizayn", description: "Otağınızın ölçüsünə görə fərdi eskiz və 3D vizual." },
  { title: "İstehsal", description: "Öz emalatxanamızda, 6–8 həftəyə hazır olur." },
  { title: "Quraşdırma", description: "Çatdırılma və yerində yığılma — bizdən." },
  { title: "Zəmanət", description: "Karkasa 25 il, parçaya 3 il zəmanət." },
] as const;

export const MANIFESTO =
  "Biz mebel yox, otağın sakitliyini düzəldirik. Hər xətt düşünülüb, hər tikiş əllə vurulub və hər parça sizinlə yaşlanmaq üçün yaradılıb.";

/** Kadr bölməsi — scroll ilə qeydlər dəyişir. */
export const FILM_NOTES = [
  { title: "İşıq", text: "Səhər işığının mebelin üstündə necə gəzdiyini izləyirik — eskiz buradan başlayır." },
  { title: "Məsafə", text: "Hər ölçü otağın nəfəs ala bilməsi üçün hesablanır, santimetrlə." },
  { title: "Sükut", text: "Doğru mebel diqqət çəkmir — otağı sadəcə daha sakit edir." },
] as const;

export const COLLECTION_FILM = { word: "Forma", title: "Yaşayış kadrı", detail: "Emalatxanadan evə" } as const;

/** Mağaza gəzintisi: zalda üstdə çıxan kateqoriyalar (hazır olmayanlar "tezliklə"). */
export const STORE_CATEGORIES = [
  { id: "divan", label: "Divan", ready: true },
  { id: "kreslo", label: "Kreslo", ready: false },
  { id: "yataq", label: "Yataq", ready: false },
  { id: "masa", label: "Masa", ready: false },
  { id: "shkaf", label: "Şkaf", ready: false },
] as const;

/**
 * Divan bölməsində kameranın dayandığı məhsullar, gəzinti sırası ilə.
 * `image: null` — videonun özündəki rəng; digərləri eyni kadrın rəng variantıdır.
 */
export const STORE_SOFAS = [
  {
    name: "Ada",
    type: "3 nəfərlik divan",
    price: "2 450 ₼",
    description: "Dərin oturacaq, alçaq söykənək və nazik palıd ayaqlar. Hər gün oturulmaq üçün yaradılıb.",
    specs: [
      ["Ölçü", "228 × 92 × 82 sm"],
      ["Material", "Kətan, masiv palıd"],
      ["Hazırlanma", "3–4 həftə"],
    ],
    colors: [
      { name: "Antrasit", swatch: "#3b3b3a", image: null },
      { name: "Bej kətan", swatch: "#cdbfa6", image: "/forma/magaza/S1.webp" },
      { name: "Terrakota", swatch: "#b0523f", image: "/forma/magaza/S1-terrakota.webp" },
      { name: "Qəhvəyi", swatch: "#4b3f35", image: "/forma/magaza/S1-qehveyi.webp" },
    ],
  },
  {
    name: "Bulud",
    type: "Künc divan",
    price: "3 890 ₼",
    description: "Modul hissələr, yumşaq dairəvi formalar və bukle parça. Otağın mərkəzi olmaq üçün.",
    specs: [
      ["Ölçü", "292 × 196 × 74 sm"],
      ["Material", "Bukle, yüksək sıxlıqlı sünger"],
      ["Hazırlanma", "4–5 həftə"],
    ],
    colors: [
      { name: "Süd bukle", swatch: "#ebe5d9", image: null },
      { name: "Kərpic", swatch: "#a8463a", image: "/forma/magaza/S2-qirmizi.webp" },
      { name: "Qrafit", swatch: "#2c2b2a", image: "/forma/magaza/S2-qara.webp" },
    ],
  },
  {
    name: "Ləman",
    type: "2 nəfərlik dəri divan",
    price: "3 200 ₼",
    description: "Sıx söykənək, incə polad çərçivə və təbii dəri. İllər keçdikcə daha gözəl görünür.",
    specs: [
      ["Ölçü", "196 × 88 × 80 sm"],
      ["Material", "Təbii dəri, qara polad"],
      ["Hazırlanma", "3–4 həftə"],
    ],
    colors: [{ name: "Konyak", swatch: "#a4622f", image: null }],
  },
] as const;

/** Sifarişlər bu ünvana gedir. */
export const ORDER_EMAIL = "salam@forma.az";
