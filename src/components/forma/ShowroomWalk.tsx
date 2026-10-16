"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ORDER_EMAIL, STORE_CATEGORIES, STORE_SOFAS } from "./content";
import { FRAME_PACKS } from "./framePacks";
import { createFrameSequence } from "./frameSequence";
import { getFrames, loadPacks } from "./frameStore";
import "./forma.css";

/**
 * Küçə → qapı → zal → üç divan. Beş klip bir kadr lentidir; səhifə özü scroll
 * olunmur — təkər/trackpad hərəkəti virtual mövqeni dəyişir, mövqe hər kadrda
 * yumşaq (lerp) izlənir və canvas-a ən yaxın kadr çəkilir. Divanların qarşısında
 * qısa dayanacaq var: orada panel açılır.
 */
const CLIPS = ["store1", "store2", "store3", "store4", "store5"] as const;
/** Təkərin 1 px-i neçə kadr irəli aparır (bir "klik" ≈ 100 px ≈ 0.8 san video). */
const SPEED = 0.2;
/** İzləmə yumşaqlığı (0…1, böyük = daha çevik). */
const LERP = 0.1;
/** Təkər bu qədər ms susanda yeni jest sayılır. */
const STOP_IDLE = 160;
/** Kadr statistikası paneli — lazım olanda true et. */
const DEBUG = false;
const HALL_HOLD = 22;
const STOP_HOLD = 40;

type Segment = { from: number; to: number; frameFrom: number; frameTo: number; stop: number };

function buildTimeline() {
  const counts = CLIPS.map((key) => FRAME_PACKS[key].count);
  const segments: Segment[] = [];
  let unit = 0;
  let frame = 0;
  const play = (count: number) => {
    segments.push({ from: unit, to: unit + count, frameFrom: frame, frameTo: frame + count - 1, stop: -1 });
    unit += count;
    frame += count;
  };
  const hold = (length: number, stop: number) => {
    segments.push({ from: unit, to: unit + length, frameFrom: frame - 1, frameTo: frame - 1, stop });
    unit += length;
  };
  play(counts[0]);
  play(counts[1]);
  hold(HALL_HOLD, -1);
  const divanStart = unit;
  play(counts[2]);
  hold(STOP_HOLD, 0);
  play(counts[3]);
  hold(STOP_HOLD, 1);
  play(counts[4]);
  hold(STOP_HOLD, 2);
  return {
    segments,
    units: unit,
    frames: frame,
    divanStart,
    // kamera divanların qarşısında burada dayanır
    stops: segments.filter((item) => item.stop >= 0).map((item) => (item.from + item.to) / 2),
    menuFrom: counts[0] + counts[1] * 0.7,
    introUntil: counts[0] * 0.4,
  };
}

const TIMELINE = buildTimeline();

type Order = { sofa: number; color: number };

