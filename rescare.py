"""Re-render images/scare_warden.jpg from the sprite.

The delivered frame was cropped: the eyes sat on row 0 and roughly 44% of the
head was above the top edge, so nothing CSS can do would ever put the face on
screen — the pixels are not in the file. This rebuilds the same picture from
ani_warden.png in the same style as scare_auditor.jpg (flat silhouette over a
near-black ground, film grain over the lot) with the whole head in frame and
about 9% headroom, which is enough to survive both the shake animation and the
vertical crop an ultrawide window forces.

Measured off the originals, so the two jumpscares still match:
    ground   ~7 grey        figure   the sprite's own (10,12,11)
    grain    sigma 3.5      eyes     the sprite's own, ~204
"""
import numpy as np
from PIL import Image

W, H = 1600, 900
SCALE = 3.3           # sprite pixels to canvas pixels
HEAD_TOP = 81         # where the top of the head lands, 9% down
SPRITE_HEAD_TOP = 128  # first row of the sprite with a solid head
SPRITE_CX = 260        # the sprite's centre line

sp = Image.open("images/ani_warden.png").convert("RGBA")
sp = sp.resize((round(sp.width * SCALE), round(sp.height * SCALE)), Image.LANCZOS)

x0 = round(W / 2 - SPRITE_CX * SCALE)
y0 = round(HEAD_TOP - SPRITE_HEAD_TOP * SCALE)

ground = Image.new("RGBA", (W, H), (7, 7, 7, 255))
ground.alpha_composite(sp, (x0, y0))

a = np.asarray(ground.convert("RGB")).astype(np.float64)
rng = np.random.default_rng(11)
a += rng.normal(0, 3.5, a.shape)
out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
out.save("images/scare_warden.jpg", quality=88, subsampling=0)

# report the same numbers the originals were measured with
b = np.asarray(out).astype(float)
print("torso", b[700:800, 700:900].mean((0, 1)).round(2),
      "ground", b[400:500, 20:120].mean((0, 1)).round(2),
      "grain", b[400:500, 20:120].std((0, 1)).round(2))
mask = b[:, :, 1] > 150
ys, xs = np.nonzero(mask)
print("eyes rows", ys.min(), "-", ys.max(), " eye mean", b[:, :, 1][mask].mean().round(1))
