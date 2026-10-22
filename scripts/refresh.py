"""Refresh every cached building from data.sf.gov (reuses fetch_sources.py + build_fixture.py).

Usage:
  python -I scripts/refresh.py --once                  # default: all web/public/buildings/sf-*.json
  python -I scripts/refresh.py --building sf-0874003   # one building
  python -I scripts/refresh.py --loop 1800             # local backup loop

Per building: fetch ~88 sources, rebuild the JSON, diff pins against the previous file,
write meta.refreshedAt / refreshIntervalMin / sourcesQueried / sourcesWithRecords / sourcesFailed /
changesSinceLast, and append an entry to web/public/refresh/log.json (newest 96 per building).
If nothing changed besides timestamps, the building file is left byte-identical (only the log moves).
A source that fails keeps its last good layer entry and pins, marked fetch_failed.
Each source is as fresh as the city publishes it; this job only re-pulls them every 30 minutes.
"""
import argparse
import concurrent.futures as cf
import glob
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
BDIR = os.path.join(ROOT, "web", "public", "buildings")
LOG = os.path.join(ROOT, "web", "public", "refresh", "log.json")
RAW = os.path.join(ROOT, "data", "raw")
KEEP = 96
INTERVAL_MIN = 30

# street number + street name for fetch_sources.py (data/raw is gitignored, so CI needs this).
REGISTRY = {
    "sf-3722080": ("140", "NEW MONTGOMERY"),
    "sf-0874003": ("400", "DUBOCE"),
    "sf-3703081": ("1018", "MISSION"),
    "sf-1244030": ("1433", "HAIGHT"),
}
SUFFIXES = {"AVE", "AV", "ST", "STREET", "BLVD", "RD", "DR", "WAY", "PL", "CT", "LN"}
AMBIENT = {"wind", "air"}  # hourly model readings, not records: never count as changes
VOLATILE_TOP = {"fetchedAt"}
VOLATILE_META = {"fetchWallMs", "refreshedAt", "refreshIntervalMin", "sourcesFailed", "changesSinceLast"}


def run(args, timeout=420):
    p = subprocess.run([sys.executable, "-I"] + args, cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout, env={**os.environ, "PYTHONUTF8": "1"})
    return p.returncode, p.stdout + p.stderr


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def address_args(bid, old):
    if bid in REGISTRY:
        return REGISTRY[bid]
    parts = (old.get("address") or "").upper().split()
    if len(parts) >= 2 and parts[0].isdigit():
        return parts[0], " ".join(w for w in parts[1:] if w not in SUFFIXES)
    raise RuntimeError(f"{bid}: no address known, add it to REGISTRY")


def manifest(bid):
    return read_json(os.path.join(RAW, bid, "manifest.json"), {"sources": {}})


def fetch(bid, num, street):
    rc, out = run(["scripts/fetch_sources.py", num] + street.split())
    if rc == 0 and any(s.get("http") == 429 for s in manifest(bid)["sources"].values()):
        time.sleep(20)  # rate limited: back off and retry once
        rc, out = run(["scripts/fetch_sources.py", num] + street.split())
    return rc, out


def pin_sig(p):
    return {"label": p.get("label"), "detail": p.get("detail"), "claim": p.get("claim")}


def diff_pins(old, new):
    o = {p["id"]: p for p in old.get("pins", []) if p.get("layer") not in AMBIENT}
    n = {p["id"]: p for p in new.get("pins", []) if p.get("layer") not in AMBIENT}
    return ([i for i in n if i not in o], [i for i in o if i not in n],
            [i for i in n if i in o and pin_sig(n[i]) != pin_sig(o[i])])


def keep_last_good(old, new):
    """A layer that failed to fetch keeps its last good entry (asOf, records) and pins, marked fetch_failed."""
    old_layers = {l["layer"]: l for l in old.get("layers", [])}
    failed_ds = set()
    for i, l in enumerate(new.get("layers", [])):
        prev = old_layers.get(l["layer"])
        if l["status"] == "fetch_failed" and prev:
            new["layers"][i] = {**prev, "status": "fetch_failed", "ms": l["ms"]}
            failed_ds.update({l["datasetId"], l["layer"]})  # evidence may cite the layer key (e.g. osm)
    have = {p["id"] for p in new["pins"]}
    for p in old.get("pins", []):
        ds = {e.get("datasetId") for e in p.get("evidence", [])}
        if p["id"] not in have and ds and ds <= failed_ds:
            new["pins"].append(p)


