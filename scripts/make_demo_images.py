"""Génère des images de démonstration élégantes pour tester le portfolio."""
from pathlib import Path
from PIL import Image, ImageDraw

OUTPUT = Path(__file__).resolve().parent.parent / "public" / "demo"
OUTPUT.mkdir(parents=True, exist_ok=True)

W, H = 800, 600


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(name, c1, c2, c3):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        row = lerp(c1, c2, t)
        d.line([(0, y), (W, y)], fill=row)
    # halo radial approximatif
    for r in range(300, 0, -6):
        alpha = int(70 * (1 - r / 300))
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        cx, cy = W // 2, int(H * 0.42)
        od.ellipse([cx - r, cy - int(r * 0.75), cx + r, cy + int(r * 0.75)],
                   fill=c3 + (alpha,))
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    img.save(OUTPUT / f"{name}.png", quality=90)
    print(f"OK {name}.png")


gradient("demo-1", (196, 108, 68), (94, 58, 46), (244, 208, 160))   # terracotta
gradient("demo-2", (72, 92, 76), (34, 44, 38), (198, 214, 178))     # sauge
gradient("demo-3", (208, 168, 92), (120, 88, 52), (250, 236, 200))  # ocre
gradient("demo-4", (90, 82, 110), (44, 40, 58), (214, 202, 230))    # prune
print("Terminé")
