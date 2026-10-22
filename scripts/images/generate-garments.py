"""
의류 상품컷 생성 + 누끼 (OpenAI gpt-image-2 / gpt-image-1.5)

- public/garments/<id>.jpg 가 없는 아이템만 생성합니다 (재실행해도 이어서 진행).
- 누끼: 배경이 균일하므로 테두리에서 시작하는 flood-fill로 배경을 지우고,
  밝은 색(배경과 구분이 어려운) 아이템은 gpt-image-1.5 편집(투명 배경)으로 처리합니다.
- 결과: public/garments/<id>.jpg (640×640), public/garments/cutout/<id>.webp

사용법:  set -a && . ./.env.local && set +a && python3 scripts/images/generate-garments.py [id ...]
"""
import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "garments")
CUT = os.path.join(OUT, "cutout")
KEY = os.environ["OPENAI_API_KEY"]

STYLE = (
    "e-commerce product photo, front view, centered with generous margin, isolated on a plain seamless light warm-gray background (#F6F6F4), "
    "soft even studio lighting, subtle natural shadow, no person, no model, no hanger, no mannequin visible, no text, no logo, no brand label, minimal premium fashion catalog style"
)
FLAT = "laid flat in ghost mannequin style, "
SIDE = "shown at a three-quarter side angle, "

