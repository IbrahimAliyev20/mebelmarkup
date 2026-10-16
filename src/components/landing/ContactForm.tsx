"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { device, gsap, useGSAP } from "./gsap";

const schema = z.object({
  name: z.string().trim().min(2, "Adınızı yazın"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?994|0)?\s?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, "Nömrəni düz yazın, məs. 050 123 45 67"),
  rooms: z.enum(["1", "2", "3"]),
});

type FormValues = z.infer<typeof schema>;

const inputBase = "w-full border-b bg-transparent py-4 text-lg outline-none transition-colors";

/** Düymə siçanı bir az "dartır" — yalnız siçanı olan cihazlarda. */
function useMagnet() {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (!device.hover()) return;
    const el = ref.current!;
    const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "out" });
    const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "out" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.35);
      y((e.clientY - (r.top + r.height / 2)) * 0.35);
    };
    const leave = () => {
      x(0);
      y(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });
  return ref;
}

export function ContactForm({ dark = false }: { dark?: boolean }) {
  const magnet = useMagnet();
  const inputCls = `${inputBase} ${
    dark
      ? "border-white/25 text-white placeholder:text-white/40 focus:border-white"
      : "border-navy/25 placeholder:text-navy/35 focus:border-brand"
  }`;
  const errCls = `mt-2 text-sm ${dark ? "text-white/80" : "text-brand"}`;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rooms: "2" } });

  // Backend hələ yoxdur — burada öz API-nizə göndərin.
  const onSubmit = async (values: FormValues) => {
    await new Promise((r) => setTimeout(r, 600));
    console.info("lead", values);
    toast.success("Təşəkkürlər! Tezliklə sizə zəng edəcəyik.");
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <input {...register("name")} placeholder="Adınız" className={inputCls} autoComplete="name" />
        {errors.name && <p className={errCls}>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register("phone")} type="tel" placeholder="Telefon" className={inputCls} autoComplete="tel" />
        {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
      </div>
      <div className="flex flex-wrap gap-2 pt-2 sm:gap-3">
        {(["1", "2", "3"] as const).map((r) => (
          <label key={r} className="cursor-pointer">
            <input {...register("rooms")} type="radio" value={r} className="peer sr-only" />
            <span
              className={`press block rounded-full border px-5 py-2 text-sm transition-[color,background-color,border-color,transform] duration-200 ${
                dark
                  ? "border-white/30 peer-checked:border-white peer-checked:bg-white peer-checked:text-navy"
                  : "border-navy/25 peer-checked:border-navy peer-checked:bg-navy peer-checked:text-paper"
              }`}
            >
              <span className="whitespace-nowrap">{r} otaqlı</span>
            </span>
          </label>
        ))}
      </div>
      <span ref={magnet} className="mt-4 inline-block p-3 -m-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`press group inline-flex items-center gap-3 rounded-full px-8 py-4 font-medium disabled:opacity-60 ${
            dark ? "bg-white text-navy" : "bg-brand text-white"
          }`}
        >
          {isSubmitting ? "Göndərilir…" : "Zəng sifariş et"}
          <ArrowRight className="h-5 w-5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
        </button>
      </span>
    </form>
  );
}
