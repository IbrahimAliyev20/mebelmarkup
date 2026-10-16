"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, ArrowUp, MessageCircle, Phone } from "lucide-react";
import { device, gsap, revealLines, ScrollTrigger, SplitText, useGSAP } from "./gsap";
import { framePath, ringPath } from "./frames";
import { APARTMENTS, BRAND, BRAND_FULL, CONTACT, FEATURES, FOOTER_NAV, FOOTER_SOCIAL, STAGE_DATA } from "./content";
import { ContactForm } from "./ContactForm";
import CircularCarousel, { type CircularCarouselControl } from "../reactbits/CircularCarousel";

/* =========================================================== Manifesto */

function Pill({ frame }: { frame: number }) {
  return (
    <span className="pill relative mx-[0.12em] inline-block h-[0.72em] w-[1.5em] overflow-hidden rounded-full align-[-0.04em]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ringPath(frame)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
    </span>
  );
}

export function Intro() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const split = SplitText.create(".manifesto", { type: "words" });
      gsap.fromTo(
        split.words,
        { opacity: 0.22 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          // oxuyan adam çatmamış bitsin: mətn ekranın ortasına gələndə hamısı aydın olur
          scrollTrigger: { trigger: ".manifesto", start: "top 85%", end: "bottom 65%", scrub: true },
        },
      );
      gsap.utils.toArray<HTMLElement>(".pill").forEach((pill) => {
        gsap.fromTo(
          pill,
          { scale: 0.6 },
          { scale: 1, ease: "out", scrollTrigger: { trigger: pill, start: "top 85%", end: "top 55%", scrub: true } },
        );
      });
      gsap.from(".manifesto-side > *", {
        y: 30,
        autoAlpha: 0,
        filter: "blur(8px)",
        stagger: 0.1,
        duration: 1.2,
        ease: "out",
        scrollTrigger: { trigger: ".manifesto-side", start: "top 85%" },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="haqqimizda" data-hook="Haqqımızda" className="px-5 py-24 md:px-10 md:py-32">
      <p className="manifesto max-w-[22ch] pr-hook font-display text-[9vw] leading-[1.12] md:text-[4.4vw]">
        Biz evi <Pill frame={0} /> təməldən başlayıb açarını sizə verənə qədər <Pill frame={119} /> özümüz
        tikirik.
      </p>
      <div className="manifesto-side mt-14 grid gap-8 pr-hook text-lg leading-relaxed text-navy/75 md:grid-cols-2 lg:ml-[40%]">
        <p>
          15 ildir Bakıda yaşayış binaları tikirik. Layihədən təhvilə qədər hər mərhələ öz mühəndislərimizin
          nəzarətindədir — işi podratçıya ötürmürük.
        </p>
        <p>
          {BRAND_FULL} bu yolun ən yeni dayanacağıdır: sakit həyət, işıqlı mənzillər və vaxtında təhvil.
        </p>
      </div>
    </section>
  );
}

/* =========================================================== Stages (React Bits CircularCarousel) */

const STAGES = STAGE_DATA.map((g) => ({ src: ringPath(g.frame), alt: g.title, title: g.title, subtitle: g.subtitle }));

