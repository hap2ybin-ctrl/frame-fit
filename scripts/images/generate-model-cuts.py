"""
코디 모델컷 생성 (OpenAI 이미지 편집 API) — 빠진 조합만 만들고 이미 있는 것은 건너뜁니다.

사용법 (프로젝트 루트에서):
  set -a && . ./.env.local && set +a        # OPENAI_API_KEY 로드 (.env.local 은 Git 제외)
  python3 scripts/images/generate-model-cuts.py
  # 완료 후 public/looks/*.webp 와 src/lib/styling/modelCuts.data.ts 가 갱신됩니다.

참조 이미지: scripts/images/ref-{women,men}.jpg (기준 AI 모델), public/garments/<id>.jpg (의류)
필요 패키지: Pillow
"""
import base64, json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOOKS = os.path.join(ROOT, "public", "looks")
KEY = os.environ.get("OPENAI_API_KEY") or sys.exit("OPENAI_API_KEY 가 없습니다 (.env.local 을 로드하세요)")

src = open(os.path.join(ROOT, "src/lib/styling/garments.data.ts"), encoding="utf-8").read()
items = []
for b in re.split(r'\n  \{\n    id: "', src)[1:]:
    gid = b.split('"')[0]
    slot = re.search(r'slot: "([^"]+)"', b).group(1)
    lines = re.findall(r'"(women|men|unisex)"', re.search(r"lines: \[([^\]]*)\]", b).group(1))
    items.append((gid, slot, lines))

combos = []
for gender in ("women", "men"):
    tops = [g for g, s, l in items if s == "top" and gender in l]
    bottoms = [g for g, s, l in items if s == "bottom" and gender in l]
    combos += [(gender, f"{t}+{b}", [t, b]) for t in tops for b in bottoms]
    if gender == "women":
        combos += [(gender, d, [d]) for d, s, l in items if s == "dress" and gender in l]

PROMPT = ("Dress the person from image 1 in exactly the garments shown in the other images{parts}, matching their color, fabric, length, fit and details faithfully. "
          "Keep the same person, face, hair, body proportions and pose. Add simple shoes that suit the outfit. Full-body editorial lookbook photo with the entire body visible "
          "from head to toe, plain seamless light warm-gray studio background (#EFECE6), soft even studio lighting, natural and modest, no text, no logo.")

def run(c):
    gender, key, ids = c
    out = os.path.join(LOOKS, f"{gender}__{key}.webp")
    if os.path.exists(out):
        return key, "skip"
    parts = ": the top from image 2 and the bottom from image 3" if len(ids) == 2 else ": the dress from image 2"
    args = ["curl", "-s", "-m", "500", "https://api.openai.com/v1/images/edits", "-H", f"Authorization: Bearer {KEY}",
            "-F", "model=gpt-image-2", "-F", f"image[]=@{ROOT}/scripts/images/ref-{gender}.jpg"]
    args += sum((["-F", f"image[]=@{ROOT}/public/garments/{i}.jpg"] for i in ids), [])
    args += ["-F", "size=1024x1536", "-F", "quality=medium", "-F", "output_format=jpeg", "-F", "prompt=" + PROMPT.format(parts=parts)]
    with tempfile.TemporaryDirectory() as tmp:
        resp = os.path.join(tmp, "r.json")
        subprocess.run(args + ["-o", resp], check=False)
        d = json.load(open(resp)) if os.path.exists(resp) else {}
        if "data" not in d:
            return key, f"FAIL {str(d.get('error'))[:120]}"
        raw = os.path.join(tmp, "o.jpg")
        open(raw, "wb").write(base64.b64decode(d["data"][0]["b64_json"]))
        im = Image.open(raw).convert("RGB"); im.thumbnail((600, 900), Image.LANCZOS)
        im.save(out, "WEBP", quality=80, method=6)
    return key, "ok"

os.makedirs(LOOKS, exist_ok=True)
with ThreadPoolExecutor(5) as ex:
    for k, r in ex.map(run, combos):
        if r != "skip":
            print(k, r, flush=True)

keys = sorted(f[:-5] for f in os.listdir(LOOKS) if f.endswith(".webp"))
with open(os.path.join(ROOT, "src/lib/styling/modelCuts.data.ts"), "w", encoding="utf-8") as f:
    f.write("/** 생성된 모델컷 목록 (scripts/images/generate-model-cuts.py 로 자동 생성) — public/looks/<gender>__<coreKey>.webp */\n")
    f.write("export const MODEL_CUT_KEYS: string[] = [\n" + "\n".join(f'  "{k}",' for k in keys) + "\n];\n")
print(f"모델컷 {len(keys)}/{len(combos)}")