P = {
    # 상의
    "tee-stripe": "A single boat-neck long-sleeve breton striped T-shirt, white with evenly spaced navy horizontal stripes, sturdy cotton jersey, regular fit, " + FLAT,
    "sweatshirt": "A single plain crew-neck sweatshirt in melange heather gray (#B9BABC), brushed cotton fleece, relaxed fit, ribbed cuffs and hem, no print, " + FLAT,
    "shirt-denim": "A single light indigo washed denim button-up shirt (#7E9CC0), point collar, two chest pockets, regular fit, long sleeves, " + FLAT,
    "shirt-stripe": "A single cotton poplin dress shirt with fine pale blue and white vertical pinstripes (#C9D8EC), regular collar, regular fit, long sleeves, " + FLAT,
    "knit-gray": "A single fine-gauge round-neck wool sweater in melange mid gray (#9A9C9F), smooth knit, regular fit, ribbed cuffs and hem, " + FLAT,
    "henley": "A single long-sleeve henley shirt with a three-button placket in oatmeal beige (#D9CDB8), waffle-knit cotton texture, regular fit, " + FLAT,
    "blouse-satin": "A single champagne beige satin blouse (#E8D9C0) with a soft stand collar, subtle sheen, gently flowing drape, long sleeves, " + FLAT,
    "blouse-puff": "A single off-white cotton poplin blouse (#FBFAF6) with voluminous puff sleeves, round neck, compact waist-length body, " + FLAT,
    "hoodie": "A single plain pullover hoodie in charcoal gray (#4A4C50), cotton sweat fabric, kangaroo pocket, relaxed fit, no print, no drawstring logo, " + FLAT,
    "turtleneck-ivory": "A single regular-fit turtleneck sweater in soft ivory cream (#EFE8DA), smooth soft wool knit, long sleeves, " + FLAT,
    "tee-long": "A single plain white long-sleeve crew-neck T-shirt, sturdy mid-weight cotton jersey, regular fit, no print, " + FLAT,
    "knit-sleeveless": "A single black sleeveless rib-knit top (#24252A), round neck, slim fit, waist length, " + FLAT,
    # 하의
    "slacks-beige": "A pair of tailored straight-leg trousers in warm beige (#CDBFA6) wool blend, front center crease, full length, " + FLAT,
    "jeans-wide": "A pair of high-rise wide-leg jeans in light blue wash denim (#9DB6D3), long floor-grazing legs, " + FLAT,
    "jeans-black": "A pair of slim-fit black stretch denim jeans (#2A2B2F), mid rise, narrow legs, " + FLAT,
    "cargo-pants": "A pair of relaxed olive green (#6E7556) cotton twill cargo pants with side flap pockets on the thighs, " + FLAT,
    "shorts-bermuda": "A pair of beige cotton twill bermuda shorts (#D2C4A6), mid rise, straight legs ending above the knee, " + FLAT,
    "skirt-denim": "A high-waisted straight midi denim skirt in medium blue wash (#5F7FA8), front button fly, " + FLAT,
    "skirt-mini": "A high-waisted A-line mini skirt in charcoal (#3D3E43) wool blend, above-knee length, " + FLAT,
    "skirt-slip": "A bias-cut midi slip skirt in champagne satin (#DCC9A8) with a soft sheen and elastic waistband, " + FLAT,
    "jogger": "A pair of charcoal gray (#4B4D52) cotton sweat jogger pants with elastic waistband and cuffed ankles, no print, " + FLAT,
    "pants-linen": "A pair of wide-leg ivory linen easy pants (#EDE5D3) with elastic drawstring waist, ankle length, natural linen texture, " + FLAT,
    # 원피스
    "dress-knit": "A fine-gauge knit midi dress in warm oatmeal beige (#CDBBA0), round neck, long sleeves, body-skimming straight silhouette, " + FLAT,
    "dress-sleeveless": "A black sleeveless crepe dress (#1E1F23) with round neck, straight column silhouette, below-knee length, " + FLAT,
    "dress-slip": "A navy satin slip dress (#2F3A55) with thin straps, V neckline, bias cut, midi length, soft sheen, " + FLAT,
    # 아우터
    "jacket-denim": "A classic medium blue denim trucker jacket (#6E8DB5), point collar, chest flap pockets, button front, waist length, " + FLAT,
    "jacket-leather": "A black smooth leather biker rider jacket (#1B1C1F), asymmetric silver zip, notch lapels, waist length, slim fit, " + FLAT,
    "padding-short": "A short matte black nylon puffer down jacket (#2C2D31), stand collar, horizontal quilting, hip length, zip front, " + FLAT,
    "coat-black": "A single-breasted black wool coat (#25262A), notch lapels, knee length, straight clean silhouette, " + FLAT,
    "cardigan-long": "A long open-front knit cardigan in light oatmeal beige (#CFC2AA), mid-gauge wool knit, mid-thigh length, long sleeves, " + FLAT,
    "jacket-suede": "A brown suede jacket (#8A6648) with a point collar and button front, hip length, soft nap texture, " + FLAT,
    "jacket-shirt": "An oversized brown-toned plaid wool flannel shirt jacket (#7A5E4A), point collar, two chest flap pockets, hip-covering length, " + FLAT,
    "blazer-beige": "A single-breasted tailored blazer in light beige (#C9B597) linen-wool blend, notch lapels, two buttons, flap pockets, hip length, " + FLAT,
    "coat-wrap": "A belted wrap coat in light oatmeal (#D8CBB4) wool blend, shawl lapels, self-tie waist belt, below-knee length, " + FLAT,
    # 신발
    "mules": "A pair of black smooth leather backless flat mules (#1D1D20) with a squared toe, " + SIDE,
    "flats": "A pair of beige leather ballet flats (#D6C3A8) with a round toe and a tiny bow, " + SIDE,
    "chelsea": "A pair of brown suede chelsea boots (#6E4E36) with elastic side panels and low heel, " + SIDE,
    "sandals": "A pair of tan leather flat strappy sandals (#B98A5E) with thin crossing straps and ankle strap, " + SIDE,
    "sneaker-retro": "A pair of retro running sneakers in gray suede and mesh (#A9ABAE) with off-white soles, no visible branding, no logo, " + SIDE,
    "loafer-black": "A pair of black polished leather penny loafers (#151517), classic moccasin construction, " + SIDE,
    "slingback": "A pair of ivory leather slingback pumps (#EDE3D2) with pointed toe and low kitten heel, " + SIDE,
    # 소품
    "bag-tote": "A natural cream canvas tote bag (#E2D6BE) with tan leather handles, plain with no print, ",
    "bag-cross": "A small tan leather crossbody bag (#A87A52) with a thin adjustable strap and flap closure, ",
    "cap": "A plain navy cotton baseball cap (#2E3A55) with curved brim, no logo, no embroidery, shown at a three-quarter angle, ",
    "bag-shoulder": "A black smooth leather shoulder bag (#1F2023) with a short shoulder strap, structured clean minimal shape, ",
    "scarf-silk": "A small navy silk square scarf (#33415E) with a subtle fine pattern, neatly folded, soft sheen, ",
    "belt-wide": "A wide black leather belt (#1A1A1D) with a simple matte gold rectangular buckle, loosely coiled, ",
}