// Telefonda hər kart tək düz hissə ilə çəkilir (128 əvəzinə 16 kompozisiya qatı, tikiş xətti olmur) —
// əyrilik kiçik ekranda hiss olunmur. Serverdə 0: halqa yalnız brauzerdə, birbaşa düzgün hissə sayı ilə
// qurulur (əvvəl telefonda əvvəlcə 128 hissə yaradılıb sonra atılırdı).
const MOBILE = "(max-width: 767px)";
const subscribeMobile = (onChange: () => void) => {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const ringTiles = () => (window.matchMedia(MOBILE).matches ? 1 : 8);
const noTilesOnServer = () => 0;

export function Stages() {
  const root = useRef<HTMLElement>(null);
  const control = useRef<CircularCarouselControl | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const tiles = useSyncExternalStore(subscribeMobile, ringTiles, noTilesOnServer);

  useGSAP(
    () => {
      revealLines(".stages-title", { trigger: ".stages-title", start: "top 80%" });

      // bölmə ekranda sabit qalır, scroll halqanı düz bir dövrə (360°) fırladır
      const ring = { angle: 0 };
      gsap.to(ring, {
        angle: -360,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=220%", pin: true, scrub: 1, anticipatePin: 1 },
        onUpdate: () => control.current?.setAngle(ring.angle),
      });

      // hover kartı — yalnız siçanlı cihazlarda (telefonda scroll başlayanda bir anlıq görünürdü)
      if (!device.hover()) return;
      const x = gsap.quickTo(tip.current, "x", { duration: 0.45, ease: "out" });
      const y = gsap.quickTo(tip.current, "y", { duration: 0.45, ease: "out" });
      const area = root.current!.querySelector<HTMLElement>(".stages-ring")!;
      let shown: number | null = null;
      const show = (i: number | null) => {
        if (i === shown) return; // React yalnız kart dəyişəndə yenilənir, hər siçan hərəkətində yox
        shown = i;
        setHovered(i);
      };
      const move = (e: PointerEvent) => {
        const r = root.current!.getBoundingClientRect();
        x(e.clientX - r.left + 22);
        y(e.clientY - r.top + 22);
        const card = (e.target as HTMLElement).closest?.("[data-cc-index]");
        show(card ? Number(card.getAttribute("data-cc-index")) : null);
      };
      const leave = () => show(null);
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerleave", leave);
      return () => {
        area.removeEventListener("pointermove", move);
        area.removeEventListener("pointerleave", leave);
      };
    },
    { scope: root },
  );

  const info = hovered === null ? null : STAGE_DATA[hovered];

  return (
    <section ref={root} id="tikinti" data-hook="Tikinti" className="relative flex h-svh flex-col overflow-hidden bg-paper pt-24 text-navy md:pt-28">
      <div className="flex flex-col justify-between gap-4 pl-5 pr-hook md:flex-row md:items-end md:pl-10">
        <div>
          <h2 className="stages-title max-w-[18ch] font-display text-5xl leading-[0.95] md:text-[4.6vw]">
            Hər addım <span className="text-brand">gözünüz</span> önündə.
          </h2>
        </div>
      </div>

      {/* 3D halqa — fon ağ, arxaya dönən kartlar ağa əriyir */}
      {/* ekrandan uzaqda olanda brauzer halqanın 3D qatlarını ümumiyyətlə hesablamır (görünüşə təsiri yoxdur) */}
      <div className="stages-ring relative min-h-0 flex-1 overflow-hidden [contain-intrinsic-size:auto_600px] [content-visibility:auto]">
        <div className="absolute inset-y-0 left-1/2 w-[260%] -translate-x-1/2 sm:w-[170%] md:w-[140%] lg:w-full">
          {tiles > 0 && (
            <CircularCarousel
              controlRef={control}
              tiles={tiles}
              items={STAGES}
              preset="cylinder"
              intro="rise"
              autoplay="off"
              draggable={false}
              snap={false}
              focusOnClick={false}
              pauseOnHover={false}
              parallax={0.15}
              cardWidth={600}
              aspectRatio={1.55}
              gap={20}
              tilt={-2}
              perspective={3400}
              fadeColor="#ffffff"
              depthFade={0.7}
              innerShade={0.85}
              cornerRadius={18}
            />
          )}
        </div>
      </div>

      {/* hover məlumat kartı */}
      <div
        ref={tip}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 z-20 w-64 rounded-2xl border border-navy/10 bg-white p-4 shadow-[0_24px_60px_-24px_rgba(16,30,82,0.45)] transition-[opacity,scale] duration-200 ease-out ${
          info ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{ transformOrigin: "top left" }}
      >
        {info && (
          <>
            <p className="text-sm text-brand">{info.subtitle}</p>
            <p className="mt-1 font-display text-2xl leading-tight">{info.title}</p>
            <p className="mt-2 text-sm leading-snug text-navy/60">{info.text}</p>
          </>
        )}
      </div>
    </section>
  );
}

/* =========================================================== Apartments */

export function Apartments() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      revealLines(".apt-title", { trigger: ".apt-title", start: "top 80%" });

      const hover = device.hover();
      const cleanups: (() => void)[] = [];
      gsap.utils.toArray<HTMLElement>(".apt-card").forEach((card, i) => {
        const wrap = card.querySelector<HTMLElement>(".apt-img-wrap")!;
        const img = card.querySelector<HTMLElement>(".apt-img")!;
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 85%" }, delay: i * 0.12 })
          .fromTo(wrap, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "inOut" })
          .from(img, { scale: 1.5, duration: 1.8, ease: "out" }, "<")
          .from(
            card.querySelectorAll(".apt-meta"),
            { y: 20, autoAlpha: 0, filter: "blur(6px)", stagger: 0.06, duration: 0.8, ease: "out" },
            "-=1",
          );

        // 3D əyilmə — yalnız siçanı olan cihazlarda
        if (!hover) return;
        const rx = gsap.quickTo(wrap, "rotationX", { duration: 0.6, ease: "out" });
        const ry = gsap.quickTo(wrap, "rotationY", { duration: 0.6, ease: "out" });
        const ix = gsap.quickTo(img, "x", { duration: 0.8, ease: "out" });
        const iy = gsap.quickTo(img, "y", { duration: 0.8, ease: "out" });
        const move = (e: PointerEvent) => {
          const r = wrap.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          rx(py * -8);
          ry(px * 10);
          ix(px * -18);
          iy(py * -18);
        };
        const leave = () => {
          rx(0);
          ry(0);
          ix(0);
          iy(0);
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
        });
      });
      return () => cleanups.forEach((off) => off());
    },
    { scope: root },
  );

  return (
    <section ref={root} id="menziller" data-hook="Mənzillər" className="px-5 py-24 md:px-10 md:py-32">
      <h2 className="apt-title mb-12 font-display text-4xl leading-none md:text-5xl">Mənzillər</h2>

      <div className="grid gap-10 pr-hook sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {APARTMENTS.map((a) => (
          <a key={a.rooms} href="#elaqe" data-cursor="Bax" className="apt-card group block [perspective:900px]">
            {/* will-change yalnız əyilmə olan (siçanlı) cihazlarda — telefonda 3 boş GPU qatı yaradırdı */}
            <div className="apt-img-wrap relative aspect-[4/5] overflow-hidden rounded-2xl lg:aspect-auto lg:h-[min(62svh,600px)] [@media(hover:hover)_and_(pointer:fine)]:will-change-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={framePath("mobile", a.frame)}
                alt={a.rooms}
                loading="lazy"
                decoding="async"
                className="apt-img absolute -inset-[6%] h-[112%] w-[112%] max-w-none object-cover"
              />
              <div className="absolute inset-x-3 bottom-3 flex translate-y-[calc(100%+12px)] items-center justify-between rounded-xl bg-white/95 px-4 py-3 text-sm transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0">
                <span>Planı gör</span>
                <ArrowUpRight className="h-4 w-4 text-brand" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h3 className="apt-meta whitespace-nowrap text-xl font-medium sm:text-2xl">{a.rooms}</h3>
                <p className="apt-meta text-sm text-navy/50">{a.area}</p>
              </div>
              <p className="apt-meta whitespace-nowrap sm:text-right">
                <span className="text-xs text-navy/50">qiymət</span>
                <br />
                <span className="font-display text-2xl tabular-nums sm:text-3xl">{a.price}</span>
                <span className="ml-1 text-sm text-navy/60">AZN-dən</span>
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* =========================================================== Features (sticky şəkil + scroll siyahı) */

export function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(".feat-item");
      const shots = gsap.utils.toArray<HTMLElement>(".feat-shot");
      // desktopda aktivlik xətti 62%-də; mobil/planşetdə şəkil ekranın üst 55%-ni tutur, xətt görünən sahədə (78%)
      const line = device.desktop() ? "62%" : "78%";

      items.forEach((item, i) => {
        // 1) növbəti bənd yuxarı gəldikcə onun şəkli aşağıdan "silinərək" açılır (scroll-a bağlı)
        if (i > 0) {
          gsap
            .timeline({ scrollTrigger: { trigger: item, start: "top bottom", end: "top 35%", scrub: true } })
            .fromTo(shots[i], { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" })
            .fromTo(shots[i].querySelector("img"), { scale: 1.18, yPercent: 8 }, { scale: 1, yPercent: 0, ease: "none" }, 0);
        }
        // aktiv bənd tünd, qalanlar solğun (keçid CSS-də)
        ScrollTrigger.create({
          trigger: item,
          start: `top ${line}`,
          end: `bottom ${line}`,
          onToggle: (self) => item.toggleAttribute("data-active", self.isActive),
        });
      });

      // 2) son: böyük şəkil kiçilib ortada çərçivəyə çevrilir, arxada incə dairə görünür
      gsap
        .timeline({ scrollTrigger: { trigger: ".feat-outro", start: "top bottom", end: "bottom bottom", scrub: true } })
        .to(".feat-frame", { scale: 0.56, borderRadius: 6, ease: "none" })
        .fromTo(".feat-ring", { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, ease: "none" }, 0.2);
    },
    { scope: root },
  );

  return (
    <section ref={root} id="ustunlukler" data-hook="Üstünlüklər" className="relative text-navy">
      <div className="lg:flex lg:items-start">
        {/* sol: ekranda sabit qalan şəkil səhnəsi */}
        <div className="sticky top-0 z-10 h-[55svh] w-full overflow-hidden bg-paper lg:h-svh lg:w-[64%]">
          <div className="feat-ring pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-navy/10" />
          <div className="feat-frame absolute inset-0 overflow-hidden will-change-transform">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feat-shot absolute inset-0 overflow-hidden" style={{ zIndex: i }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.img} alt={f.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* sağ: nömrələnmiş siyahı adi qaydada sürüşür */}
        <div className="relative pl-5 pr-hook md:pl-10 lg:w-[36%] lg:pl-12 lg:pr-[calc(3vw+7rem)]">
          <ol className="pt-10 lg:pt-[30svh]">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                data-active={i === 0 ? "" : undefined}
                className="feat-item min-h-[40svh] opacity-35 transition-opacity duration-500 data-[active]:opacity-100 lg:min-h-[62svh]"
              >
                <p className="text-base tabular-nums text-navy/50 md:text-lg">{i + 1}.</p>
                <h3 className="mt-3 font-display text-[7.5vw] uppercase leading-[1.08] sm:text-4xl md:text-5xl lg:text-[3vw]">{f.title}</h3>
                <span className="mt-7 block h-px w-full bg-navy/15" />
                <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-navy/65 md:text-xl">{f.text}</p>
              </li>
            ))}
          </ol>
          <a
            href="#elaqe"
            className="group inline-flex items-center gap-3 border-b border-brand pb-2 text-sm font-medium uppercase text-brand"
          >
            Baxışa yazılın
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          {/* son mərhələ üçün scroll sahəsi: şəkil burada kiçilir */}
          <div className="feat-outro h-[110svh]" />
        </div>
      </div>
    </section>
  );
}

