"""City context around a cached building: every footprint (with LiDAR height) and street within a radius.

Usage: python -I scripts/fetch_context.py sf-3722080 [radius_m]
Reads the building's centroid from web/public/buildings/<id>.json and writes web/public/context/<id>.json in the same
local metres (x east, y north, origin at the centroid), so the city lines up with the hero's footprint.
Context only: these buildings are drawn, never queried or pinned. The hero itself is left out (the app draws it).
"""
import json
import math
import os
import ssl
import sys
import time
import urllib.parse
import urllib.request

import certifi

CTX = ssl.create_default_context(cafile=certifi.where())
UA = "firesight-hack/0.2 (super{set} hackathon, city context)"
SODA = "https://data.sf.gov/resource/"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public")

# drawn width in m by OSM highway class (curb to curb, roughly SF's street widths)
WIDTH = {"motorway": 22, "trunk": 20, "primary": 20, "secondary": 16, "tertiary": 14, "unclassified": 11,
         "residential": 11, "living_street": 8, "pedestrian": 8, "service": 6,
         "motorway_link": 9, "trunk_link": 9, "primary_link": 9, "secondary_link": 8, "tertiary_link": 8}


def get(url, data=None, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=120, context=CTX) as r:
                return json.loads(r.read())
        except Exception as e:  # timeouts, 429s, 5xx
            print(f"  retry {i + 1}: {type(e).__name__}: {e}", file=sys.stderr)
            time.sleep(4 * (i + 1))
    raise RuntimeError(f"failed: {url}")


def soda(ds, **params):
    return get(SODA + ds + ".json?" + urllib.parse.urlencode(params))


def projector(lat0, lon0):
    k = 111_320 * math.cos(math.radians(lat0))
    return lambda lon, lat: ((lon - lon0) * k, (lat - lat0) * 111_320)


def simplify(pts, tol):
    """Douglas-Peucker on an open polyline."""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    n = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, -1.0
    for j in range(1, len(pts) - 1):
        d = abs(dy * (pts[j][0] - ax) - dx * (pts[j][1] - ay)) / n
        if d > dmax:
            i, dmax = j, d
    if dmax <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[: i + 1], tol)[:-1] + simplify(pts[i:], tol)


def area(ring):
    return sum(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1] for i in range(len(ring))) / 2


def buildings(lat, lon, r, proj, hero_mblr):
    out, offset, page = [], 0, 20000
    while True:
        rows = soda("ynuv-fyni", **{"$select": "mblr,hgt_median_m,shape", "$where": f"within_circle(shape,{lat},{lon},{r})",
                                    "$order": ":id", "$limit": page, "$offset": offset})
        for row in rows:
            if row.get("mblr") == hero_mblr or not row.get("shape") or not row.get("hgt_median_m"):
                continue
            h = float(row["hgt_median_m"])
            if h < 2:
                continue
            g = row["shape"]
            for poly in g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]:
                ring = [proj(x, y) for x, y in poly[0]]  # outer ring; courtyards are rare and unseen from street level
                if ring[0] == ring[-1]:
                    ring = ring[:-1]
                ring = simplify(ring + [ring[0]], 0.4)[:-1]
                a = area(ring)
                if len(ring) < 3 or abs(a) < 12:
                    continue
                if a < 0:
                    ring.reverse()  # CCW, like the hero footprint
                out.append([round(h * 10)] + [round(v * 10) for p in ring for v in p])
        print(f"  footprints: +{len(rows)} (offset {offset})", file=sys.stderr)
        if len(rows) < page:
            return out
        offset += page


def streets(lat, lon, r, proj):
    cls = "|".join(WIDTH)
    q = f'[out:json][timeout:120];way(around:{r},{lat},{lon})[highway~"^({cls})$"];out tags geom;'
    for url in OVERPASS:
        try:
            data = get(url, data=urllib.parse.urlencode({"data": q}).encode())
            break
        except RuntimeError:
            continue
    else:
        raise RuntimeError("overpass unavailable")
    out = []
    for w in data.get("elements", []):
        tags, geom = w.get("tags", {}), w.get("geometry") or []
        if len(geom) < 2 or tags.get("area") == "yes" or tags.get("tunnel") in ("yes", "building_passage"):
            continue
        if tags["highway"] == "service" and tags.get("service") in ("parking_aisle", "drive-through"):
            continue
        pts = simplify([proj(p["lon"], p["lat"]) for p in geom], 0.5)
        s = {"w": WIDTH[tags["highway"]], "p": [round(v * 10) for p in pts for v in p]}
        if tags.get("name") and WIDTH[tags["highway"]] >= 11:
            s["n"] = tags["name"]
        out.append(s)
    return out


def main():
    bid = sys.argv[1]
    r = int(sys.argv[2]) if len(sys.argv) > 2 else 1500
    b = json.load(open(os.path.join(ROOT, "buildings", bid + ".json")))
    lat, lon = b["centroid"]["lat"], b["centroid"]["lon"]
    proj = projector(lat, lon)
    t = time.time()
    fps = buildings(lat, lon, r, proj, "SF" + b["apn"])
    sts = streets(lat, lon, r, proj)
    doc = {
        "id": bid, "centroid": b["centroid"], "radiusM": r, "units": "decimetres, x east, y north, origin at centroid",
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sources": [
            {"name": "DataSF Building Footprints (2010 LiDAR heights)", "datasetId": "ynuv-fyni", "license": "PDDL 1.0"},
            {"name": "OpenStreetMap streets via Overpass", "datasetId": "osm-highway", "license": "ODbL 1.0, (c) OpenStreetMap contributors"},
        ],
        "buildings": fps,  # [heightDm, x0, y0, x1, y1, ...] outer ring, CCW
        "streets": sts,  # {w: width m, n?: name, p: [x0, y0, ...]}
    }
    os.makedirs(os.path.join(ROOT, "context"), exist_ok=True)
    path = os.path.join(ROOT, "context", bid + ".json")
    with open(path, "w") as f:
        json.dump(doc, f, separators=(",", ":"))
    print(f"{bid}: {len(fps)} buildings, {len(sts)} streets, {os.path.getsize(path) // 1024} KB, {time.time() - t:.0f}s")


if __name__ == "__main__":
    main()
