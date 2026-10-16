"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import {
  COLLECTION_FILM,
  COLORS,
  DIMENSIONS,
  FILM_NOTES,
  MANIFESTO,
  NAV,
  PRODUCTS,
  SERVICES,
  STATS,
  WORKSHOP,
} from "./content";
import { FRAME_PACKS, type FramePackKey } from "./framePacks";
import { createFrameSequence, type FrameSequence } from "./frameSequence";
import { getFrames, loadFrames, onFrameProgress } from "./frameStore";
import { useRouter } from "next/navigation";
import type { Annotation, Measurements, StudioScene } from "./studioScene";
import "./forma.css";

const DIMENSION_KEYS = [
  { id: "w", from: "w0", to: "w1", label: DIMENSIONS.width },
  { id: "h", from: "h0", to: "h1", label: DIMENSIONS.height },
  { id: "d", from: "d0", to: "d1", label: DIMENSIONS.depth },
] as const;

const PART_NOTES = ["Qoz ağacı karkas", "Kərtmə birləşmə", "Yüksək sıxlıqlı sünger"];

/** Kolleksiya lenti: məhsulların arasına bir kadr kartı qoyulur. */
type TrackItem = { kind: "product"; product: (typeof PRODUCTS)[number] } | { kind: "film" };

const TRACK_ITEMS: TrackItem[] = [
  { kind: "product", product: PRODUCTS[0] },
  { kind: "product", product: PRODUCTS[1] },
  { kind: "film" },
  { kind: "product", product: PRODUCTS[2] },
  { kind: "product", product: PRODUCTS[3] },
  { kind: "product", product: PRODUCTS[4] },
];

const GHOST_WORDS = TRACK_ITEMS.map((item) =>
  item.kind === "film" ? COLLECTION_FILM.word : item.product.name.split(" ")[0],
);

/** 3D maketdən gələn ölçüləri SVG yazılarına yazır. */
function applyMeasurements(svg: SVGSVGElement | null, measurements: Measurements) {
  if (!svg) return;
  const write = (id: string, value: string) => {
    const label = svg.querySelector<SVGTextElement>(`[data-dim-label="${id}"]`);
    if (label) label.textContent = value;
  };
  write("w", measurements.width);
  write("h", measurements.height);
  write("d", measurements.depth);
}