/* =========================================================== Contact + Footer */

export function Contact() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      revealLines(".contact-title", { trigger: root.current, start: "top 70%" }, { duration: 1.4, stagger: 0.12 });
      gsap.from([".contact-info > *", ".contact-form"], {
        y: 36,
        autoAlpha: 0,
        duration: 1.1,
        ease: "out",
        stagger: 0.08,
        scrollTrigger: { trigger: ".contact-form", start: "top 85%" },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="elaqe"
      data-dark
      // qabarıq əyri üst kənar — əvvəlki bölmənin sonunu üstündən örtür
      // göy az: yuxarıda demək olar ki qara-göy, aşağıda footer-in rənginə keçir (birləşmə görünmür)
      className="relative z-20 -mt-[45svh] bg-gradient-to-b from-[#080e22] via-[#0b1330] to-[#0d1638] px-5 pb-16 pt-32 text-white md:px-10 md:pb-20 md:pt-44"
      style={{ borderTopLeftRadius: "50% 9vh", borderTopRightRadius: "50% 9vh" }}
    >
      {/* yuxarıda çox zəif işıq — fonu canlı göstərir */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] [background:radial-gradient(60%_70%_at_50%_0%,rgba(169,193,255,0.10),transparent_70%)]"
        style={{ borderTopLeftRadius: "50% 9vh", borderTopRightRadius: "50% 9vh" }}
      />
      <div className="relative grid gap-16 pr-hook lg:grid-cols-[1.1fr_1fr] lg:gap-24 [&>*]:min-w-0">
        <div>
          <h2 className="contact-title font-display text-[10.5vw] leading-[0.95] sm:text-[9vw] md:text-[4.8vw]">
            Baxışa gəlin, qəhvə bizdən.
          </h2>
          {/* əlaqə məlumatları — incə xətlərlə, qutu yoxdur */}
          <dl className="contact-info mt-14 grid max-w-md border-t border-white/12 text-sm">
            <div className="flex flex-col gap-1 border-b border-white/12 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="text-white/50">Telefon</dt>
              <dd>
                <a href={CONTACT.phoneHref} className="transition-opacity duration-200 hover:opacity-70">
                  {CONTACT.phone}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-white/12 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="text-white/50">Satış ofisi</dt>
              <dd className="sm:text-right">{CONTACT.office}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-white/12 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="text-white/50">İş saatları</dt>
              <dd>{CONTACT.hours}</dd>
            </div>
          </dl>
          <div className="contact-info mt-8 flex flex-wrap gap-3">
            <a
              href={CONTACT.whatsappHref}
              className="press inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-3 text-sm ring-1 ring-white/15 transition-colors duration-200 hover:bg-white hover:text-navy"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp-da yaz
            </a>
            <a
              href={CONTACT.phoneHref}
              className="press inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm ring-1 ring-white/15 transition-colors duration-200 hover:bg-white hover:text-navy"
            >
              <Phone className="h-4 w-4" /> Zəng et
            </a>
          </div>
        </div>
        <div className="contact-form md:pt-3">
          <p className="mb-8 max-w-md text-white/65">
            Nömrənizi yazın, menecerimiz 15 dəqiqəyə zəng edib sizə uyğun mənzilləri göstərsin.
          </p>
          <ContactForm dark />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // iri ad: hərflər scroll ilə aşağıdan qalxır
      gsap.from(".footer-letter", {
        yPercent: 100,
        stagger: 0.06,
        ease: "out",
        scrollTrigger: { trigger: ".footer-word", start: "top 95%", end: "bottom bottom", scrub: 1 },
      });
      gsap.from(".footer-col", {
        y: 28,
        autoAlpha: 0,
        duration: 1,
        ease: "out",
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    },
    { scope: root },
  );

  return (
    // əlaqə bölməsinin tünd fonu burada davam edir və aşağıya doğru daha da tündləşir — göy az
    <footer ref={root} data-dark className="relative overflow-hidden bg-gradient-to-b from-[#0d1638] to-[#060a1a] px-5 pt-16 text-white md:px-10 md:pt-20">
      <div className="grid gap-12 border-t border-white/10 pr-hook pt-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:gap-10">
        <div className="footer-col max-w-sm">
          <p className="font-display text-3xl">{BRAND_FULL}</p>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Bakıda 13 mərtəbəli yaşayış kompleksi. Təməldən açara qədər hər addımı özümüz tikirik.
          </p>
        </div>

        <nav className="footer-col">
          <p className="mb-5 text-sm text-white/45">Səhifə</p>
          <ul className="space-y-2.5">
            {FOOTER_NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="group inline-flex items-center text-white/85 transition-[color,gap] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:gap-2 hover:text-white"
                >
                  <span className="h-px w-0 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:w-4" />
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <p className="mb-5 text-sm text-white/45">Bizi izləyin</p>
          <ul className="space-y-2.5">
            {FOOTER_SOCIAL.map((n) => (
              <li key={n.label}>
                <a href={n.href} className="group inline-flex items-center gap-1.5 text-white/85 transition-colors duration-200 hover:text-white">
                  {n.label}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col md:justify-self-end">
          <a
            href="#"
            aria-label="Yuxarı qayıt"
            className="press group grid h-14 w-14 place-items-center rounded-full border border-white/20 transition-colors duration-300 hover:border-white hover:bg-white hover:text-navy"
          >
            <ArrowUp className="h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>

      {/* iri ad — yuxarıdan aşağıya sönən gradient, hərflər scroll ilə qalxır */}
      <p
        className="footer-word mt-16 flex select-none justify-center font-display text-[24vw] leading-[0.8] md:mt-20"
        aria-label={BRAND}
      >
        {BRAND.split("").map((l, i) => (
          <span key={i} className="overflow-hidden pb-[0.04em]">
            <span className="footer-letter inline-block bg-gradient-to-b from-white via-white/70 to-white/[0.06] bg-clip-text text-transparent">
              {l}
            </span>
          </span>
        ))}
      </p>

      <div className="relative -mt-[3vw] flex flex-col gap-3 border-t border-white/10 py-6 pr-hook text-xs text-white/40 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} {BRAND_FULL}. Bütün hüquqlar qorunur.</p>
      </div>
    </footer>
  );
}
