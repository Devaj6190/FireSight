"""Check that every evidence URL in web/public/buildings/sf-*.json opens."""
import glob, json, ssl, sys, urllib.request, urllib.error
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import certifi

ROOT = Path(__file__).resolve().parent.parent
CTX = ssl.create_default_context(cafile=certifi.where())


def check(url):
    req = urllib.request.Request(url, headers={"User-Agent": "firesight-hack/0.2"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            code = r.status
            body = r.read()
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"
    except Exception as e:
        return f"ERROR {type(e).__name__}: {e}"[:120]
    if code != 200:
        return f"HTTP {code}"
    if not body.strip():
        return "EMPTY"
    try:
        j = json.loads(body)
    except ValueError:
        return "OK"
    if j == [] or j == {}:
        return "EMPTY"
    if isinstance(j, dict) and "error" in j:
        return "EMPTY (error body)"
    return "OK"


def main():
    rows = []
    for f in sorted(glob.glob(str(ROOT / "web/public/buildings/sf-*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        for p in d.get("pins", []):
            for e in p.get("evidence", []):
                if e.get("url"):
                    rows.append((d["id"], p["id"], e.get("datasetId"), e.get("recordId"), e["url"]))
    urls = sorted({r[4] for r in rows})
    with ThreadPoolExecutor(12) as ex:
        res = dict(zip(urls, ex.map(check, urls)))
    summ = defaultdict(lambda: [0, 0])
    fails = []
    print(f"{'building':<12} {'pin':<32} {'dataset':<12} {'status':<10} url")
    for b, pid, ds, rid, u in rows:
        s = res[u]
        ok = s == "OK"
        summ[ds][0 if ok else 1] += 1
        print(f"{b:<12} {pid:<32} {str(ds):<12} {s.split(':')[0]:<10} {u}")
        if not ok:
            fails.append(dict(building=b, pin=pid, datasetId=ds, recordId=rid, status=s, url=u))
    print("\nSummary (evidence rows):")
    for ds, (o, f) in sorted(summ.items(), key=lambda x: str(x[0])):
        print(f"  {ds}: OK={o} failing={f}")
    out = ROOT / "data/evidence_check.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(fails, indent=2), encoding="utf-8")
    print(f"\n{len(fails)} failures written to {out}")


main()
