"""
완성 룩 모델컷 생성 (OpenAI 이미지 편집 API) — 아직 없는 이미지만 만들고, 있는 것은 건너뜁니다.

각 룩(src/lib/styling/looks.data.ts)의 아이템 전부(상의·하의/원피스·아우터·신발·소품)를
룩의 체형에 맞는 기준 모델(scripts/images/ref-<gender>-<bodyType>.jpg)에 입힙니다.

사용법 (프로젝트 루트에서):
  set -a && . ./.env.local && set +a        # OPENAI_API_KEY 로드 (.env.local 은 Git 제외)
  python3 scripts/images/generate-look-cuts.py            # 전체
  python3 scripts/images/generate-look-cuts.py <키 일부>  # 일부만 (시험용)
필요 패키지: Pillow
"""
import base64, json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOOKS = os.path.join(ROOT, "public", "looks")
KEY = os.environ.get("OPENAI_API_KEY") or sys.exit("OPENAI_API_KEY 가 없습니다 (.env.local 을 로드하세요)")

gsrc = open(os.path.join(ROOT, "src/lib/styling/garments.data.ts"), encoding="utf-8").read()
SLOT = {b.split('"')[0]: re.search(r'slot: "([^"]+)"', b).group(1) for b in re.split(r'\n  \{\n    id: "', gsrc)[1:]}
NAME = {b.split('"')[0]: re.search(r'name: "([^"]+)"', b).group(1) for b in re.split(r'\n  \{\n    id: "', gsrc)[1:]}

lsrc = open(os.path.join(ROOT, "src/lib/styling/looks.data.ts"), encoding="utf-8").read()
jobs = {}
for m in re.finditer(r'gender: "(\w+)", bodyType: "(\w+)".*?garmentIds: (\[[^\]]*\]), image: "([^"]+)"', lsrc):
    gender, body, ids, image = m.group(1), m.group(2), json.loads(m.group(3)), m.group(4)
    jobs[image] = (gender, body, ids)

ROLE = {
    "top": "the top", "bottom": "the bottom", "dress": "the dress",
    "outer": "the outer layer worn over the outfit (open front)", "shoes": "the shoes",
}
def role(gid):
    s = SLOT[gid]
    if s == "accessory":
        if gid.startswith("belt"): return "the belt worn at the waist"
        if gid.startswith("bag"): return "the bag held naturally in one hand"
        if gid.startswith("scarf"): return "the scarf draped around the neck"
        return "the accessory"
    return ROLE[s]

ORDER = ["dress", "top", "bottom", "outer", "shoes", "accessory"]
def run(item):
    image, (gender, body, ids) = item
    out = os.path.join(LOOKS, f"{image}.webp")
    if os.path.exists(out):
        return image, "skip"
    ids = sorted(ids, key=lambda g: ORDER.index(SLOT[g]))
    parts = ", ".join(f"{role(g)} from image {i + 2}" for i, g in enumerate(ids))
    prompt = (f"Dress the person from image 1 in exactly every item shown in the other images: {parts}. "
              "Match each item's color, fabric, length, fit and details faithfully and include all of them. "
              "Keep the same person, face, hair, body shape, body proportions and pose. "
              "Full-body editorial lookbook photo with the entire body visible from head to toe, plain seamless light warm-gray studio background (#EFECE6), "
              "soft even studio lighting, natural and modest, no text, no logo.")
    args = ["curl", "-s", "-m", "600", "https://api.openai.com/v1/images/edits", "-H", f"Authorization: Bearer {KEY}",
            "-F", "model=gpt-image-2", "-F", f"image[]=@{ROOT}/scripts/images/ref-{gender}-{body}.jpg"]
    args += sum((["-F", f"image[]=@{ROOT}/public/garments/{g}.jpg"] for g in ids), [])
    args += ["-F", "size=1024x1536", "-F", "quality=medium", "-F", "output_format=jpeg", "-F", "prompt=" + prompt]
    for _ in range(2):
        with tempfile.TemporaryDirectory() as tmp:
            resp = os.path.join(tmp, "r.json")
            subprocess.run(args + ["-o", resp], check=False)
            d = json.load(open(resp)) if os.path.exists(resp) else {}
            if "data" in d:
                raw = os.path.join(tmp, "o.jpg")
                open(raw, "wb").write(base64.b64decode(d["data"][0]["b64_json"]))
                im = Image.open(raw).convert("RGB"); im.thumbnail((600, 900), Image.LANCZOS)
                im.save(out, "WEBP", quality=80, method=6)
                return image, "ok"
            err = d.get("error")
    return image, f"FAIL {str(err)[:120]}"

# 인자로 이미지 키 일부를 주면 해당 룩만 생성 (시험용)
if len(sys.argv) > 1:
    jobs = {k: v for k, v in jobs.items() if any(a in k for a in sys.argv[1:])}

os.makedirs(LOOKS, exist_ok=True)
n = 0
with ThreadPoolExecutor(5) as ex:
    for image, r in ex.map(run, jobs.items()):
        n += 1
        if r != "skip":
            print(n, image, r, flush=True)
done = sum(os.path.exists(os.path.join(LOOKS, f"{k}.webp")) for k in jobs)
print(f"완성 룩 모델컷 {done}/{len(jobs)}")