export function ShowroomWalk() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const debug = useRef<HTMLPreElement>(null);
  const orderOpen = useRef(false);
  const jump = useRef<(unit: number) => void>(() => {});
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [stop, setStop] = useState(-1);
  const [menu, setMenu] = useState(false);
  const [intro, setIntro] = useState(true);
  const [picks, setPicks] = useState<number[]>(() => STORE_SOFAS.map(() => 0));
  const [order, setOrder] = useState<Order | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    let disposed = false;
    let raf = 0;
    let target = 0;
    let current = 0;
    const state = { stop: -1, menu: false, intro: true };
    let film: ReturnType<typeof createFrameSequence> | null = null;

    // məhsullar arası keçid: sabit müddətli, yumşaq başlayıb yumşaq bitən hərəkət
    let glide: { from: number; to: number; start: number; duration: number } | null = null;
    const glideTo = (to: number) => {
      const distance = Math.abs(to - current);
      glide = { from: current, to, start: performance.now(), duration: Math.min(1800, 700 + distance * 7) };
      target = to;
    };
    const render = () => {
      if (glide) {
        const t = Math.min(1, (performance.now() - glide.start) / glide.duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        current = glide.from + (glide.to - glide.from) * eased;
        if (t >= 1) glide = null;
      } else current += (target - current) * LERP;
      if (Math.abs(target - current) < 0.01) current = target;
      const segment =
        TIMELINE.segments.find((item) => current < item.to) ?? TIMELINE.segments[TIMELINE.segments.length - 1];
      const local = Math.min(1, Math.max(0, (current - segment.from) / (segment.to - segment.from)));
      film?.draw((segment.frameFrom + (segment.frameTo - segment.frameFrom) * local) / (TIMELINE.frames - 1));
      if (bar.current) bar.current.style.transform = `scaleX(${(current / TIMELINE.units).toFixed(4)})`;
      const next = { stop: segment.stop, menu: current >= TIMELINE.menuFrom, intro: current < TIMELINE.introUntil };
      if (next.stop !== state.stop) setStop((state.stop = next.stop));
      if (next.menu !== state.menu) setMenu((state.menu = next.menu));
      if (next.intro !== state.intro) setIntro((state.intro = next.intro));
      if (DEBUG && debug.current && film) {
        const stats = film.stats();
        debug.current.textContent = `hədəf ${stats.target}  çəkilən ${stats.shown}
hit ${stats.hits}  miss ${stats.misses}
decode ${stats.decoding}  yaddaşda ${stats.decoded} (${stats.memory} MB)`;
      }
      raf = requestAnimationFrame(render);
    };

    // divan bölməsində bir jest = bir məhsul: kamera növbəti divana özü gedir,
    // yol boyu gələn təkər hadisələri (ətalət) yeni addım sayılmır
    let lastInput = 0;
    const firstStop = TIMELINE.stops[0];
    const move = (delta: number) => {
      const now = performance.now();
      const fresh = now - lastInput > STOP_IDLE;
      lastInput = now;
      // keçid gedərkən və dayanacaqda həmin jestin qalığı gəldikcə yeni addım yoxdur;
      // küçə, qapı və zalda scroll heç vaxt bloklanmır
      if (glide) return;
      if (!fresh && TIMELINE.stops.some((point) => Math.abs(point - target) < 0.5)) return;
      const inSofas = target >= firstStop - 0.5;
      if (inSofas && (delta > 0 || target > firstStop + 0.5)) {
        const index = TIMELINE.stops.findIndex((point) => Math.abs(point - target) < 0.5);
        const next = TIMELINE.stops[index + Math.sign(delta)];
        if (next === undefined && delta > 0) return;
        glideTo(next ?? firstStop);
        return;
      }
      const next = Math.min(TIMELINE.units, Math.max(0, target + delta));
      if (delta > 0 && target < firstStop && next >= firstStop) {
        glideTo(firstStop);
        return;
      }
      target = next;
    };
    jump.current = (unit) => {
      target = unit;
    };
    const onWheel = (event: WheelEvent) => {
      if (orderOpen.current) return;
      event.preventDefault();
      // deltaMode 1 = sətir (Firefox) — piksələ çevrilir
      const pixels = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
      move(Math.max(-160, Math.min(160, pixels)) * SPEED);
    };
    const KEYS: Record<string, number> = { ArrowDown: 30, PageDown: 90, " ": 90, ArrowUp: -30, PageUp: -90 };
    const onKey = (event: KeyboardEvent) => {
      if (orderOpen.current || !(event.key in KEYS)) return;
      event.preventDefault();
      move(KEYS[event.key]);
    };
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0].clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0].clientY;
      move((touchY - y) * SPEED * 1.6);
      touchY = y;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // bütün kadrlar əvvəlcədən yüklənir — gəzinti zamanı şəbəkə gözlənilmir
    loadPacks(CLIPS, setLoaded).then(() => {
      if (disposed) return;
      film = createFrameSequence(surface, getFrames(...CLIPS), FRAME_PACKS.store1.width, FRAME_PACKS.store1.height, {
        ahead: 70,
        behind: 24,
        parallel: 8,
      });
      setReady(true);
      raf = requestAnimationFrame(render);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      film?.dispose();
    };
  }, []);

  // sifariş pəncərəsi açıq olanda gəzinti dayanır
  useEffect(() => {
    orderOpen.current = order !== null;
    if (!order) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOrder(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [order]);

  const goToCategory = (isReady: boolean) => {
    if (isReady) jump.current(TIMELINE.divanStart + 1);
  };

  const pick = (sofa: number, color: number) =>
    setPicks((previous) =>
      previous.map((value, index) => (index === sofa ? color : value)),
    );

  const openOrder = (sofa: number) => {
    setSent(false);
    setOrder({ sofa, color: picks[sofa] });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    const data = new FormData(event.currentTarget);
    const sofa = STORE_SOFAS[order.sofa];
    const color = sofa.colors[order.color];
    const subject = `Sifariş: ${sofa.name} — ${color.name}`;
    const body = [
      `Məhsul: ${sofa.name} (${sofa.type})`,
      `Rəng: ${color.name}`,
      `Qiymət: ${sofa.price}`,
      "",
      `Ad: ${data.get("name")}`,
      `Telefon: ${data.get("phone")}`,
      `Qeyd: ${data.get("note") || "—"}`,
    ].join("\n");
    window.location.href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const ordered = order && STORE_SOFAS[order.sofa];

  return (
    <div className="forma forma-store-page">
      <header className="forma-store-home">
        <Link className="forma-logo" href="/">
          Forma
        </Link>
        <Link href="/">← Ana səhifə</Link>
      </header>
      {/* əsas düzən inline-dır: stil faylı gəlməmişdən də mağaza görünmür */}
      <div
        className={`forma-store-loader ${ready ? "is-done" : ""}`}
        style={{ position: "fixed", inset: 0, zIndex: 70, background: "#0b0a09" }}
        aria-hidden="true"
      >
        <span>Showroom</span>
        <i>
          <b style={{ transform: `scaleX(${loaded})` }} />
        </i>
        <em>{Math.round(loaded * 100)}%</em>
      </div>
      <section
        id="magaza"
        className={`forma-store ${order ? "has-order" : ""} ${stop >= 0 ? "is-stop" : ""}`}
        aria-label="Mağaza — showroom gəzintisi"
      >
        <div className="forma-store-stage" aria-hidden="true">
          <Image
            className="forma-store-poster"
            src="/forma/magaza/A1.webp"
            alt=""
            fill
            sizes="100vw"
          />
          <canvas ref={canvas} className="forma-store-film" />
          {STORE_SOFAS.map((sofa, sofaIndex) =>
            sofa.colors.map((color, colorIndex) =>
              color.image ? (
                <Image
                  key={`${sofa.name}-${color.name}`}
                  className={`forma-store-variant ${stop === sofaIndex && picks[sofaIndex] === colorIndex ? "is-on" : ""}`}
                  src={color.image}
                  alt=""
                  fill
                  sizes="100vw"
                />
              ) : null,
            ),
          )}
          <div className={`forma-store-shade ${intro && ready ? "is-on" : ""}`} />
        </div>

        <div className={`forma-store-intro ${intro && ready ? "is-on" : ""}`}>
          <span className="forma-eyebrow">Showroom</span>
          <h2>
            İçəri <em>buyurun</em>
          </h2>
          <p>Hər parçanın arxasında bir usta, hər xəttin arxasında bir hekayə. Qapılar sizin üçün açılır.</p>
        </div>

        <nav
          className={`forma-store-cats ${menu ? "is-on" : ""}`}
          aria-label="Mağaza kateqoriyaları"
        >
          {STORE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={category.ready ? "is-active" : ""}
              disabled={!category.ready}
              title={category.ready ? undefined : "Tezliklə"}
              onClick={() => goToCategory(category.ready)}
            >
              {category.label}
              {!category.ready && <small>Tezliklə</small>}
            </button>
          ))}
        </nav>

        {STORE_SOFAS.map((sofa, sofaIndex) => {
          const color = sofa.colors[picks[sofaIndex]];
          return (
            <article
              key={sofa.name}
              className={`forma-store-panel ${stop === sofaIndex ? "is-on" : ""}`}
              aria-hidden={stop !== sofaIndex}
            >
              <div className="forma-store-panel-top">
                <span className="forma-eyebrow">{sofa.type}</span>
                <b className="forma-store-price">{sofa.price}</b>
              </div>
              <h3>{sofa.name}</h3>
              <p>{sofa.description}</p>
              <dl>
                {sofa.specs.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div
                className="forma-store-colors"
                role="group"
                aria-label={`${sofa.name} — rəng`}
              >
                {sofa.colors.map((item, colorIndex) => (
                  <button
                    key={item.name}
                    type="button"
                    className={`forma-swatch ${picks[sofaIndex] === colorIndex ? "is-selected" : ""}`}
                    style={{ backgroundColor: item.swatch }}
                    aria-label={item.name}
                    aria-pressed={picks[sofaIndex] === colorIndex}
                    tabIndex={stop === sofaIndex ? 0 : -1}
                    onClick={() => pick(sofaIndex, colorIndex)}
                  />
                ))}
                <span className="forma-store-color-name">{color.name}</span>
              </div>
              <button
                type="button"
                className="forma-store-order"
                tabIndex={stop === sofaIndex ? 0 : -1}
                onClick={() => openOrder(sofaIndex)}
              >
                Sifariş ver <span aria-hidden="true">→</span>
              </button>
            </article>
          );
        })}

        {DEBUG && <pre ref={debug} className="forma-store-debug" aria-hidden="true" />}
        <div className="forma-store-progress" aria-hidden="true">
          <b ref={bar} />
        </div>
        <div
          className={`forma-order-backdrop ${order ? "is-open" : ""}`}
          onClick={() => setOrder(null)}
          aria-hidden="true"
        />
        <aside
          className={`forma-order ${order ? "is-open" : ""}`}
          aria-hidden={!order}
          data-lenis-prevent
          role="dialog"
          aria-label="Sifariş"
        >
          {ordered && order && (
            <>
              <button
                type="button"
                className="forma-order-close"
                onClick={() => setOrder(null)}
                aria-label="Bağla"
              >
                ×
              </button>
              <span className="forma-eyebrow">Sifariş</span>
              <h3>{ordered.name}</h3>
              <div className="forma-order-summary">
                <i
                  style={{
                    backgroundColor: ordered.colors[order.color].swatch,
                  }}
                />
                <span>
                  {ordered.type} · {ordered.colors[order.color].name}
                </span>
                <b>{ordered.price}</b>
              </div>
              {sent ? (
                <p className="forma-order-done">
                  Təşəkkür edirik! Poçt proqramınızda sifariş məktubu hazırdır —
                  göndərin, 24 saat ərzində sizinlə əlaqə saxlayacağıq.
                </p>
              ) : (
                <form onSubmit={submit}>
                  <label>
                    <span>Ad, soyad</span>
                    <input name="name" required autoComplete="name" />
                  </label>
                  <label>
                    <span>Telefon</span>
                    <input
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="+994"
                    />
                  </label>
                  <label>
                    <span>Qeyd</span>
                    <textarea
                      name="note"
                      rows={3}
                      placeholder="Ünvan, ölçü və ya sual"
                    />
                  </label>
                  <button type="submit" className="forma-store-order">
                    Sifarişi göndər <span aria-hidden="true">→</span>
                  </button>
                </form>
              )}
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