# 배경(#F6F6F4)과 비슷하게 밝아 flood-fill이 옷까지 지울 수 있는 아이템 → API 누끼
LIGHT = {"tee-stripe", "tee-long", "blouse-puff", "turtleneck-ivory", "pants-linen", "slingback", "bag-tote", "blouse-satin", "cardigan-long", "coat-wrap", "bag-shoulder"}


def post_json(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=300))


def post_multipart(url, fields, files):
    boundary = uuid.uuid4().hex
    body = io.BytesIO()
    for k, v in fields.items():
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for k, (name, data, ctype) in files:
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\nContent-Type: {ctype}\r\n\r\n'.encode())
        body.write(data + b"\r\n")
    body.write(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request(url, data=body.getvalue(), headers={"Authorization": "Bearer " + KEY, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    return json.load(urllib.request.urlopen(req, timeout=300))


def flood_cut(im, tol=14):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    border = [px[x, 0] for x in range(0, w, 8)] + [px[x, h - 1] for x in range(0, w, 8)] + [px[0, y] for y in range(0, h, 8)] + [px[w - 1, y] for y in range(0, h, 8)]
    bg = tuple(sorted(c[k] for c in border)[len(border) // 2] for k in range(3))
    mask = Image.new("L", (w, h), 255)
    m = mask.load()
    seen = bytearray(w * h)
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        c = px[x, y]
        if max(abs(c[k] - bg[k]) for k in range(3)) > tol:
            continue
        m[x, y] = 0
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def api_cut(jpg_bytes):
    d = post_multipart(
        "https://api.openai.com/v1/images/edits",
        {"model": "gpt-image-1.5", "prompt": "Remove the background completely and keep the product exactly as it is, unchanged, on a transparent background.", "background": "transparent", "output_format": "png", "size": "1024x1024", "quality": "medium"},
        [("image[]", ("item.jpg", jpg_bytes, "image/jpeg"))],
    )
    return Image.open(io.BytesIO(base64.b64decode(d["data"][0]["b64_json"]))).convert("RGBA")


def save_cutout(gid, rgba):
    a = rgba.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    box = a.getbbox()
    if box:
        pad = 8
        rgba = rgba.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(rgba.width, box[2] + pad), min(rgba.height, box[3] + pad)))
    rgba.thumbnail((560, 560), Image.LANCZOS)
    rgba.save(os.path.join(CUT, f"{gid}.webp"), "WEBP", quality=88, method=6)


def run(gid):
    jpg = os.path.join(OUT, f"{gid}.jpg")
    try:
        if not os.path.exists(jpg):
            d = post_json("https://api.openai.com/v1/images/generations", {"model": "gpt-image-2", "prompt": P[gid] + STYLE, "size": "1024x1024", "quality": "medium", "output_format": "jpeg", "n": 1})
            im = Image.open(io.BytesIO(base64.b64decode(d["data"][0]["b64_json"]))).convert("RGB")
            im.resize((640, 640), Image.LANCZOS).save(jpg, "JPEG", quality=86)
            raw = io.BytesIO()
            im.save(raw, "JPEG", quality=92)
            src_bytes, src = raw.getvalue(), im
        else:
            src = Image.open(jpg).convert("RGB")
            raw = io.BytesIO()
            src.save(raw, "JPEG", quality=92)
            src_bytes = raw.getvalue()
        if not os.path.exists(os.path.join(CUT, f"{gid}.webp")):
            save_cutout(gid, api_cut(src_bytes) if gid in LIGHT else flood_cut(src))
        return gid, "ok"
    except urllib.error.HTTPError as e:
        return gid, f"HTTP {e.code} {e.read()[:300]!r}"
    except Exception as e:  # noqa: BLE001
        return gid, f"ERR {e}"


if __name__ == "__main__":
    os.makedirs(CUT, exist_ok=True)
    ids = sys.argv[1:] or list(P)
    with ThreadPoolExecutor(4) as ex:
        for r in ex.map(run, ids):
            print(*r, flush=True)
