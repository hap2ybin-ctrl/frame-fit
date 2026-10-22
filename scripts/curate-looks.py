"""
완성 룩 큐레이션 → src/lib/styling/looks.data.ts 생성

성별 × 체형(스트레이트·웨이브·내추럴·유형 없음) × 상황마다 PER_CELL개의 룩을 고릅니다.
- 점수: 체형 어울림(affinity) + 취향(taste) 공통점 + 핏 균형
- 다양성: 같은 칸 안에서는 상의·하의·원피스·신발을 되도록 겹치지 않게,
  전체적으로는 아이템 사용 횟수에 비례한 감점 + 성별 룩 수의 CAP 비율을 넘으면 큰 감점
- 모든 칸을 한 개씩 번갈아 고르기 때문에(라운드 로빈) 앞쪽 칸이 인기 아이템을 독점하지 않습니다.
결과는 결정적입니다(같은 입력 → 같은 출력). 이미지 키가 같으면 기존 모델컷을 재사용합니다.

사용법: python3 scripts/curate-looks.py
"""
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PER_CELL = 8
CAP = 0.15
GENDERS = ["women", "men"]
BODIES = ["straight", "wave", "natural", "neutral"]
OCCASIONS = ["casual", "business", "date", "formal", "travel"]
ORDER = ["dress", "top", "bottom", "outer", "shoes", "accessory"]


def parse():
    src = "".join(open(os.path.join(ROOT, "src/lib/styling", f), encoding="utf-8").read() for f in ("garments.data.ts", "garments.extra.data.ts"))
    out = {}
    for b in re.split(r'\n  \{\n    id: "', src)[1:]:
        gid = b.split('"')[0]
        arr = lambda k: re.findall(r'"([^"]+)"', re.search(k + r": \[([^\]]*)\]", b).group(1))
        aff = re.search(r"affinity: \{ straight: ([\d.]+), wave: ([\d.]+), natural: ([\d.]+) \}", b)
        fit = re.search(r'fitClass: "(\w+)"', b)
        out[gid] = {
            "id": gid,
            "slot": re.search(r'slot: "(\w+)"', b).group(1),
            "lines": arr("lines"),
            "occasions": arr("occasions"),
            "tastes": arr("tastes"),
            "aff": dict(zip(["straight", "wave", "natural"], map(float, aff.groups()))),
            "fit": fit.group(1) if fit else None,
        }
    return out


G = parse()
usage = {g: {} for g in GENDERS}
looks_per_gender = len(BODIES) * len(OCCASIONS) * PER_CELL
cap = looks_per_gender * CAP


def aff(x, body):
    return sum(x["aff"].values()) / 3 if body == "neutral" else x["aff"][body]


def penalty(gender, gid, cell_used, repeat_cost):
    u = usage[gender].get(gid, 0)
    p = 0.12 * u + (4.0 if u >= cap else 0.0)
    return p + repeat_cost * cell_used.get(gid, 0)


def tastes_of(items):
    s = set()
    for x in items:
        s |= set(x["tastes"])
    return s


def pick_extra(pool, body, gender, core_items, cell_used, repeat_cost):
    core_t = tastes_of(core_items)
    best = None
    for x in pool:
        s = aff(x, body) + 0.35 * len(core_t & set(x["tastes"])) - penalty(gender, x["id"], cell_used, repeat_cost)
        if best is None or s > best[0] or (s == best[0] and x["id"] < best[1]["id"]):
            best = (s, x)
    return best[1] if best else None


def cores_for(gender, occ):
    pool = [x for x in G.values() if gender in x["lines"] and occ in x["occasions"]]
    by = lambda s: sorted((x for x in pool if x["slot"] == s), key=lambda x: x["id"])
    cores = [(t, b) for t in by("top") for b in by("bottom")] + [(d,) for d in by("dress")]
    return cores, by("outer"), by("shoes"), by("accessory")