export function FormaPage() {
  const root = useRef<HTMLDivElement>(null);
  const studioCanvas = useRef<HTMLCanvasElement>(null);
  const workshopCanvas = useRef<HTMLCanvasElement>(null);
  const serviceCanvas = useRef<HTMLCanvasElement>(null);
  const filmCanvas = useRef<HTMLCanvasElement>(null);
  const cardCanvas = useRef<HTMLCanvasElement>(null);
  const footerCanvas = useRef<HTMLCanvasElement>(null);
  const meterCount = useRef<HTMLSpanElement>(null);
  const meterBar = useRef<HTMLElement>(null);
  const studio = useRef<StudioScene | null>(null);
  const dimensions = useRef<SVGSVGElement>(null);
  const dimensionParts = useRef<{ line: SVGLineElement; label: SVGTextElement }[] | null>(null);
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [studioReady, setStudioReady] = useState(false);
  const router = useRouter();
  const portal = useRef<HTMLDivElement>(null);

  /** Mağazaya keçid: düymədən böyüyən dairədə mağazanın fasadı açılır, sonra səhifə dəyişir. */
  const openStore = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const layer = portal.current;
    if (!layer || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    router.prefetch("/magaza");
    gsap.timeline({ onComplete: () => router.push("/magaza") })
      .set(layer, { visibility: "visible", clipPath: `circle(0px at ${x}px ${y}px)` })
      .to(layer, { clipPath: `circle(${radius}px at ${x}px ${y}px)`, duration: 1.1, ease: "expo.inOut" })
      .fromTo(layer.querySelector("img"), { scale: 1.25 }, { scale: 1, duration: 1.3, ease: "expo.out" }, 0);
  };

  /** Hər kadrda 3D-dən gələn nöqtələri ölçü xətlərinə yazır (React render-i olmadan). */
  const annotate = useCallback((points: Annotation, strength: number) => {
    const svg = dimensions.current;
    if (!svg) return;
    svg.style.opacity = strength.toFixed(3);
    if (strength <= 0.001) return;
    if (!dimensionParts.current) {
      dimensionParts.current = DIMENSION_KEYS.map(({ id }) => ({
        line: svg.querySelector<SVGLineElement>(`[data-dim-line="${id}"]`)!,
        label: svg.querySelector<SVGTextElement>(`[data-dim-label="${id}"]`)!,
      }));
    }
    DIMENSION_KEYS.forEach(({ from, to }, index) => {
      const start = points[from];
      const end = points[to];
      const { line, label } = dimensionParts.current![index];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      line.setAttribute("x1", start.x.toFixed(1));
      line.setAttribute("y1", start.y.toFixed(1));
      line.setAttribute("x2", end.x.toFixed(1));
      line.setAttribute("y2", end.y.toFixed(1));
      line.style.strokeDasharray = `${length}`;
      line.style.strokeDashoffset = `${length * (1 - strength)}`;
      label.setAttribute("x", ((start.x + end.x) / 2).toFixed(1));
      label.setAttribute("y", ((start.y + end.y) / 2 - 10).toFixed(1));
    });
  }, []);

  useEffect(() => {
    const story = document.getElementById("story");
    if (!story || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    import("./studioScene")
      .then(({ createStudioScene }) => {
        if (disposed || !studioCanvas.current) return;
        studio.current = createStudioScene({
          canvas: studioCanvas.current,
          story,
          onReady: () => setStudioReady(true),
          onComplete: () => {
            if (root.current) root.current.dataset.studio = "complete";
            window.dispatchEvent(new Event("forma:studio-complete"));
          },
          onMeasure: (measurements) => applyMeasurements(dimensions.current, measurements),
          onAnnotate: annotate,
        });
      })
      .catch(() => {
        // WebGL yoxdursa fotoşəkil fonu qalır.
      });
    return () => {
      disposed = true;
      studio.current?.dispose();
      studio.current = null;
    };
  }, [annotate]);

  useEffect(() => {
    studio.current?.setColor(color);
    root.current?.style.setProperty("--pick", color);
  }, [color, studioReady]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- kadr ardıcıllıqları: paketlər əvvəlcədən yüklənir, sonra canvas-lara bağlanır ---- */
    const films: FrameSequence[] = [];
    let serviceFilm: FrameSequence | null = null;
    let roomFilm: FrameSequence | null = null;
    let cardFilm: FrameSequence | null = null;
    let shopFilm: FrameSequence | null = null;
    let footerFilm: FrameSequence | null = null;
    const mountFilm = (canvas: HTMLCanvasElement | null, ...keys: FramePackKey[]) => {
      const frames = getFrames(...keys);
      if (!canvas || !frames.length) return null;
      const { width, height } = FRAME_PACKS[keys[0]];
      const sequence = createFrameSequence(canvas, frames, width, height);
      films.push(sequence);
      return sequence;
    };

    let lenis: Lenis | undefined;
    let ticker: ((time: number) => void) | undefined;
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.45, touchMultiplier: 1.1 });
      lenis.on("scroll", ScrollTrigger.update);
      ticker = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
    }

    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || !element.contains(anchor)) return;
      const id = anchor.getAttribute("href");
      const target = id && document.querySelector<HTMLElement>(id);
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.7 });
      else target.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
      history.replaceState(null, "", id);
    };
    element.addEventListener("click", navigate);

    // giriş animasiyaları pərdə qalxanda başlayır
    let disposed = false;
    let introPlayed = false;
    const intro: gsap.core.Animation[] = [];
    const queueIntro = <T extends gsap.core.Animation>(animation: T): T => {
      if (introPlayed) animation.play();
      else intro.push(animation);
      return animation;
    };

    const context = gsap.context(() => {
      gsap.to(".forma-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });

      // başlıqlar hərf-hərf maskadan qalxır; hero yükləmə bitənə qədər gözləyir
      const splits: SplitText[] = [];
      element.querySelectorAll<HTMLElement>(".forma-split").forEach((heading) => {
        const hero = heading.dataset.hero === "true";
        const split = SplitText.create(heading, {
          type: "chars,words,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => {
            const reveal = gsap.from(self.chars, {
              yPercent: 118,
              duration: hero ? 1.5 : 1.1,
              ease: "expo.out",
              stagger: hero ? 0.035 : 0.018,
              delay: hero ? 0.35 : 0,
              paused: hero,
              scrollTrigger: hero ? undefined : { trigger: heading, start: "top 88%" },
            });
            return hero ? queueIntro(reveal) : reveal;
          },
        });
        splits.push(split);
      });

      if (reduced) return;

      queueIntro(
        gsap.fromTo(
          ".forma-hero .forma-reveal",
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, delay: 0.9, paused: true },
        ),
      );
      element.querySelectorAll<HTMLElement>(".forma-panel:not(.forma-hero) .forma-reveal").forEach((item) => {
        gsap.from(item, {
          autoAlpha: 0,
          y: 38,
          duration: 1.05,
          ease: "power3.out",
          scrollTrigger: { trigger: item, start: "top 86%", toggleActions: "play none none reverse" },
        });
      });

      // hekayə bitəndə səhnə yumşaq sönür
      ScrollTrigger.create({
        trigger: "#manifest",
        start: "top 85%",
        onEnter: () => element.classList.add("is-past-story"),
        onLeaveBack: () => element.classList.remove("is-past-story"),
      });

      gsap.fromTo(
        ".forma-word",
        { opacity: 0.12 },
        { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".forma-manifesto", start: "top 82%", end: "bottom 50%", scrub: true } },
      );
      element.querySelectorAll<HTMLElement>(".forma-stat-value").forEach((item) => {
        const counter = { value: 0 };
        gsap.to(counter, {
          value: Number(item.dataset.value),
          duration: 2.1,
          ease: "power2.out",
          onUpdate: () => {
            item.textContent = Math.round(counter.value).toLocaleString("en-US").replace(",", " ");
          },
          scrollTrigger: { trigger: ".forma-stats", start: "top 82%" },
        });
      });

      /* ---- servislər: sətirlər maskadan qalxır, yan pəncərədə kadrlar sürüşür ---- */
      const serviceBlock = element.querySelector<HTMLElement>(".forma-services")!;
      ScrollTrigger.create({
        // pəncərə ekranda olduğu bütün müddət — 144 kadr ~1600px-ə yayılır
        trigger: serviceBlock,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => serviceFilm?.draw(self.progress),
      });
      element.querySelectorAll<HTMLElement>(".forma-service").forEach((row) => {
        gsap.from(row.querySelector(".forma-service-inner"), {
          yPercent: 115,
          autoAlpha: 0,
          duration: 1.15,
          ease: "expo.out",
          scrollTrigger: { trigger: row, start: "top 92%" },
        });
        gsap.fromTo(
          row.querySelector(".forma-service-rule"),
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { trigger: row, start: "top 94%", end: "top 58%", scrub: true } },
        );
        ScrollTrigger.create({
          trigger: row,
          start: "top 70%",
          end: "bottom 48%",
          onToggle: (self) => row.classList.toggle("is-active", self.isActive),
        });
      });

      /* ---- kadr bölməsi: pəncərə açılır, qeydlər dəyişir ---- */
      const filmSection = element.querySelector<HTMLElement>("#film")!;
      const filmNotes = Array.from(filmSection.querySelectorAll<HTMLElement>(".forma-film-note"));
      const filmBar = filmSection.querySelector<HTMLElement>(".forma-film-bar span")!;
      let shownNote = 0;
      ScrollTrigger.create({
        trigger: filmSection,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          roomFilm?.draw(self.progress);
          filmBar.style.transform = `scaleX(${self.progress.toFixed(3)})`;
          const nearest = Math.min(filmNotes.length - 1, Math.floor(self.progress * filmNotes.length));
          if (nearest === shownNote) return;
          filmNotes[shownNote]?.classList.remove("is-on");
          filmNotes[nearest]?.classList.add("is-on");
          shownNote = nearest;
        },
      });
      gsap.fromTo(
        ".forma-film-stage .forma-film-window",
        { clipPath: "inset(16% 22% 16% 22%)" },
        { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: filmSection, start: "top top", end: "+=70%", scrub: true } },
      );
      gsap.to(".forma-film-copy", {
        yPercent: -14,
        ease: "none",
        scrollTrigger: { trigger: filmSection, start: "top top", end: "+=300%", scrub: true },
      });

      /* ---- emalatxana: dörd qısa video ardıcıl bir lent kimi oynayır ---- */
      const sequence = element.querySelector<HTMLElement>("#seq")!;
      const captions = Array.from(sequence.querySelectorAll<HTMLElement>(".forma-caption"));
      const cutVeil = sequence.querySelector<HTMLElement>(".forma-workshop-cut")!;
      const bar = sequence.querySelector<HTMLElement>(".forma-frame-bar span")!;
      const clipCount = WORKSHOP.length;
      let shownClip = 0;
      ScrollTrigger.create({
        trigger: sequence,
        start: "top top",
        end: "+=640%",
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          const position = self.progress;
          shopFilm?.draw(position);
          bar.style.transform = `scaleX(${position.toFixed(3)})`;
          // videolar bir-birini əvəz edəndə qısa qaralma
          let flash = 0;
          for (let index = 1; index < clipCount; index++) {
            flash = Math.max(flash, 1 - Math.abs(position - index / clipCount) / 0.02);
          }
          cutVeil.style.opacity = Math.max(0, Math.min(1, flash)).toFixed(3);
          const current = Math.min(clipCount - 1, Math.floor(position * clipCount));
          if (current === shownClip) return;
          captions[shownClip]?.classList.remove("is-on");
          captions[current]?.classList.add("is-on");
          shownClip = current;
        },
      });

      /* ---- kolleksiya: üfüqi scroll, 3D əyilmə, kölgə söz ---- */
      const track = element.querySelector<HTMLElement>(".forma-track")!;
      const cards = Array.from(track.querySelectorAll<HTMLElement>(".forma-card"));
      const ghosts = Array.from(element.querySelectorAll<HTMLElement>(".forma-ghost-word"));
      const media = gsap.matchMedia();
      media.add("(min-width: 901px)", () => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const parallax = cards.map((card) => gsap.quickTo(card.querySelector(".forma-card-media"), "xPercent", { duration: 0.6, ease: "power3" }));
        let shownGhost = 0;
        const horizontal = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: "#col",
            start: "top top",
            end: () => `+=${distance() + window.innerHeight * 0.5}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              cardFilm?.draw(self.progress);
              const middle = window.innerWidth / 2;
              let closest = 0;
              let closestOffset = Infinity;
              cards.forEach((card, position) => {
                const rect = card.getBoundingClientRect();
                const center = rect.left + rect.width / 2;
                const offset = (center - middle) / window.innerWidth;
                const near = Math.abs(offset);
                parallax[position](gsap.utils.clamp(-9, 9, offset * 16));
                card.classList.toggle("is-near", near < 0.22);
                // mərkəzdən uzaqlaşdıqca kart yana çevrilir və kiçilir
                const tilt = gsap.utils.clamp(-15, 15, offset * -26);
                const shrink = 1 - Math.min(near, 0.62) * 0.16;
                card.style.transform = `perspective(1500px) rotateY(${tilt.toFixed(2)}deg) scale(${shrink.toFixed(3)})`;
                if (near < closestOffset) {
                  closestOffset = near;
                  closest = position;
                }
              });
              if (closest !== shownGhost) {
                ghosts[shownGhost]?.classList.remove("is-on");
                ghosts[closest]?.classList.add("is-on");
                shownGhost = closest;
              }
              gsap.set(track, { skewX: gsap.utils.clamp(-5, 5, self.getVelocity() / -900) });
            },
          },
        });
        gsap.from(".forma-card-image", {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: "#col", start: "top 55%" },
        });
        return () => {
          horizontal.scrollTrigger?.kill();
          cards.forEach((card) => {
            card.style.transform = "";
          });
        };
      });
      media.add("(max-width: 900px)", () => {
        const reveal = gsap.from(".forma-card", {
          autoAlpha: 0,
          y: 60,
          duration: 1,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: "#col", start: "top 70%" },
        });
        return () => reveal.kill();
      });

      /* ---- footer: kadr lenti + marquee ---- */
      const footerBand = element.querySelector<HTMLElement>(".forma-footer-film")!;
      ScrollTrigger.create({
        trigger: footerBand,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => footerFilm?.draw(self.progress),
      });
      gsap.fromTo(
        footerBand,
        { clipPath: "inset(0% 18% 0% 18%)" },
        { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: footerBand, start: "top 96%", end: "top 34%", scrub: true } },
      );
      gsap.to(".forma-marquee", {
        xPercent: -34,
        ease: "none",
        scrollTrigger: { trigger: footerBand, start: "top bottom", end: "bottom top", scrub: 0.6 },
      });
      gsap.from(".forma-footer-foot", {
        autoAlpha: 0,
        y: 40,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".forma-footer-foot", start: "top bottom" },
      });

      /* ---- naviqasiya: aktiv bölmə ---- */
      NAV.forEach(({ href }) => {
        const link = element.querySelector<HTMLAnchorElement>(`.forma-header a[href="${href}"]`);
        const section = document.querySelector<HTMLElement>(href);
        if (!link || !section) return;
        const activate = (on: boolean) => {
          if (!on) return;
          element.querySelectorAll(".forma-header a").forEach((item) => item.classList.remove("is-active"));
          link.classList.add("is-active");
        };
        ScrollTrigger.create({
          trigger: section,
          start: "top 45%",
          end: "bottom 45%",
          onToggle: (self) => activate(self.isActive),
        });
      });

      /* ---- scroll sürəti mətnə yüngül əyilmə verir ---- */
      const skewTargets = gsap.utils.toArray<HTMLElement>("[data-skew]");
      const skewTo = skewTargets.map((target) => gsap.quickTo(target, "skewY", { duration: 0.7, ease: "power3" }));
      ScrollTrigger.create({
        onUpdate: (self) => {
          const amount = gsap.utils.clamp(-3.4, 3.4, self.getVelocity() / -1200);
          skewTo.forEach((set) => set(amount));
        },
      });

      /* ---- maqnit düymələr ---- */
      element.querySelectorAll<HTMLElement>(".forma-magnetic").forEach((button) => {
        const moveX = gsap.quickTo(button, "x", { duration: 0.45, ease: "power3" });
        const moveY = gsap.quickTo(button, "y", { duration: 0.45, ease: "power3" });
        button.addEventListener("pointermove", (event) => {
          const rect = button.getBoundingClientRect();
          moveX((event.clientX - rect.left - rect.width / 2) * 0.32);
          moveY((event.clientY - rect.top - rect.height / 2) * 0.45);
        });
        button.addEventListener("pointerleave", () => {
          moveX(0);
          moveY(0);
        });
      });

      return () => splits.forEach((split) => split.revert());
    }, element);

    document.fonts.ready.then(() => {
      if (element.isConnected) ScrollTrigger.refresh();
    });

    /* ---- yükləmə: bütün kadrlar faizlə yüklənir, yalnız sonra pərdə qalxır ---- */
    const meter = { value: 0 };
    const renderMeter = () => {
      if (meterCount.current) meterCount.current.textContent = String(Math.round(meter.value));
      if (meterBar.current) meterBar.current.style.transform = `scaleX(${(meter.value / 100).toFixed(3)})`;
    };
    const meterTo = gsap.quickTo(meter, "value", { duration: 0.45, ease: "power2.out", onUpdate: renderMeter });
    const stopProgress = onFrameProgress((value) => meterTo(value * 100));
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    // 3D səhnə (divan + kreslo) tam hazır olanda — shader-lər əvvəlcədən compile olunub
    const studioComplete = new Promise<void>((resolve) => {
      if (element.dataset.studio === "complete") resolve();
      window.addEventListener("forma:studio-complete", () => resolve(), { once: true });
    });

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    lenis?.stop();

    (reduced ? Promise.resolve() : loadFrames())
      .then(() => {
        if (disposed) return;
        // canvas-lar indi bağlanır ki, ilk kadrlar pərdə qalxmamış decode olsun
        serviceFilm = mountFilm(serviceCanvas.current, "craft");
        roomFilm = mountFilm(filmCanvas.current, "room");
        cardFilm = mountFilm(cardCanvas.current, "living");
        shopFilm = mountFilm(workshopCanvas.current, "shop1", "shop2", "shop3", "shop4");
        footerFilm = mountFilm(footerCanvas.current, "lathe");
        return reduced ? undefined : Promise.race([studioComplete, wait(4000)]);
      })
      .then(() => {
        meterTo(100);
        return wait(reduced ? 0 : 600);
      })
      .then(() => {
        if (disposed) return;
        element.classList.add("is-loaded");
        lenis?.start();
        introPlayed = true;
        intro.forEach((animation) => animation.play());
      });

    /* ---- kursor ---- */
    const cursor = element.querySelector<HTMLElement>(".forma-cursor");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const moveX = cursor && gsap.quickTo(cursor, "x", { duration: 0.32, ease: "power3" });
    const moveY = cursor && gsap.quickTo(cursor, "y", { duration: 0.32, ease: "power3" });
    const move = (event: PointerEvent) => {
      if (cursor) cursor.style.opacity = "1";
      moveX?.(event.clientX);
      moveY?.(event.clientY);
    };
    const hover = (event: PointerEvent) =>
      cursor?.classList.toggle("is-large", !!(event.target as Element).closest("a,button,.forma-card"));
    if (fine && !reduced) {
      window.addEventListener("pointermove", move, { passive: true });
      element.addEventListener("pointerover", hover);
    }

    return () => {
      element.removeEventListener("click", navigate);
      element.removeEventListener("pointerover", hover);
      window.removeEventListener("pointermove", move);
      if (ticker) gsap.ticker.remove(ticker);
      disposed = true;
      stopProgress();
      lenis?.destroy();
      context.revert();
      films.forEach((film) => film.dispose());
    };
  }, []);

  const activeColor = COLORS.find((swatch) => swatch.value === color) ?? COLORS[0];

  return (
    <div ref={root} className="forma">
      <div className="forma-curtain" aria-hidden="true">
        <span className="forma-curtain-word">Forma</span>
        <div className="forma-curtain-meter">
          <i ref={meterBar} />
        </div>
        <span className="forma-curtain-count">
          <span ref={meterCount}>0</span>%
        </span>
      </div>
      <div className="forma-cursor" aria-hidden="true" />
      <div className="forma-progress" aria-hidden="true" />

      <div className={`forma-scene ${studioReady ? "is-ready" : ""}`} aria-hidden="true">
        <div className="forma-scene-fallback">
          <Image src={PRODUCTS[0].image} alt="" fill sizes="100vw" priority />
        </div>
        <canvas ref={studioCanvas} />
        <svg className="forma-dims" ref={dimensions} aria-hidden="true">
          {DIMENSION_KEYS.map(({ id, label }) => (
            <g key={id}>
              <line data-dim-line={id} x1="0" y1="0" x2="0" y2="0" />
              <text data-dim-label={id} x="0" y="0" textAnchor="middle">
                {label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <header className="forma-header">
        <a className="forma-logo" href="#story" aria-label="Forma — başlanğıc">Forma</a>
        <nav aria-label="Əsas naviqasiya">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>
      </header>

      <main>
        <div id="story" className="forma-story">
          <section className="forma-panel forma-hero" aria-labelledby="forma-title">
            <div className="forma-panel-copy">
              <span className="forma-eyebrow forma-reveal">Mebel studiyası · Bakı</span>
              <h1 id="forma-title" className="forma-split" data-hero="true" data-skew>
                Sükutun <em>forması</em>
              </h1>
              <p className="forma-lead forma-reveal">Əl işi, sakit xətlər və illərlə qalan material. Evinizi doldurmayan, tamamlayan mebel.</p>
            </div>
            <div className="forma-hero-meta forma-reveal">
              <span>Əl işi · Bakı <i className="forma-line" /></span>
              <span>Kolleksiya 2026</span>
            </div>
          </section>

          <section className="forma-panel is-right" aria-labelledby="material-title">
            <div className="forma-panel-copy">
              <span className="forma-eyebrow forma-reveal">Material</span>
              <h2 id="material-title" className="forma-split" data-skew>Toxuma, <em>toxunuş</em></h2>
              <p className="forma-lead forma-reveal">Təbii yun və kətan qarışığı. Hər parça Avropada toxunur, əllə gərilir və 3 il sınaqdan keçir.</p>
            </div>
          </section>

          <section className="forma-panel" aria-labelledby="construction-title">
            <div className="forma-panel-copy">
              <span className="forma-eyebrow forma-reveal">Konstruksiya</span>
              <h2 id="construction-title" className="forma-split" data-skew>Gizli <em>möhkəmlik</em></h2>
              <p className="forma-lead forma-reveal">Divan gözünüz önündə sökülür: quru sərt ağac karkas, masiv qoz ayaqlar. Mismar yox, kərtmə var.</p>
              <ul className="forma-parts forma-reveal">
                {PART_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="forma-panel is-right" aria-labelledby="colors-title">
            <div className="forma-panel-copy">
              <span className="forma-eyebrow forma-reveal">Rəng</span>
              <h2 id="colors-title" className="forma-split" data-skew>Sizin <em>çalarınız</em></h2>
              <p className="forma-lead forma-reveal">Parçaya toxunun — divan həmin an sizin seçiminizlə geyinir.</p>
              <div className="forma-swatches forma-reveal" role="group" aria-label="Divanın parça rəngi">
                {COLORS.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    className={`forma-swatch ${color === swatch.value ? "is-selected" : ""}`}
                    style={{ backgroundColor: swatch.value }}
                    aria-label={swatch.name}
                    aria-pressed={color === swatch.value}
                    onClick={() => setColor(swatch.value)}
                  />
                ))}
              </div>
              <div className="forma-swatch-name forma-reveal" aria-live="polite">{activeColor.name}</div>
            </div>
          </section>
        </div>

        <section id="manifest" className="forma-manifest" aria-labelledby="manifest-title">
          <span className="forma-eyebrow">Fəlsəfə</span>
          <h2 id="manifest-title" className="forma-manifesto" aria-label={MANIFESTO}>
            {MANIFESTO.split(" ").map((word, position) => (
              <span className="forma-word" aria-hidden="true" key={`${word}-${position}`}>{word}</span>
            ))}
          </h2>
          <div className="forma-stats">
            {STATS.map((stat) => (
              <div className="forma-stat" key={stat.label}>
                <b aria-label={`${stat.value.toLocaleString("en-US").replace(",", " ")}${stat.suffix}`}>
                  <span className="forma-stat-value" aria-hidden="true" data-value={stat.value}>
                    {stat.value.toLocaleString("en-US").replace(",", " ")}
                  </span>
                  {stat.suffix}
                </b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="forma-services">
            <div className="forma-services-list">
              {SERVICES.map((service) => (
                <div className="forma-service" key={service.title}>
                  <i className="forma-service-rule" aria-hidden="true" />
                  <div className="forma-service-inner">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                  <span className="forma-service-mark" aria-hidden="true">↗</span>
                </div>
              ))}
            </div>
            <aside className="forma-services-film" aria-hidden="true">
              <div className="forma-film-window">
                <canvas ref={serviceCanvas} />
              </div>
              <span className="forma-film-tag">Emalatxana · canlı kadr</span>
            </aside>
          </div>
        </section>

        <section id="film" className="forma-film" aria-labelledby="film-title">
          <div className="forma-film-inner">
            <div className="forma-film-copy">
              <span className="forma-eyebrow">Kadr-kadr</span>
              <h2 id="film-title" className="forma-split" data-skew>Otağa girən <em>sükut</em></h2>
              <div className="forma-film-notes">
                {FILM_NOTES.map((note, position) => (
                  <div className={`forma-film-note ${position === 0 ? "is-on" : ""}`} key={note.title}>
                    <b>{note.title}</b>
                    <p>{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="forma-film-stage">
              <div className="forma-film-window">
                <canvas ref={filmCanvas} />
              </div>
              <div className="forma-film-bar" aria-hidden="true"><span /></div>
            </div>
          </div>
        </section>

        <section id="seq" className="forma-workshop" aria-label="Emalatxana — hazırlanma prosesi">
          <canvas ref={workshopCanvas} className="forma-workshop-film" aria-hidden="true" />
          <div className="forma-workshop-cut" aria-hidden="true" />
          <div className="forma-workshop-shade" aria-hidden="true" />
          <div className="forma-workshop-copy">
            <span className="forma-eyebrow">Emalatxana</span>
            {WORKSHOP.map((chapter, position) => (
              <div className={`forma-caption ${position === 0 ? "is-on" : ""}`} key={chapter.title}>
                <h2>{chapter.title}</h2>
                <p>{chapter.description}</p>
              </div>
            ))}
          </div>
          <div className="forma-frame-bar" aria-hidden="true"><span /></div>
        </section>

        <section id="col" className="forma-collection" aria-labelledby="collection-title">
          <div className="forma-collection-ghost" aria-hidden="true">
            {GHOST_WORDS.map((word, position) => (
              <span className={`forma-ghost-word ${position === 0 ? "is-on" : ""}`} key={`${word}-${position}`}>{word}</span>
            ))}
          </div>
          <div className="forma-collection-head">
            <h2 id="collection-title" className="forma-split">Kolleksiya</h2>
          </div>
          <div className="forma-track">
            {TRACK_ITEMS.map((item, position) =>
              item.kind === "film" ? (
                <article className="forma-card is-film" key="film-card">
                  <div className="forma-card-image">
                    <canvas className="forma-card-media" ref={cardCanvas} />
                  </div>
                  <div className="forma-card-meta">
                    <h3>{COLLECTION_FILM.title}</h3>
                    <span className="forma-card-detail">{COLLECTION_FILM.detail}</span>
                  </div>
                </article>
              ) : (
                <article className="forma-card" key={item.product.name}>
                  <div className="forma-card-image">
                    <Image className="forma-card-media" src={item.product.image} alt={item.product.alt} fill sizes="27vw" priority={position < 2} />
                  </div>
                  <div className="forma-card-meta">
                    <h3>{item.product.name}</h3>
                    <span className="forma-card-detail">{item.product.detail}</span>
                    <span className="forma-price">{item.product.price}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      </main>

      <footer id="end" className="forma-footer">
        <div className="forma-footer-film">
          <canvas ref={footerCanvas} aria-hidden="true" />
          <div className="forma-footer-veil" aria-hidden="true" />
          <div className="forma-marquee" aria-hidden="true">
            <span>Forma</span><span>Atelier</span><span>Forma</span><span>Atelier</span><span>Forma</span>
          </div>
        </div>
        <div className="forma-footer-head">
          <span className="forma-eyebrow">Showroom</span>
          <h2 className="forma-split" data-skew>Evinizi <em>birlikdə quraq</em></h2>
          <div className="forma-footer-actions">
            <Link className="forma-store-link forma-magnetic" href="/magaza" onClick={openStore}>
              <span className="forma-store-link-thumb" aria-hidden="true">
                <Image src="/forma/magaza/A1.webp" alt="" fill sizes="64px" />
              </span>
              Mağazaya daxil ol <span aria-hidden="true">→</span>
            </Link>
            <a className="forma-contact forma-magnetic" href="mailto:salam@forma.az">salam@forma.az <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="forma-footer-foot">
          <span>© 2026 Forma Studio</span>
          <span>Nizami küç. 12, Bakı</span>
          <span>Instagram · Behance</span>
        </div>
      </footer>

      <div ref={portal} className="forma-portal" aria-hidden="true">
        <Image src="/forma/magaza/A1.webp" alt="" fill sizes="100vw" />
      </div>
      <div className="forma-grain" aria-hidden="true" />
    </div>
  );
}
