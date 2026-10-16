"""
Videoları scroll üçün kadr paketlərinə çevirir.

Hər klip 24 fps ilə kadrlara bölünür, hər kadr WebP olur və hamısı bir .bin
faylına yığılır (bir sorğu = bütün klip). Brauzer paketi bir dəfə yükləyir,
sonra kadrları sıfır-kopya `Blob.slice` ilə ayırır və `createImageBitmap`
ilə ayrı thread-də decode edir.

Paket formatı (little-endian):
  0   "FSEQ"
  4   uint32  kadr sayı N
  8   uint16  en, uint16 hündürlük
  12  uint32  ofsetlər[N + 1]  (faylın əvvəlindən)
  ... WebP kadrlar ardıcıl

İşlətmək (repo kökündən):  python scripts/pack-frames.py
Tələb: ffmpeg (libwebp ilə) PATH-da.
"""
import glob
import os
import shutil
import struct
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "forma", "videolar")
OUT = os.path.join(ROOT, "public", "forma", "seq")
MANIFEST = os.path.join(ROOT, "src", "components", "forma", "framePacks.ts")

FPS = 24
START = 1.0          # ilk saniyə adətən yavaş başlayır — atılır
COUNT = 144          # 6 saniyə × 24 fps

# açar, mənbə video, en, hündürlük, WebP keyfiyyəti[, başlanğıc, kadr sayı]
SLOTS = [
    ("shop1", "Craftsman_touching_wood_grain_1080p_20261015173532.mp4", 1280, 720, 74),
    ("shop2", "Hand_plane_shaping_oak_board_20261015173553.mp4", 1280, 720, 74),
    ("shop3", "Carpenter_fitting_wooden_joint_1080p_20261015173642.mp4", 1280, 720, 74),
    ("shop4", "Hands_stretching_linen_over_sofa_20261015173646.mp4", 1280, 720, 74),
    ("room", "Camera_moving_through_minimalist…_20261015173650.mp4", 1280, 720, 74),
    ("craft", "Craftsman_carving_wood_with_chisel_20261015173654.mp4", 960, 540, 72),
    ("living", "Camera_moving_along_oak_wardrobe_20261015173659.mp4", 960, 540, 72),
    # footer lenti çox enlidir — yalnız orta zolaq saxlanılır
    ("lathe", "Shaping_walnut_table_leg_20261015173701.mp4", 1280, 360, 72),
    # /magaza səhifəsi: kliplər bir-birinə kadr-kadr bağlanır — tam götürülür
    ("store1", "magaza/V1.mp4", 1280, 720, 70, 0.0, None),
    ("store2", "magaza/V2.mp4", 1280, 720, 70, 0.0, None),
    ("store3", "magaza/V3.mp4", 1280, 720, 70, 0.0, None),
    ("store4", "magaza/V4.mp4", 1280, 720, 70, 0.0, None),
    ("store5", "magaza/V5.mp4", 1280, 720, 70, 0.0, None),
]


def build(slot, work):
    key, name, width, height, quality, start, count = (*slot, START, COUNT)[:7]
    frames_dir = os.path.join(work, key)
    os.makedirs(frames_dir)
    subprocess.run(
        [
            "ffmpeg", "-nostdin", "-loglevel", "error", "-y",
            "-ss", str(start), "-i", os.path.join(SRC, name),
            "-vf", f"fps={FPS},scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}",
            *(["-frames:v", str(count)] if count else []),
            "-c:v", "libwebp", "-quality", str(quality), "-compression_level", "4",
            "-f", "image2", os.path.join(frames_dir, "%03d.webp"),
        ],
        check=True,
    )
    files = sorted(glob.glob(os.path.join(frames_dir, "*.webp")))
    if not files:
        raise RuntimeError(f"{key}: kadr çıxmadı")
    count = count or len(files)
    while len(files) < count:  # klip qısadırsa son kadr təkrarlanır
        files.append(files[-1])
    blobs = []
    for path in files[:count]:
        with open(path, "rb") as handle:
            blobs.append(handle.read())

    offsets = [12 + 4 * (count + 1)]
    for blob in blobs:
        offsets.append(offsets[-1] + len(blob))
    with open(os.path.join(OUT, f"{key}.bin"), "wb") as handle:
        handle.write(b"FSEQ")
        handle.write(struct.pack("<IHH", count, width, height))
        handle.write(struct.pack(f"<{count + 1}I", *offsets))
        for blob in blobs:
            handle.write(blob)
    return key, offsets[-1], width, height, count


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolu üçün
    os.makedirs(OUT, exist_ok=True)
    for stale in glob.glob(os.path.join(OUT, "*")):
        os.remove(stale)
    work = tempfile.mkdtemp(prefix="forma-frames-")
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda slot: build(slot, work), SLOTS))
    finally:
        shutil.rmtree(work, ignore_errors=True)

    lines = [
        "// scripts/pack-frames.py tərəfindən yaradılıb — əl ilə dəyişmə.",
        "export const FRAME_PACKS = {",
    ]
    for key, size, width, height, count in results:
        lines.append(
            f'  {key}: {{ url: "/forma/seq/{key}.bin", bytes: {size}, count: {count}, width: {width}, height: {height} }},'
        )
    lines += ["} as const;", "", "export type FramePackKey = keyof typeof FRAME_PACKS;", ""]
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(lines))

    total = sum(result[1] for result in results)
    for key, size, width, height, count in results:
        print(f"{key:7} {width}x{height}  {count:3} kadr  {size / 1024 / 1024:5.2f} MB")
    print(f"cəmi    {total / 1024 / 1024:5.2f} MB, {sum(result[4] for result in results)} kadr")


if __name__ == "__main__":
    sys.exit(main())
