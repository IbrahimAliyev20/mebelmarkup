import type { Metadata } from "next";
import { ShowroomWalk } from "@/components/forma/ShowroomWalk";
// stil HTML ilə birlikdə gəlsin — yükləyici ilk kadrdan görünür
import "@/components/forma/forma.css";

export const metadata: Metadata = { title: "Mağaza — Forma" };

export default function StorePage() {
  return <ShowroomWalk />;
}