def material(b):
    """Building JSON minus fields that change on every run."""
    c = {k: v for k, v in b.items() if k not in VOLATILE_TOP}
    c["pins"] = sorted((p for p in b.get("pins", []) if p.get("layer") not in AMBIENT), key=lambda p: p["id"])  # order is not data
    c["meta"] = {k: v for k, v in b.get("meta", {}).items() if k not in VOLATILE_META}
    c["layers"] = [{k: v for k, v in l.items() if k not in ("ms", "asOf")} for l in b.get("layers", [])]
    return c


def refresh_one(bid):
    path = os.path.join(BDIR, bid + ".json")
    with open(path, "rb") as f:
        old_bytes = f.read()
    old = json.loads(old_bytes.decode("utf-8"))
    t0 = time.time()
    at = datetime.now(timezone.utc).isoformat(timespec="seconds")  # UTC everywhere, same as CI
    entry = {"at": at, "buildingId": bid, "sourcesQueried": 0, "sourcesFailed": 0, "ms": 0,
             "added": [], "removed": [], "changed": [], "note": ""}
    try:
        num, street = address_args(bid, old)
        rc, out = fetch(bid, num, street)
        if rc != 0:
            raise RuntimeError("fetch failed: " + out[-200:])
        rc, out = run(["scripts/build_fixture.py", bid])
        if rc != 0:
            raise RuntimeError("build failed: " + out[-200:])
        new = read_json(path)
        man = manifest(bid)
        queried = len(man["sources"]) or new["meta"].get("sourcesQueried", 0)
        failed = [k for k, s in man["sources"].items() if s["status"] == "fetch_failed"]
        entry["sourcesQueried"], entry["sourcesFailed"] = queried, len(failed)
        if queried and len(failed) == queried:
            raise RuntimeError("every source failed (offline?); kept last good file")
        keep_last_good(old, new)
        added, removed, changed = diff_pins(old, new)
        label = {p["id"]: p.get("label", "") for p in old.get("pins", []) + new["pins"]}
        for k, ids in (("added", added), ("removed", removed), ("changed", changed)):
            entry[k] = [{"pinId": i, "label": label.get(i, "")} for i in ids]
        m = new["meta"]
        m["sourcesQueried"] = queried
        m["sourcesWithRecords"] = sum(1 for l in new["layers"] if l["status"] == "ok")
        m["sourcesFailed"] = len(failed)
        m["refreshIntervalMin"] = INTERVAL_MIN
        m["refreshedAt"] = at
        m["changesSinceLast"] = {"added": added, "removed": removed, "changed": changed}
        if material(new) == material(old):
            with open(path, "wb") as f:  # only timestamps moved: keep git history clean
                f.write(old_bytes)
            entry["note"] = "no changes"
        else:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(new, f, indent=1, ensure_ascii=False)
            entry["note"] = f"+{len(added)} -{len(removed)} ~{len(changed)} pins"
    except Exception as e:  # never leave a half-written building behind
        with open(path, "wb") as f:
            f.write(old_bytes)
        entry["note"] = f"error: {e}"[:300]
        entry["sourcesFailed"] = entry["sourcesFailed"] or entry["sourcesQueried"]
    entry["ms"] = round((time.time() - t0) * 1000)
    return entry


def write_log(entries):
    log = read_json(LOG, [])
    if not isinstance(log, list):
        log = []
    keep, seen = [], {}
    for e in reversed(log + entries):  # newest 96 per building; file stays oldest-first
        if seen.get(e["buildingId"], 0) < KEEP:
            keep.append(e)
            seen[e["buildingId"]] = seen.get(e["buildingId"], 0) + 1
    keep.reverse()
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "w", encoding="utf-8") as f:
        json.dump(keep, f, indent=1, ensure_ascii=False)


def once(only):
    ids = [only] if only else sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(BDIR, "sf-*.json")))
    t0 = time.time()
    with cf.ThreadPoolExecutor(min(2, len(ids) or 1)) as ex:  # 2 at a time: 4 x 16 requests trips DataSF throttling
        entries = list(ex.map(refresh_one, ids))
    write_log(entries)
    for e in entries:
        print(f"{e['buildingId']}: {e['sourcesQueried']} sources, {e['sourcesFailed']} failed, {e['ms']} ms, {e['note']}")
    print(f"done in {round(time.time() - t0, 1)} s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="single pass (default)")
    ap.add_argument("--loop", type=int, metavar="SECONDS", help="repeat forever, e.g. 1800")
    ap.add_argument("--building", help="e.g. sf-0874003")
    a = ap.parse_args()
    while a.loop:
        once(a.building)
        time.sleep(a.loop)
    once(a.building)


if __name__ == "__main__":
    main()