def pick_look(gender, body, occ, idx, cell):
    cores, outers, shoes, accs = cores_for(gender, occ)
    used_main = cell["main"]
    best = None
    for c in cores:
        key = "+".join(x["id"] for x in c)
        if key in cell["cores"]:
            continue
        s = sum(aff(x, body) for x in c) / len(c) * 2
        if len(c) == 2:
            common = set(c[0]["tastes"]) & set(c[1]["tastes"])
            s += 0.4 * min(len(common), 2) - (0.6 if not common else 0)
            fits = {c[0]["fit"], c[1]["fit"]}
            if fits == {"over"}:
                s -= 0.6
            elif fits == {"slim", "over"}:
                s += 0.2
        s -= sum(penalty(gender, x["id"], used_main, 3.0) for x in c)
        if best is None or s > best[0] or (s == best[0] and key < best[1]):
            best = (s, key, c)
    if not best:
        return None
    _, key, core = best
    items = list(core)
    if occ in ("business", "formal") or idx % 2 == 0:
        o = pick_extra(outers, body, gender, items, cell["outer"], 1.5)
        if o:
            items.append(o)
    sh = pick_extra(shoes, body, gender, items, cell["shoes"], 2.0)
    if sh:
        items.append(sh)
    if idx % 3 != 2:
        a = pick_extra(accs, body, gender, items, cell["acc"], 1.5)
        if a:
            items.append(a)
    for x in items:
        usage[gender][x["id"]] = usage[gender].get(x["id"], 0) + 1
        bucket = {"outer": "outer", "shoes": "shoes", "accessory": "acc"}.get(x["slot"], "main")
        cell[bucket][x["id"]] = cell[bucket].get(x["id"], 0) + 1
    cell["cores"].add(key)
    ids = sorted((x["id"] for x in items), key=lambda g: (ORDER.index(G[g]["slot"]), g))
    image = f"{gender}-{body}-" + hashlib.md5(",".join(sorted(ids)).encode()).hexdigest()[:8]
    return {"gender": gender, "bodyType": body, "occasion": occ, "coreKey": key, "garmentIds": ids, "image": image}


cells = {(g, b, o): {"main": {}, "outer": {}, "shoes": {}, "acc": {}, "cores": set(), "looks": []} for g in GENDERS for b in BODIES for o in OCCASIONS}
for idx in range(PER_CELL):
    for (g, b, o), cell in cells.items():
        lk = pick_look(g, b, o, idx, cell)
        if lk:
            cell["looks"].append(lk)

rows = []
for (g, b, o), cell in cells.items():
    for n, lk in enumerate(cell["looks"], 1):
        ids = ", ".join(f'"{i}"' for i in lk["garmentIds"])
        rows.append(f'  {{ id: "{g}-{b}-{o}-{n}", gender: "{g}", bodyType: "{b}", occasion: "{o}", coreKey: "{lk["coreKey"]}", garmentIds: [{ids}], image: "{lk["image"]}" }},')

HEADER = f'''import type {{ BodyType }} from "../classifier/types";
import type {{ Occasion }} from "./types";

/**
 * 완성 룩 큐레이션 — 성별 × 체형(스트레이트·웨이브·내추럴·유형 없음) × 상황마다 {PER_CELL}개.
 * scripts/curate-looks.py 로 생성합니다 (직접 수정하지 마세요).
 * 체형 어울림·취향 일관성으로 고르되, 같은 칸 안에서는 상의·하의·신발이 겹치지 않게 하고
 * 한 아이템이 같은 성별 룩의 약 {int(CAP * 100)}%를 넘지 않도록 사용 횟수를 제한했습니다.
 * 각 룩의 아이템 전부(아우터·신발·소품 포함)를 해당 체형 AI 모델이 입은 모델컷이 public/looks/<image>.webp 에 있습니다.
 * 같은 성별·체형에서 아이템 구성이 같은 룩은 이미지를 공유합니다.
 */
export interface CuratedLook {{
  id: string;
  gender: "women" | "men";
  bodyType: BodyType | "neutral";
  occasion: Occasion;
  coreKey: string;
  garmentIds: string[];
  image: string;
}}

export const CURATED_LOOKS: CuratedLook[] = [
'''
open(os.path.join(ROOT, "src/lib/styling/looks.data.ts"), "w", encoding="utf-8").write(HEADER + "\n".join(rows) + "\n];\n")

# 요약
total = len(rows)
images = {lk["image"] for c in cells.values() for lk in c["looks"]}
existing = {f[:-5] for f in os.listdir(os.path.join(ROOT, "public/looks")) if f.endswith(".webp")}
print(f"looks={total} images={len(images)} reuse={len(images & existing)} new={len(images - existing)}")
for g in GENDERS:
    top = sorted(usage[g].items(), key=lambda kv: -kv[1])[:8]
    unused = sorted(x["id"] for x in G.values() if g in x["lines"] and x["id"] not in usage[g])
    print(g, "top:", top, "| unused:", unused)
short = [(k, len(c["looks"])) for k, c in cells.items() if len(c["looks"]) < PER_CELL]
print("short cells:", short)
worst = sorted(((max(c[k].values(), default=0), k, key) for key, c in cells.items() for k in ("main", "outer", "shoes")), reverse=True)[:6]
print("max repeats in a cell:", worst)
