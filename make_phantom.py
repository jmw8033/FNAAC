"""Draw the third figure and his jumpscare frame.

Built to sit beside the other two rather than beside nothing: same silhouette
treatment (one flat near-black body colour, a soft feathered edge, two pale
eyes), same grain and ground for the scare frame. The difference is the shape —
he is short and wide where they are tall and narrow, so a glimpse of him on a
feed is never mistaken for either of them even at a fraction of a second.

Measured off the originals so the three match:
    body (10,12,11)   eyes (186,204,190)   ground ~7 grey   grain sigma 3.5
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BODY = (10, 12, 11)
EYE = (186, 204, 190)
SS = 3                      # supersample, then down — the others have soft edges

W, H = 900, 620


def rounded(d, box, r, fill):
    d.rounded_rectangle([c * SS for c in box], radius=r * SS, fill=fill)


def ellipse(d, box, fill):
    d.ellipse([c * SS for c in box], fill=fill)


# ---- the mask, drawn big -------------------------------------------------
m = Image.new("L", (W * SS, H * SS), 0)
d = ImageDraw.Draw(m)

rounded(d, (150, 322, 750, 606), 86, 255)      # torso: very wide, low, heavy
rounded(d, (96, 350, 186, 540), 40, 255)       # arms, stubby, held out from it
rounded(d, (714, 350, 804, 540), 40, 255)
rounded(d, (418, 268, 482, 344), 24, 255)      # a neck barely worth the name
ellipse(d, (322, 48, 578, 304), 255)           # and a head too big for it

m = m.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.2))

# the feathered halo the other two carry: the mask again, blurred wide and faint
halo = m.filter(ImageFilter.GaussianBlur(9))
alpha = np.maximum(np.asarray(m).astype(np.float64),
                   np.asarray(halo).astype(np.float64) * 0.55)

# ---- eyes ---------------------------------------------------------------
e = Image.new("L", (W * SS, H * SS), 0)
de = ImageDraw.Draw(e)
ellipse(de, (386, 150, 430, 200), 255)
ellipse(de, (470, 150, 514, 200), 255)
e = e.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
eyes = np.asarray(e).astype(np.float64) / 255.0

rgb = np.zeros((H, W, 3))
for i in range(3):
    rgb[:, :, i] = BODY[i] * (1 - eyes) + EYE[i] * eyes
alpha = np.maximum(alpha, eyes * 255)

sprite = Image.fromarray(
    np.dstack([rgb, np.clip(alpha, 0, 255)]).astype(np.uint8), "RGBA")
sprite.save("images/ani_phantom.png")

# ---- the jumpscare frame ------------------------------------------------
SW, SH = 1600, 900
# Framed the way the other two are: the whole head in shot with about 9% of
# headroom, which is what the shake animation and an ultrawide crop eat into.
scale = 1.62
FIG_TOP, FIG_CX, HEAD_TOP = 22, 450, 81        # measured off the sprite above
sp = sprite.resize((round(W * scale), round(H * scale)), Image.LANCZOS)
ground = Image.new("RGBA", (SW, SH), (7, 7, 7, 255))
ground.alpha_composite(sp, (round(SW / 2 - FIG_CX * scale),
                            round(HEAD_TOP - FIG_TOP * scale)))

a = np.asarray(ground.convert("RGB")).astype(np.float64)
a += np.random.default_rng(7).normal(0, 3.5, a.shape)
Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(
    "images/scare_phantom.jpg", quality=88, subsampling=0)

print("sprite", sprite.size, "aspect %.2f" % (sprite.width / sprite.height))
w = np.asarray(Image.open("images/ani_warden.png"))[:, :, 3] > 10
ys, xs = np.nonzero(w)
print("warden figure  %dx%d  aspect %.2f" %
      (xs.max()-xs.min(), ys.max()-ys.min(), (xs.max()-xs.min())/(ys.max()-ys.min())))
p = np.asarray(sprite)[:, :, 3] > 10
ys, xs = np.nonzero(p)
print("phantom figure %dx%d  aspect %.2f" %
      (xs.max()-xs.min(), ys.max()-ys.min(), (xs.max()-xs.min())/(ys.max()-ys.min())))
