"use client";

/**
 * Ağır, bir dəfəlik işləri (3D səhnənin hazırlanması) istifadəçi scroll ETMƏYƏNDƏ görmək üçün "qapı".
 *
 *  - wait(): son scroll-dan QUIET_MS keçəndə VƏ brauzer boş olanda həll olur. İşi addımlara bölüb
 *    hər addımdan əvvəl `await gate.wait()` etmək kifayətdir — scroll başlayan kimi növbəti addım gözləyir.
 *  - hurry(): istifadəçi bölməyə yaxınlaşıb, artıq gözləmək olmaz — bundan sonra hər wait() növbəti
 *    tapşırıqda həll olur (addımlar yenə ayrı-ayrı tapşırıqlardır, aralarında kadr çəkilə bilir).
 *
 * requestIdleCallback tək başına bəs etmir: scroll zamanı da kadrlar arasında "boş vaxt" olur.
 */
const QUIET_MS = 350;

const requestIdle = (fn: () => void) =>
  typeof window.requestIdleCallback === "function"
    ? window.requestIdleCallback(fn, { timeout: 1000 })
    : window.setTimeout(fn, 50);
const cancelIdle = (id: number) =>
  typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback(id) : window.clearTimeout(id);

export type QuietGate = {
  wait: () => Promise<void>;
  hurry: () => void;
  dispose: () => void;
};

export function createQuietGate(): QuietGate {
  let lastScroll = -Infinity;
  let urgent = false;
  let disposed = false;
  let timer = 0;
  let idleId = 0;
  const waiters: (() => void)[] = [];

  const flush = () => waiters.splice(0).forEach((resolve) => resolve());
  const check = () => {
    timer = 0;
    if (disposed || !waiters.length) return;
    if (urgent) {
      timer = window.setTimeout(() => ((timer = 0), flush()), 0);
      return;
    }
    const since = performance.now() - lastScroll;
    if (since < QUIET_MS) {
      timer = window.setTimeout(check, QUIET_MS - since);
      return;
    }
    idleId = requestIdle(() => {
      idleId = 0;
      // boş vaxt gələnə qədər scroll başlayıbsa, yenidən gözlə
      if (urgent || performance.now() - lastScroll >= QUIET_MS) flush();
      else check();
    });
  };
  const onScroll = () => {
    lastScroll = performance.now();
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    wait: () =>
      new Promise<void>((resolve) => {
        if (disposed) return resolve();
        waiters.push(resolve);
        if (!timer && !idleId) check();
      }),
    hurry: () => {
      if (urgent) return;
      urgent = true;
      if (idleId) cancelIdle(idleId);
      idleId = 0;
      window.clearTimeout(timer);
      check();
    },
    // gözləyənləri buraxır — yarımçıq hazırlıq sona çatıb özünü təmizləsin (Building3D nəticəni dispose edir)
    dispose: () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      if (idleId) cancelIdle(idleId);
      flush();
    },
  };
}
