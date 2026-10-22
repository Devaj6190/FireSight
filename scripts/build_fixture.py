"""Fuse data/raw/sf-<apn>/*.json into web/public/buildings/sf-<apn>.json (shared/building.ts contract).

Usage: python -I scripts/build_fixture.py sf-0874003 [sf-3703081 ...]
Rules (plan.md s2): mode across permits for stories/units/type; only 3-digit unit numbers map to floors,
never above `floors`; anything without a floor goes to building/roof/ground; nothing is invented:
a missing fact is an unknown, sources that disagree become a CONFLICT.
"""
import json
import math
import os
import re
import sys
from collections import Counter
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "data", "raw")
OUT = os.path.join(HERE, "..", "web", "public", "buildings")
TODAY = date(2026, 10, 22)
SODA = "https://data.sf.gov/resource/"
AGOL = "https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/"

SOURCE_NAMES = {
    "wv5m-vpq2": "DataSF Assessor Tax Roll", "i98e-djp9": "DataSF Building Permits", "tyz3-vt28": "DataSF PermitSF Permits",
    "ftty-kx6y": "DataSF Electrical Permits", "a6aw-rudh": "DataSF Plumbing Permits", "5dp4-gtxk": "DataSF Boiler Permits",
    "75h8-2zhw": "DataSF Section 604 Affidavits", "gm2e-bten": "DataSF DBI Complaints", "nbtm-fbw5": "DataSF DBI Notices of Violation",
    "beah-shgi": "DataSF Soft-Story Program", "wr8u-xric": "DataSF SFFD Fire Incidents", "4zuq-2cbe": "DataSF SFFD Fire Violations",
    "wb4c-6hwj": "DataSF SFFD Fire Inspections", "893e-xam6": "DataSF SFFD Fire Permits", "2wsq-7wmv": "DataSF SFFD Fire Safety Complaints",
    "nuek-vuh3": "DataSF SFFD Calls for Service", "ynuv-fyni": "DataSF Building Footprints (2010 LiDAR)", "3tsw-4idn": "DataSF Historic Resource Status",
    "c5ge-t6pj": "DataSF Land Use", "96ck-qcfe": "DataSF Energy Performance", "h9wh-cg3m": "DataSF Zoning Height Districts",
    "g8m3-pdis": "DataSF Registered Businesses", "3mea-di5p": "DataSF Enterprise Addressing System",
}


# ---------------------------------------------------------------- helpers
def load(bdir, key):
    p = os.path.join(bdir, key + ".json")
    if not os.path.exists(p):
        return None
    return json.load(open(p, encoding="utf-8"))


def dload(bdir, key):
    d = load(bdir, key)
    return d if isinstance(d, dict) else {}  # failed fetches are saved as error strings


DATE_RE = re.compile(r"^(19|20)\d\d-\d\d-\d\d")
ARCGIS_DATE_KEYS = re.compile(r"(last_edited_date|editdate|edit_date|created_date|creationdate)", re.I)


def newest_record_date(bdir, key):
    """Newest date inside a source's records (not the fetch date): the sources drawer shows real data age."""
    d = load(bdir, key)
    best = ""
    if isinstance(d, list):
        for r in d[:500]:
            for k, v in r.items():
                if k in ("data_loaded_at",) or not isinstance(v, str) or not DATE_RE.match(v):
                    continue
                if v[:10] <= TODAY.isoformat() and v[:10] > best:
                    best = v[:10]
    elif isinstance(d, dict) and d.get("features"):
        for f in d["features"][:500]:
            for k, v in (f.get("attributes") or {}).items():
                if ARCGIS_DATE_KEYS.search(k) and isinstance(v, (int, float)) and v > 0:
                    iv = iso(v)
                    if iv <= TODAY.isoformat() and iv > best:
                        best = iv
    return best or None


def rows(bdir, key):
    d = load(bdir, key)
    return d if isinstance(d, list) else []


def feats(bdir, key):
    d = load(bdir, key)
    return d.get("features", []) if isinstance(d, dict) else []


def iso(s):
    if not s:
        return ""
    if isinstance(s, (int, float)):  # ArcGIS epoch ms
        return datetime.utcfromtimestamp(s / 1000).date().isoformat()
    return str(s)[:10]


def stale(asof):
    try:
        d = date.fromisoformat(asof[:10])
    except Exception:
        return False
    return (TODAY - d).days > 5 * 365


def mode(vals):
    vals = [v for v in vals if v not in (None, "", "0", 0, 0.0)]
    return Counter(vals).most_common(1)[0][0] if vals else None


def num(v):
    try:
        f = float(v)
        return int(f) if f == int(f) else f
    except Exception:
        return None


def dist_bearing(lat0, lon0, lat, lon):
    dy = (lat - lat0) * 111_320
    dx = (lon - lon0) * 111_320 * math.cos(math.radians(lat0))
    return round(math.hypot(dx, dy)), round((math.degrees(math.atan2(dx, dy)) + 360) % 360)


def geom_point(f):
    g = f.get("geometry") or {}
    if "x" in g:
        return g["y"], g["x"]
    if "paths" in g:  # nearest vertex is filled in by the caller
        return None
    return None


def nearest_on_paths(lat0, lon0, paths):
    """Distance and bearing to the closest point on any segment (local flat projection)."""
    k = 111_320 * math.cos(math.radians(lat0))
    best = None
    for path in paths:
        xy = [((lon - lon0) * k, (lat - lat0) * 111_320) for lon, lat in path]
        for (x1, y1), (x2, y2) in zip(xy, xy[1:] or xy):
            dx, dy = x2 - x1, y2 - y1
            t = 0 if dx == dy == 0 else max(0, min(1, -(x1 * dx + y1 * dy) / (dx * dx + dy * dy)))
            px, py = x1 + t * dx, y1 + t * dy
            d = math.hypot(px, py)
            if best is None or d < best[0]:
                best = (round(d), round((math.degrees(math.atan2(px, py)) + 360) % 360))
    return best


def soda_url(ds, field, value):
    return f"{SODA}{ds}.json?{field}={value}"


def agol_url(layer, oid_field, oid):
    svc, lyr = layer.rsplit("/", 1)
    return f"{AGOL}{svc.replace(' ', '%20')}/FeatureServer/{lyr}/query?where={oid_field}={oid}&outFields=*&f=json"


def ev(ds, rec, url, asof, rule, source=None):
    return {"source": source or SOURCE_NAMES.get(ds, ds), "datasetId": ds, "recordId": str(rec), "url": url, "asOf": asof, "rule": rule}


EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
CONTACT = re.compile(r"\b(contact|call|email|e-mail|inspector|attn:?|please contact)\b[^.;]*", re.I)


def clean(text):
    """Strip emails, phone numbers and contact clauses (with any names in them) from pin text."""
    t = EMAIL.sub("", text or "")
    t = PHONE.sub("", t)
    t = CONTACT.sub("", t)
    return re.sub(r"\s{2,}", " ", t).strip(" ,;:")


class Pins:
    def __init__(self):
        self.items, self.ids = [], set()

    def add(self, layer, rec, severity, label, detail, anchor, evidence, claim="verified", origin="public"):
        pid = re.sub(r"[^a-zA-Z0-9_-]", "", f"{layer}-{rec}")
        n = 2
        while pid in self.ids:
            pid = f"{pid}-{n}"
            n += 1
        self.ids.add(pid)
        asofs = [e["asOf"] for e in evidence if e.get("asOf")]
        newest = max(asofs) if asofs else ""
        self.items.append({
            "id": pid, "layer": layer, "origin": origin, "severity": severity, "label": clean(label).upper()[:48], "detail": clean(detail),
            "anchor": anchor, "claim": claim, "evidence": evidence, "stale": stale(newest) if newest else False,
        })
        return pid


BLDG = {"kind": "building"}
ROOF = {"kind": "roof"}


def floor(n):
    return {"kind": "floor", "floor": n}


def ground(d, b):
    return {"kind": "ground", "bearingDeg": b, "distanceM": d}


# ---------------------------------------------------------------- permit tagging
TAGS = [  # (tag, regex, severity, label template)
    ("solar_pv", r"\b(photovoltaic|pv\b|pv modules?|solar (panel|array|electric|pv))", "danger", "ROOFTOP SOLAR PV"),
    ("solar_thermal", r"solar (thermal|hot water|water heat|collector)", "caution", "SOLAR HOT WATER ON ROOF"),
    ("ess", r"(energy storage|\bess\b|battery (storage|system|backup)|powerwall|lithium)", "danger", "BATTERY ENERGY STORAGE"),
    ("sprinkler", r"sprinkl", "info", "SPRINKLER WORK"),
    ("fire_alarm", r"(fire alarm|\bfacp\b|nfpa 72|smoke detector|sounders?)", "info", "FIRE ALARM WORK"),
    ("structural", r"(structural|load[- ]bearing|shear wall|foundation|beam|seismic|soft[- ]story|retrofit)", "caution", "STRUCTURAL WORK"),
    ("fire_escape", r"fire escape", "caution", "FIRE ESCAPE WORK"),
    ("elevator", r"elevator", "info", "ELEVATOR WORK"),
    ("server_room", r"(server|computer|data|telecom|mdf|idf) room", "caution", "SERVER ROOM"),
    ("ev_charger", r"(ev (car )?charger|electric vehicle charg)", "caution", "EV CHARGER IN BUILDING"),
    ("urm", r"unreinforced masonry", "danger", "UNREINFORCED MASONRY RETROFIT"),
    ("roof", r"\b(re-?roof|roofing|roof deck)\b", "info", "ROOF WORK"),
]
UNIT_RE = re.compile(r"(?:\bunit|\bapt\.?|\bapartment|\bsuite|\bste\.?|#)\s*#?\s*(\d{3,4})\b", re.I)
FLR_RE = re.compile(r"\b(\d)(?:st|nd|rd|th)\s*(?:fl(?:oo)?r?\b|flr\b)", re.I)


FLOOR_WORDS = {"main": 1, "ground": 1, "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6}


def nov_summary(n):
    """One plain phrase from a DBI NOV row: category if present, else the violation text minus boilerplate."""
    if n.get("nov_category_description"):
        return n["nov_category_description"]
    t = clean(n.get("code_violation_desc") or n.get("nov_item_description") or "")
    if re.search(r"fa.ade inspection", t, re.I):
        return "facade inspection report overdue"
    t = re.sub(r"^.*(observed during [a-z ]*inspection\.|following [a-z ]*violations?:)\s*", "", t, flags=re.I)
    t = re.split(r"[.(]", t)[0].strip()
    return t[:80].lower() if t else ""


def own_address(addr, nums):
    """True when a free-text address has no street number or one of this parcel's numbers."""
    m = re.match(r"^\s*(\d+)", addr or "")
    return not m or int(m.group(1)) in nums


COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def compass(deg):
    return COMPASS[round((deg % 360) / 22.5) % 16]


def units_in(text):
    return sorted({int(u) for u in UNIT_RE.findall(text or "")})


# ---------------------------------------------------------------- footprint
def footprint_local(shape):
    polys = shape["coordinates"] if shape["type"] == "MultiPolygon" else [shape["coordinates"]]
    ring = max((p[0] for p in polys), key=len)  # largest outer ring, holes dropped
    lat0 = sum(p[1] for p in ring) / len(ring)
    lon0 = sum(p[0] for p in ring) / len(ring)
    k = 111_320 * math.cos(math.radians(lat0))
    pts = [[round((lon - lon0) * k, 2), round((lat - lat0) * 111_320, 2)] for lon, lat in ring]
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area < 0:
        pts.reverse()  # CCW
    return pts, lat0, lon0, abs(area) / 2


# ---------------------------------------------------------------- main fusion
def build(bid):
    bdir = os.path.join(RAW, bid)
    man = load(bdir, "manifest")
    res = load(bdir, "_resolve")
    apn, blk, lot = res["apn"], res["block"], res["lot"]
    lat, lon = res["lat"], res["lon"]
    P = Pins()
    conflicts, unknowns, links = [], [], []

    # ---- geometry
    fp = rows(bdir, "footprint") or rows(bdir, "footprint_pt")
    prev_path = os.path.join(OUT, bid + ".json")
    if fp:
        f0 = fp[0]
        footprint, clat, clon, area_m2 = footprint_local(f0["shape"])
        height = round(float(f0["hgt_median_m"]), 1)
        fp_asof = iso(f0.get("data_as_of"))
    elif os.path.exists(prev_path):  # outline fetch failed (timeout/throttle): keep the last good geometry
        prev = json.load(open(prev_path, encoding="utf-8"))
        footprint, height = prev["footprint"], prev["heightM"]
        clat, clon = prev["centroid"]["lat"], prev["centroid"]["lon"]
        area_m2 = (prev.get("meta") or {}).get("footprintAreaM2") or 0
        fp_asof = (prev.get("meta") or {}).get("footprintAsOf", "")
        fp = [{"sf16_bldgid": "last-good"}]  # non-empty so the resolution link still counts the record
        unknowns.append("Building outline: DataSF did not answer at refresh time; geometry kept from the previous refresh")
    else:
        raise RuntimeError(f"{bid}: no footprint fetched and no previous file to fall back on")

    # ---- assessor + permits: stories, units, type
    ass = rows(bdir, "assessor")
    a0 = ass[0] if ass else {}
    permits = rows(bdir, "permits")
    a_stories, a_units = num(a0.get("number_of_stories")), num(a0.get("number_of_units"))
    p_stories = num(mode([p.get("number_of_existing_stories") for p in permits]))
    p_units = num(mode([num(p.get("existing_units")) for p in permits]))
    p_type = mode([p.get("existing_construction_type") for p in permits])
    p_type_desc = mode([p.get("existing_construction_type_description") for p in permits])
    p_occ = mode([p.get("existing_occupancy") for p in permits])
    floors = int(mode([v for v in [p_stories, a_stories] if v]) or max(1, round(height / 3.4)))
    floors = int(p_stories or a_stories or floors)
    year_built = num(a0.get("year_property_built"))
    a_type = a0.get("construction_type") if a0.get("construction_type") not in (None, "", "NA") else None
    loc = re.sub(r"\s+", " ", re.sub(r"^0+|\b0+(?=\d)", "", (a0.get("property_location") or "").replace("0000 ", " "))).strip()
    loc = re.sub(r"(ST|AV|AVE|BLVD|WY|WAY|PL|DR|TER|CT|LN|RD)\d+$", r"\1", loc)  # "...MISSION ST0000"
    two = re.match(r"^(\d+)\s+(\d+)\s+(.*)$", loc)  # assessor ranges read "1024 1018 MISSION ST"
    if two:
        lo, hi = sorted(int(x) for x in two.group(1, 2))
        loc = f"{lo}-{hi} {two.group(3)}" if lo != hi else f"{lo} {two.group(3)}"
    assessor_addr = loc.strip()
    # every street number this parcel answers to (EAS, assessor range, permits, fire violations "1018 - 1024")
    own_nums = {int(res["address_like"].split()[0])}
    for txt in [loc] + [f"{p.get('street_number', '')}" for p in permits[:50]] + [v.get("address", "") for v in rows(bdir, "fire_violations")] + [i.get("address", "") for i in rows(bdir, "fire_inspections")[:20]]:
        m = re.match(r"^\s*(\d+)(?:\s*-\s*(\d+))?", str(txt))
        if m:
            a_, b_ = int(m.group(1)), int(m.group(2) or m.group(1))
            if abs(b_ - a_) <= 30:
                own_nums.update(range(min(a_, b_), max(a_, b_) + 1))
    permit_addr = None
    if permits:
        p0 = permits[0]
        permit_addr = f"{p0.get('street_number', '')} {p0.get('street_name', '')} {p0.get('street_suffix', '')}".strip().upper()
    a_url = soda_url("wv5m-vpq2", "parcel_number", apn) + f"&closed_roll_year={a0.get('closed_roll_year')}"
    a_asof = f"{a0.get('closed_roll_year')}-01-01" if a0 else ""

    ctype_parts = []
    if p_type:
        ctype_parts.append(f"{p_type} (permits{', ' + p_type_desc if p_type_desc else ''})")
    if a_type:
        ctype_parts.append(f"{a_type} (assessor)")
    construction = "; ".join(ctype_parts) or None
    if construction:
        evs = []
        if a0:
            evs.append(ev("wv5m-vpq2", f"{apn}-{a0.get('closed_roll_year')}", a_url, a_asof, "assessor roll, latest closed year"))
        if p_type:
            pp = next(p for p in permits if p.get("existing_construction_type") == p_type)
            evs.append(ev("i98e-djp9", pp["permit_number"], soda_url("i98e-djp9", "permit_number", pp["permit_number"]), iso(pp.get("filed_date")), f"mode of existing_construction_type across {len(permits)} permits"))
        built = f"built {year_built}, " if year_built else ""
        P.add("construction", apn, "caution", f"TYPE {p_type or a_type} · {floors} STORIES" if (p_type or a_type) else f"{floors} STORIES",
              f"Construction type {construction}; {built}{floors} stories; the codes are shown raw, not interpreted.", BLDG, evs)
    else:
        unknowns.append("Construction type: no public record")

    # units: conflict check
    land = rows(bdir, "landuse")
    lu_units = num(land[0].get("resunits")) if land else None
    unit_sources = []
    if a_units and "hotel" in (a0.get("use_definition") or "").lower() and num(a0.get("number_of_rooms")):
        a_units = num(a0.get("number_of_rooms"))  # hotels: the roll counts the business as units, rooms are the sleeping units
        unit_sources.append(("assessor (rooms)", a_units, ev("wv5m-vpq2", f"{apn}-{a0.get('closed_roll_year')}", a_url, a_asof, "assessor number_of_rooms (hotel use)")))
    elif a_units:
        unit_sources.append(("assessor", a_units, ev("wv5m-vpq2", f"{apn}-{a0.get('closed_roll_year')}", a_url, a_asof, "assessor number_of_units")))
    if p_units:
        pp = next(p for p in permits if num(p.get("existing_units")) == p_units)
        unit_sources.append(("permits", p_units, ev("i98e-djp9", pp["permit_number"], soda_url("i98e-djp9", "permit_number", pp["permit_number"]), iso(pp.get("filed_date")), f"mode of existing_units across {len(permits)} permits")))
    if lu_units and "hotel" not in (a0.get("use_definition") or "").lower():  # land use counts hotel rooms as visitor space
        unit_sources.append(("land use", lu_units, ev("c5ge-t6pj", apn, soda_url("c5ge-t6pj", "mapblklot", apn), iso(land[0].get("data_as_of")), "land use resunits")))
    distinct = sorted({v for _, v, _ in unit_sources})
    units = None
    if len(distinct) > 1:
        summary = "; ".join(f"{n} says {v}" for n, v, _ in unit_sources)
        pid = P.add("occupancy", "units", "caution", " OR ".join(map(str, distinct)) + " UNITS: RECORDS DISAGREE",
                    f"Unit count disagrees: {summary}. Plan for the higher number.", BLDG, [e for _, _, e in unit_sources], claim="conflict")
        conflicts.append({"id": "conflict-units", "field": "units", "departmentPinId": "", "publicPinId": pid, "summary": f"Unit count disagrees: {summary}.", "pinIds": [pid]})
        units = max(distinct)
    elif distinct:
        units = distinct[0]
        P.add("occupancy", "units", "info", f"{units} RESIDENTIAL UNITS", f"{units} residential units on record.", BLDG, [e for _, _, e in unit_sources])
    rooms = num(a0.get("number_of_rooms"))
    use = a0.get("use_definition")
    if use:
        use = f"{use} (assessor)" + (f"; occupancy {p_occ} (permits)" if p_occ else "")

    # ---- per-floor anchors from unit numbers in permit text (legacy + plumbing + electrical)
    floor_units = {f: set() for f in range(1, floors + 1)}
    unit_ev = {f: [] for f in range(1, floors + 1)}
    for key, ds, pk, dfield in [("permits", "i98e-djp9", "permit_number", "filed_date"), ("plumbing", "a6aw-rudh", "permit_number", "filed_date"), ("electrical", "ftty-kx6y", "permit_number", "filed_date")]:
        for p in rows(bdir, key):
            for u in units_in(p.get("description")):
                f = u // 100
                if 1 <= f <= floors:
                    floor_units[f].add(u)
                    if len(unit_ev[f]) < 3:
                        unit_ev[f].append(ev(ds, p[pk], soda_url(ds, pk, p[pk]), iso(p.get(dfield)), f"unit {u} -> floor {f}"))
    residential = bool(re.search(r"(resid|dwelling|apartment|hotel|r-[12])", (use or "") + " " + (p_occ or ""), re.I))
    for f in range(1, floors + 1):
        if floor_units[f] and residential:
            us = sorted(floor_units[f])
            P.add("occupancy", f"floor{f}-units", "info", f"{len(us)} UNITS KNOWN ON FLOOR {f}",
                  f"Units {', '.join(map(str, us))} appear in permits for floor {f}; this is a lower bound, not a full list.", floor(f), unit_ev[f])

    # ---- permit tags (newest per tag), unit-specific structural work pinned to its floor
    seen = set()
    for p in permits + rows(bdir, "electrical"):
        desc = re.sub(r"no (structural|load[- ]bearing)[^.;]*", "", (p.get("description") or "").lower())
        ds = "i98e-djp9" if p in permits else "ftty-kx6y"
        for tag, rx, sev, label in TAGS:
            if not re.search(rx, desc):
                continue
            if tag == "ess" and re.search(r"(garage|gate|alarm|smoke|exit sign|emergency light)", desc):
                continue
            us = [u for u in units_in(desc) if 1 <= u // 100 <= floors]
            fl_txt = [int(x) for x in re.findall(r"\b(\d{1,2})(?:st|nd|rd|th)\s*(?:fl|flr|floor)\b", desc) if 1 <= int(x) <= floors]
            anchor = floor(us[0] // 100) if (us and tag == "structural") else (ROOF if tag in ("solar_pv", "solar_thermal", "roof") else floor(fl_txt[0]) if (fl_txt and tag in ("server_room", "ess")) else BLDG)
            k = (tag, us[0] if (us and tag == "structural") else json.dumps(anchor))
            if k in seen or (tag == "server_room" and sum(1 for t in seen if t[0] == "server_room") >= 2):
                continue
            seen.add(k)
            when = iso(p.get("filed_date"))
            st = (p.get("status") or "").lower()
            done = "completed" if st == "complete" else f"status {st or 'not recorded'}"
            lab = f"UNIT {us[0]}: {label}" if (us and tag == "structural") else f"{label}, FLOOR {anchor['floor']}" if anchor.get("kind") == "floor" else f"{label} {when[:4]}"
            if anchor.get("kind") == "floor" and not (us and tag == "structural"):
                rule_extra = f"; permit text '{anchor['floor']}th fl' -> floor {anchor['floor']}"
            else:
                rule_extra = ""
            if tag in ("solar_pv", "ess", "ev_charger") and st not in ("complete", "completed"):
                lab = f"{label.replace(' IN BUILDING', '')} PERMIT {when[:4]} ({st.upper() or 'NO STATUS'})"
                sev = "caution"
            if tag == "solar_thermal" and "basement" in desc:
                gal = re.search(r"(\d[\d,]*)\s*gallon", desc)
                P.add("permit", f"tank-{p['permit_number']}", "caution", f"{gal.group(1) if gal else ''} GAL SOLAR WATER TANK".strip(),
                      f"{when[:4]} permit says the solar hot-water tank{' (' + gal.group(1) + ' gallons)' if gal else ''} is located in the basement.", floor(0),
                      [ev(ds, p["permit_number"], soda_url(ds, "permit_number", p["permit_number"]), when, "permit text says 'basement' -> floor 0")])
            rule = f"keyword '{tag}' in permit text" + (f"; unit {us[0]} -> floor {us[0] // 100}" if (us and tag == "structural") else rule_extra)
            P.add("permit", f"{tag}-{p['permit_number']}", sev, lab, f"{when[:4]} permit ({done}): \"{p.get('description', '').strip()[:220]}\"", anchor,
                  [ev(ds, p["permit_number"], soda_url(ds, "permit_number", p["permit_number"]), when, rule)])
    act = [p for p in rows(bdir, "permitsf") if (p.get("status_detail") or "").lower().startswith("active")]
    if act:
        P.add("permit", "permitsf-active", "info", f"{len(act)} OPEN PERMITS: WORK IN PROGRESS",
              "Active in PermitSF: " + "; ".join(f"{p.get('recordtype')} {p['recordno']} ({iso(p.get('submitted_date'))})" for p in act) + ". Expect open walls or contractors.", BLDG,
              [ev("tyz3-vt28", p["recordno"], soda_url("tyz3-vt28", "recordno", p["recordno"]), iso(p.get("submitted_date")), "PermitSF active record on this parcel") for p in act])

    # ---- soft-story
    for s in rows(bdir, "softstory_padded") or rows(bdir, "softstory"):
        done = "complete" in (s.get("status") or "").lower()
        P.add("softstory", apn, "caution" if done else "danger", "SOFT-STORY: RETROFIT COMPLETE" if done else "SOFT-STORY: NOT RETROFITTED",
              f"On the city soft-story list (tier {s.get('tier')}), status \"{s.get('status')}\": weak ground floor by design.", floor(1),
              [ev("beah-shgi", apn, soda_url("beah-shgi", "parcel_number", apn), iso(s.get("data_as_of")), "soft-story list by block + lot")])

    # ---- fire incidents (radius matches can pull in neighbours: keep only this building's street numbers)
    inc = [r for r in rows(bdir, "fire_incidents") if own_address(r.get("address"), own_nums)]
    groups = {"building": [], "cooking": [], "malfunction": [], "outside": [], "elevator": []}
    for r in inc:
        sit = (r.get("primary_situation") or "").lower()
        if sit.startswith("111") or "building fire" in sit:
            groups["building"].append(r)
        elif sit.startswith("353") or "stalled elevator" in sit:
            groups["elevator"].append(r)
        elif sit.startswith("113") or "cooking" in sit:
            groups["cooking"].append(r)
        elif "malfunction" in sit or sit.startswith(("73", "74", "71")):
            groups["malfunction"].append(r)
        elif sit.startswith(("15", "118", "16", "14")):
            groups["outside"].append(r)
    by_floor = {}
    for r in groups["building"]:
        fl = num(r.get("floor_of_fire_origin"))
        if fl is not None and fl < 0:
            fl = 0  # NFIRS records below-grade origin as negative floors -> basement
        by_floor.setdefault(fl if fl is not None and 0 <= fl <= floors else None, []).append(r)
    for fl, rs in sorted(by_floor.items(), key=lambda kv: (kv[0] is None, kv[0] or 0)):
        years = sorted({iso(r["incident_date"])[:4] for r in rs})
        where = f"origin floor {fl}" if fl else "floor of origin not recorded"
        lab = f"BUILDING FIRE {years[0]}" if len(rs) == 1 else f"{len(rs)} BUILDING FIRES {years[0]}-{years[-1]}"
        where = "origin in the basement" if fl == 0 else where
        P.add("incident", f"bldgfire-f{'x' if fl is None else fl}", "danger", lab + (", BASEMENT" if fl == 0 else f", FLOOR {fl}" if fl and len(rs) > 1 else ""),
              f"{len(rs)} SFFD building fire incident(s), {where}: " + ", ".join(iso(r["incident_date"]) for r in rs[:6]) + ".", floor(fl) if fl is not None else BLDG,
              [ev("wr8u-xric", r["id"], soda_url("wr8u-xric", "id", r["id"]), iso(r["incident_date"]), "address/radius match" + (f"; floor_of_fire_origin {fl} -> floor {fl}" if fl else "")) for r in rs[:4]])
    if groups["cooking"]:
        g = groups["cooking"]
        P.add("incident", "cooking", "caution", f"{len(g)} COOKING FIRES ON RECORD", f"{len(g)} cooking fires confined to a container, {iso(g[-1]['incident_date'])[:4]} to {iso(g[0]['incident_date'])[:4]}.", BLDG,
              [ev("wr8u-xric", r["id"], soda_url("wr8u-xric", "id", r["id"]), iso(r["incident_date"]), "situation code 113") for r in g[:4]])
    if groups["elevator"]:
        g = groups["elevator"]
        P.add("incident", "elevator-rescues", "caution", f"{len(g)} ELEVATOR RESCUES ON RECORD",
              f"SFFD removed people from a stalled elevator {len(g)} times, {iso(g[-1]['incident_date'])[:4]} to {iso(g[0]['incident_date'])[:4]}; newest {iso(g[0]['incident_date'])}. Expect elevator entrapments.", BLDG,
              [ev("wr8u-xric", r["id"], soda_url("wr8u-xric", "id", r["id"]), iso(r["incident_date"]), "situation code 353") for r in g[:4]])
    if groups["malfunction"]:
        g = groups["malfunction"]
        spr = [r for r in g if "sprinkler" in (r.get("primary_situation") or "").lower()]
        label = f"{len(g)} SYSTEM MALFUNCTION CALLS" + (" (INCL. SPRINKLER)" if spr else "")
        P.add("incident", "malfunction", "caution", label, f"{len(g)} alarm or sprinkler malfunction responses; newest {iso(g[0]['incident_date'])}: {g[0].get('primary_situation')}. Expect alarm fatigue.", BLDG,
              [ev("wr8u-xric", r["id"], soda_url("wr8u-xric", "id", r["id"]), iso(r["incident_date"]), "situation code 7xx malfunction") for r in (spr + g)[:4]])
    if groups["outside"]:
        g = groups["outside"]
        P.add("incident", "outside", "info", f"{len(g)} TRASH/OUTSIDE FIRES", f"{len(g)} rubbish or dumpster fires at this address, newest {iso(g[0]['incident_date'])}.", {"kind": "ground", "bearingDeg": 0, "distanceM": 3},
              [ev("wr8u-xric", r["id"], soda_url("wr8u-xric", "id", r["id"]), iso(r["incident_date"]), "situation code 1xx outside fire") for r in g[:3]])

    # ---- fire violations, inspections, complaints, fire permits
    viol = rows(bdir, "fire_violations")
    openv = [v for v in viol if (v.get("status") or "").lower() not in ("abated", "closed")]
    for v in openv:
        P.add("violation", v["violation_id"], "danger", f"OPEN VIOLATION: {v.get('violation_item_description', '')[:28]}",
              f"SFFD violation {iso(v.get('violation_date'))}: {v.get('violation_item_description')}, status {v.get('status')}.", BLDG,
              [ev("4zuq-2cbe", v["violation_id"], soda_url("4zuq-2cbe", "violation_id", v["violation_id"]), iso(v.get("violation_date")), "EAS id match")])
    recent = [v for v in viol if iso(v.get("violation_date")) >= "2023-01-01" and v not in openv][:5]
    for v in recent:
        P.add("violation", v["violation_id"], "caution", f"VIOLATION {iso(v.get('violation_date'))[:4]}: {v.get('violation_item_description', '')[:26]}",
              f"SFFD violation {iso(v.get('violation_date'))}: {v.get('violation_item_description')}, status {v.get('status')}" + (f" {iso(v.get('close_date'))}" if v.get("close_date") else "") + ".", BLDG,
              [ev("4zuq-2cbe", v["violation_id"], soda_url("4zuq-2cbe", "violation_id", v["violation_id"]), iso(v.get("violation_date")), "EAS id match")])
    if viol and not openv and not recent:
        st_counts = Counter((v.get("status") or "").lower() for v in viol)
        top = Counter(v.get("violation_item_description") for v in viol).most_common(3)
        newest_v = max(viol, key=lambda v: iso(v.get("violation_date")))
        P.add("violation", "history", "info", f"{len(viol)} FIRE VIOLATIONS ON RECORD, 0 OPEN",
              f"{len(viol)} SFFD violations {min(iso(v.get('violation_date')) for v in viol)[:4]} to {iso(newest_v.get('violation_date'))[:4]}, status "
              + ", ".join(f"{k} {n}" for k, n in st_counts.most_common()) + "; most common: " + "; ".join(f"{k} x{n}" for k, n in top) + ".", BLDG,
              [ev("4zuq-2cbe", newest_v["violation_id"], soda_url("4zuq-2cbe", "violation_id", newest_v["violation_id"]), iso(newest_v.get("violation_date")), "EAS id match, newest violation")])
    ins = rows(bdir, "fire_inspections")
    # newest inspection of each statutory type (R-1/R-2 annual, high-rise annual) feeds the compliance strip
    for rx in (r"\br[12]\b", r"high ?rise"):
        hits = [i for i in ins if re.search(rx, (i.get("inspection_type_description") or "").lower()) and own_address(i.get("address"), own_nums)]
        if hits:
            i = hits[0]
            P.add("inspection", i["inspection_number"], "info", (i.get("inspection_type_description") or "inspection").upper(),
                  f"{i.get('inspection_type_description')}, status {i.get('inspection_status')}. SFFD inspection {i['inspection_number']} on {iso(i['inspection_start_date'])}"
                  + (f"; {len(hits)} on record, newest first." if len(hits) > 1 else "."), BLDG,
                  [ev("wb4c-6hwj", i["inspection_number"], soda_url("wb4c-6hwj", "inspection_number", i["inspection_number"]), iso(i["inspection_start_date"]), "address or 15 m radius match")])
    fcomp = [c for c in rows(bdir, "fire_complaints") if iso(c.get("received_date")) >= "2024-01-01" and own_address(c.get("address"), own_nums)]
    if fcomp:
        kinds = Counter(c.get("complaint_item_type_description") for c in fcomp)
        P.add("complaint", "fire-complaints", "caution", f"{len(fcomp)} FIRE SAFETY COMPLAINTS SINCE 2024",
              "; ".join(f"{k} x{n}" for k, n in kinds.most_common()) + f"; newest {iso(fcomp[0]['received_date'])} ({fcomp[0].get('disposition')}).", BLDG,
              [ev("2wsq-7wmv", c["complaint_id"], soda_url("2wsq-7wmv", "complaint_id", c["complaint_id"]), iso(c["received_date"]), "address or 20 m radius match") for c in fcomp[:4]])
    # SFFD fire permits: the condition text names floors ("floor 22 computer room", "basement level b1", "main floor")
    fps = [f for f in rows(bdir, "fire_permits") if own_address(f.get("permit_address"), own_nums)]
    current = [f for f in fps if re.search(r"(approved|pending|issued|active)", (f.get("permit_status") or ""), re.I)]
    past_tanks = [f for f in fps if f not in current and re.search(r"tank", f.get("permit_type_description") or "", re.I)]
    has_current_tank = any(re.search(r"tank", f.get("permit_type_description") or "", re.I) for f in current)
    for fpm in current + ([] if has_current_tank else past_tanks[:1]):
        desc = fpm.get("permit_type_description") or ""
        cond = clean(fpm.get("conditions_associated_with_granting_this_permit") or "")
        st = fpm.get("permit_status") or ""
        when = iso(fpm.get("permit_application_date"))
        e = lambda rule: [ev("893e-xam6", fpm["permit_number"], soda_url("893e-xam6", "permit_number", fpm["permit_number"]), when, rule)]
        if re.search(r"battery", desc, re.I):
            for fl, amt in re.findall(r"floor\s*(\d{1,2})\s+[a-z ]*?room\s+([\d.]+)\s*gal", cond, re.I) or [(None, None)]:
                fl = num(fl)
                anc = floor(fl) if fl and fl <= floors else BLDG
                P.add("fire_permit", f"{fpm['permit_number']}-f{fl or 'x'}", "danger", f"BATTERY ROOM{' FLOOR ' + str(fl) if fl else ''}" + (f", {amt} GAL ELECTROLYTE" if amt else ""),
                      f"SFFD permit {fpm['permit_number']} ({desc}, {st} {when}): battery storage" + (f" in the floor {fl} computer room, {amt} gallons" if fl else "") + ". Lithium or lead-acid not stated.",
                      anc, e(f"permit text 'floor {fl}' -> floor {fl}" if fl else "address match"))
            continue
        anc, rule = BLDG, "address match"
        if re.search(r"basement|level b1|\bb1\b", cond, re.I):
            anc, rule = floor(0), "permit text 'basement' -> floor 0"
        elif m := re.search(r"(?:floor,?\s*(\d{1,2})\b|(\d{1,2})(?:st|nd|rd|th)\s*(?:fl|flr|floor))", cond, re.I):
            fl = num(m.group(1) or m.group(2))
            if fl and fl <= floors:
                anc, rule = floor(fl), f"permit text 'floor {fl}' -> floor {fl}"
        elif re.search(r"main floor|ground floor|lobby", cond, re.I):
            anc, rule = floor(1), "permit text 'main/ground floor' -> floor 1"
        if re.search(r"assembly", desc, re.I):
            occ = re.search(r"occupant load of (\d+)", cond)
            total = occ.group(1) if occ else None
            # "location: main floor - 257 persons; second floor - 68 persons" -> one pin per floor
            parts = [(FLOOR_WORDS.get(w.lower()) or num(re.sub(r"\D", "", w)), int(n_))
                     for w, n_ in re.findall(r"(main|ground|first|second|third|fourth|fifth|sixth|\d{1,2}(?:st|nd|rd|th)?)\s+floor\s*[-:]\s*(\d+)\s*persons", cond, re.I)]
            parts = [(f_, n_) for f_, n_ in parts if f_ and 1 <= f_ <= floors]
            if len(parts) > 1:
                for f_, n_ in parts:
                    P.add("fire_permit", f"{fpm['permit_number']}-f{f_}", "caution", f"ASSEMBLY: {n_} PEOPLE, FLOOR {f_}",
                          f"SFFD place-of-assembly permit {fpm['permit_number']} ({st} {when}): up to {n_} occupants on floor {f_} ({total} total across floors): crowded floor, check exits.",
                          floor(f_), e(f"permit text '{n_} persons' on floor {f_} -> floor {f_}"))
                continue
            P.add("fire_permit", fpm["permit_number"], "caution", f"ASSEMBLY: {total or '?'} PEOPLE" + (f", FLOOR {anc['floor']}" if anc["kind"] == "floor" else ""),
                  f"SFFD place-of-assembly permit {fpm['permit_number']} ({st} {when}) for up to {total or 'an unstated number of'} occupants: crowded floor, check exits.", anc, e(rule))
        elif re.search(r"tank", desc, re.I):
            gal = re.findall(r"(\d[\d,]*)\s*gallon\s*([a-z ]*?)(?:day )?tank", cond, re.I)
            what = ", ".join(f"{g} gal {k.strip()}".strip() for g, k in gal[:2]) or desc
            pump = "fire pump" in cond.lower()
            P.add("fire_permit", fpm["permit_number"], "caution" if fpm in current else "info",
                  ("B1 FIRE PUMP + " if pump and anc.get("floor") == 0 else "") + ("DIESEL TANKS" if "diesel" in cond.lower() else "FUEL TANK") + ("" if fpm in current else f" ({st.split()[0].upper()})"),
                  f"SFFD permit {fpm['permit_number']} ({desc}, {st} {when}): {what}" + (" in the fire pump / generator room" if pump else "") + ".", anc, e(rule))
        else:
            sev = "danger" if re.search(r"(hazard|lpg|cryogen|flammable|compressed gas|hazmat)", desc, re.I) else "caution"
            P.add("fire_permit", fpm["permit_number"], sev, f"FIRE PERMIT: {desc[:30]}", f"SFFD permit {fpm['permit_number']} ({desc}), status {st}, {when}.", anc, e(rule))

    # ---- Tall Building Inventory (high-rises only): sprinkler coverage, basements, structure
    tall_alias = []
    for t in rows(bdir, "tall_building")[:1]:
        tev = [ev("5kya-mfst", apn, soda_url("5kya-mfst", "mapblocklot", apn), iso(t.get("collected_on")), "tall building inventory by block + lot", "DataSF Tall Building Inventory")]
        tall_m = num(t.get("height_ft")) and round(num(t.get("height_ft")) * 0.3048, 1)
        if tall_m and abs(tall_m - height) / tall_m > 0.05:
            pid = P.add("construction", "height", "caution", f"HEIGHT {height} M OR {tall_m} M: RECORDS DISAGREE",
                        f"2010 LiDAR median roof height is {height} m ({round(height / 0.3048)} ft); the Tall Building Inventory says {t.get('height_ft')} ft ({tall_m} m). "
                        "The model uses the LiDAR median; the inventory figure likely measures to the top of the tower.", BLDG,
                        [ev("ynuv-fyni", f"SF{apn}", soda_url("ynuv-fyni", "mblr", f"SF{apn}"), fp_asof, "hgt_median_m"), tev[0]], claim="conflict")
            conflicts.append({"id": "conflict-height", "field": "height", "departmentPinId": "", "publicPinId": pid,
                              "summary": f"Height disagrees: LiDAR median {height} m vs Tall Building Inventory {t.get('height_ft')} ft ({tall_m} m).", "pinIds": [pid]})
        if t.get("name"):
            tall_alias.append(t["name"].upper())
        pct = num(t.get("percent_sprinklered"))
        if pct is not None:
            P.add("construction", "tall-sprinklered", "danger" if pct < 100 else "info", f"ONLY {pct}% SPRINKLERED" if pct < 100 else "FULLY SPRINKLERED",
                  f"Tall Building Inventory: {pct} percent sprinklered (collected {iso(t.get('collected_on'))[:4]}); which areas are unsprinklered is not listed.", BLDG, tev)
        below = num(t.get("stories_below_grade"))
        if below:
            P.add("construction", "tall-basement", "caution", f"{below} BASEMENT LEVEL{'S' if below > 1 else ''}",
                  f"Tall Building Inventory: {t.get('stories_above_grade')} stories above grade, {below} below.", floor(0), tev)
        P.add("construction", "tall-structure", "info", f"{(t.get('fire_resistence_type') or '').upper()[:30]}",
              f"{t.get('name')} ({t.get('completion_date')}): {t.get('description')}; {t.get('structural_system')}, {t.get('foundation_system')} foundation, "
              f"{t.get('height_ft')} ft, typical story {t.get('typ_story_height')}, liquefaction potential {t.get('liquefaction_potential')}.", BLDG, tev)

    # ---- tenant build-out by floor (office/commercial permits say "18th floor"), last 2 years
    recent_fl = {}
    for p in permits:
        if iso(p.get("filed_date")) < "2024-10-22":
            continue
        for m in re.findall(r"\b(\d{1,2})(?:st|nd|rd|th)\s*(?:fl|flr|floor)", (p.get("description") or "").lower()):
            fl = int(m)
            if 2 <= fl <= floors:
                recent_fl.setdefault(fl, []).append(p)
    for fl, ps in sorted(recent_fl.items(), key=lambda kv: -len(kv[1]))[:5]:
        p0 = ps[0]
        P.add("permit", f"buildout-f{fl}", "caution", f"RECENT BUILD-OUT, FLOOR {fl}",
              f"{len(ps)} permit(s) since Oct 2024 name floor {fl}; newest {iso(p0.get('filed_date'))} ({p0.get('status')}): \"{clean(p0.get('description') or '')[:120]}\". Expect open ceilings or changed layout.", floor(fl),
              [ev("i98e-djp9", p["permit_number"], soda_url("i98e-djp9", "permit_number", p["permit_number"]), iso(p.get("filed_date")), f"permit text '{fl}th floor' -> floor {fl}") for p in ps[:3]])

    # ---- DBI complaints / NOVs
    comp = rows(bdir, "dbi_complaints")
    active = [c for c in comp if (c.get("status") or "").lower() == "active"]
    for c in active[:4]:
        d = c.get("complaint_description") or ""
        base = "basement" in d.lower()
        P.add("complaint", c["complaint_number"], "caution", "OPEN COMPLAINT: BASEMENT WORK" if base else f"OPEN DBI COMPLAINT {iso(c['date_filed'])[:4]}",
              f"Active DBI complaint filed {iso(c['date_filed'])}: \"{clean(d.strip().split('.')[0])[:120]}\".", floor(0) if base else BLDG,
              [ev("gm2e-bten", c["complaint_number"], soda_url("gm2e-bten", "complaint_number", c["complaint_number"]), iso(c["date_filed"]), "block + lot" + ("; text says basement -> floor 0" if base else ""))])
    nov = rows(bdir, "dbi_nov")
    unsafe = [n for n in nov if (n.get("unsafe_building") or "").upper() == "Y"]
    for n in unsafe[:2]:
        active = (n.get("status") or "").lower() == "active"
        what = nov_summary(n)
        P.add("nov", n["primary_key"], "danger" if active else "caution",
              f"UNSAFE NOTICE {iso(n['date_filed'])[:4]}" + ("" if active else " (CLOSED)") + (f": {what.split(',')[0][:24]}" if what else ""),
              f"DBI notice filed {iso(n['date_filed'])} flagged the building unsafe" + (f" ({what})" if what else "")
              + f"; handled by {n.get('assigned_division') or n.get('receiving_division') or 'DBI'}, status {n.get('status')}.", BLDG,
              [ev("nbtm-fbw5", n["primary_key"], soda_url("nbtm-fbw5", "primary_key", n["primary_key"]), iso(n["date_filed"]), "block + lot, unsafe_building = Y")])
    open_nov = {n["complaint_number"] for n in nov if (n.get("status") or "").lower() == "active"}
    if open_nov:
        n0 = next(n for n in nov if n["complaint_number"] in open_nov)
        P.add("nov", "open", "caution", f"{len(open_nov)} OPEN DBI NOTICES", f"{len(open_nov)} DBI notices of violation still active; newest filed {iso(n0['date_filed'])}.", BLDG,
              [ev("nbtm-fbw5", n0["primary_key"], soda_url("nbtm-fbw5", "primary_key", n0["primary_key"]), iso(n0["date_filed"]), "block + lot, status active")])

    # ---- building systems and facade
    for s in rows(bdir, "sec604")[:1]:
        P.add("permit", f"sec604-{s.get('item')}", "info", f"FIRE ESCAPES/BALCONIES CERTIFIED {iso(s.get('inspection_date'))[:4]}",
              f"Section 604 affidavit for exterior elevated elements (balconies, exit stairs, fire escapes) inspected {iso(s.get('inspection_date'))}.", BLDG,
              [ev("75h8-2zhw", s.get("item"), soda_url("75h8-2zhw", "item", s.get("item")), iso(s.get("inspection_date")), "block + lot")])
    boil = [b for b in rows(bdir, "boiler") if (b.get("status") or "").upper() == "ISSUED"]
    if boil:
        types = Counter(b.get("boiler_type") for b in boil if iso(b.get("application_date")) == iso(boil[0].get("application_date")))
        P.add("permit", "boilers", "caution", f"{sum(types.values())} BOILERS IN OPERATION",
              f"Boiler permits to operate issued {iso(boil[0].get('application_date'))}: " + ", ".join(f"{n} {t}" for t, n in types.items()) + ". Location in the building is not stated.", BLDG,
              [ev("5dp4-gtxk", boil[0]["permit_number"], soda_url("5dp4-gtxk", "permit_number", boil[0]["permit_number"]), iso(boil[0].get("application_date")), "block + lot, status ISSUED")])
    for h in rows(bdir, "historic")[:1]:
        if h.get("ceqacode") in ("A", "B"):
            P.add("history", f"historic-{apn}", "info", f"HISTORIC RESOURCE, BUILT {h.get('yearbuilt')}",
                  f"Planning lists \"{h.get('name')}\" as a CEQA category {h.get('ceqacode')} historic resource ({h.get('ceqacodereason')}): expect original construction.", BLDG,
                  [ev("3tsw-4idn", apn, soda_url("3tsw-4idn", "apn", apn), iso(h.get("data_as_of")), "parcel polygon contains the building point")])

    # ---- water, stations, call boxes (SF DEM ESF-4, 2018 snapshot)
    def nearest(key, layer, oid_field):
        best = None
        for f in feats(bdir, key):
            pt = geom_point(f)
            if not pt:
                continue
            d, b = dist_bearing(lat, lon, *pt)
            if best is None or d < best[0]:
                best = (d, b, f["attributes"])
        if best:
            a = best[2]
            return best[0], best[1], a, a.get(oid_field)
        return None

    water_asof = "2018-09-19"
    for key, layer, oidf, sev, lab, what in [
        ("esf4_hydrants_lp", "Firefighting_ESF_4/4", "objectid_12", "info", "HYDRANT", "Low-pressure hydrant"),
        ("esf4_hydrants_hp", "Firefighting_ESF_4/3", "objectid", "info", "AWSS HIGH-PRESSURE HYDRANT", "AWSS high-pressure hydrant (the post-1906 firefighting system)"),
        ("esf4_cisterns", "Firefighting_ESF_4/2", "objectid", "info", "CISTERN", "Underground firefighting cistern"),
    ]:
        n = nearest(key, layer, oidf)
        if n:
            d, b, a, oid = n
            extra = f" at {a['location'].strip()}" if (a.get("location") or "").strip() else ""
            hid = (a.get("hyd_id_new") or a.get("hydrant_id") or "").strip()
            zone = (a.get("pr_system") or "").strip().title()
            if hid:
                extra += f", hydrant #{hid}"
            if zone:
                extra += f", {zone} pressure zone"
            others = sum(1 for f in feats(bdir, key) if geom_point(f) and dist_bearing(lat, lon, *geom_point(f))[0] <= (150 if "hydrant" in key else 400)) - 1
            more = f" {others} more within {150 if 'hydrant' in key else 400} m." if others > 0 else ""
            P.add("water", f"{key}-{oid}", sev, f"{lab} {d} M {compass(b)}",
                  f"{what}{extra}, {d} m to the {compass(b)} (bearing {b} deg).{more} SF DEM layer, 2018 snapshot: positions may have changed, check on arrival.", ground(d, b),
                  [ev(layer, oid, agol_url(layer, oidf, oid), water_asof, f"nearest within buffer, {d} m", "SF DEM Firefighting ESF-4")])
    fr = feats(bdir, "esf4_first_run")
    if fr:
        first = fr[0]["attributes"].get("firstrun", "").lstrip("0")
        st = next((f for f in feats(bdir, "esf4_stations") if str(f["attributes"].get("station")) == first), None)
        if st:
            d, b = dist_bearing(lat, lon, *geom_point(st))
            a = st["attributes"]
            P.add("station", f"station-{first}", "info", f"FIRST DUE: STATION {first}, {d} M",
                  f"First-run area {fr[0]['attributes'].get('firstrun')}; Station {first} at {a.get('address')} is {d} m away.", ground(d, b),
                  [ev("Firefighting_ESF_4/9", fr[0]["attributes"].get("objectid_1"), agol_url("Firefighting_ESF_4/9", "objectid_1", fr[0]["attributes"].get("objectid_1")), "2024-02-16", "first-run polygon contains the building", "SF DEM Firefighting ESF-4"),
                   ev("Firefighting_ESF_4/0", a.get("objectid"), agol_url("Firefighting_ESF_4/0", "objectid", a.get("objectid")), "2025-04-02", "station point", "SF DEM Firefighting ESF-4")])
    n = nearest("esf4_callboxes", "Firefighting_ESF_4/1", "objectid")
    if n:
        d, b, a, oid = n
        P.add("water", f"callbox-{oid}", "info", f"FIRE ALARM CALL BOX {d} M", f"Street fire alarm box at {a.get('address')}, {d} m.", ground(d, b),
              [ev("Firefighting_ESF_4/1", oid, agol_url("Firefighting_ESF_4/1", "objectid", oid), water_asof, "nearest call box", "SF DEM Firefighting ESF-4")])

    # ---- aerial / apparatus placement
    tw = feats(bdir, "trolley_wires")
    if tw:
        best = min((nearest_on_paths(lat, lon, f["geometry"]["paths"]) + (f["attributes"],) for f in tw if f.get("geometry")), key=lambda x: x[0])
        d, b, a = best
        P.add("aerial", f"trolley-{a.get('SUBSTACIR')}", "danger" if d < 40 else "caution", f"OVERHEAD TROLLEY WIRES {d} M",
              f"Muni overhead trolley wire (circuit {a.get('SUBSTACIR')}) about {d} m away: check aerial ladder placement.", ground(d, b),
              [ev("Public Works Emergency Response Layers/5", a.get("OBJECTID"), agol_url("Public Works Emergency Response Layers/5", "OBJECTID", a.get("OBJECTID")), "2021-08-16", "nearest wire vertex", "SF Public Works emergency layers")])
    for key, label in [("subsidewalk_yes", "HOLLOW SIDEWALK (BASEMENT)"), ("subsidewalk_maybe", "POSSIBLE HOLLOW SIDEWALK")]:
        n = nearest(key, "x", "FID")
        if n:
            d, b, a, oid = n
            P.add("aerial", f"{key}-{oid}", "caution", f"{label} {d} M", f"Sub-sidewalk basement recorded {d} m away: outriggers may not be supported.", ground(d, b),
                  [ev(f"ClaritiMapLayers2_WFL1/{61 if key.endswith('yes') else 60}", oid, agol_url(f"ClaritiMapLayers2_WFL1/{61 if key.endswith('yes') else 60}", "FID", oid), "2015-06-09", "nearest point", "SF Public Works")])
    trees = feats(bdir, "dpw_trees")
    if trees:
        close = [t for t in trees if geom_point(t) and dist_bearing(lat, lon, *geom_point(t))[0] <= 25]
        if close:
            sp = Counter(t["attributes"].get("LabelField", "").split(" - ")[-1] for t in close).most_common(2)
            t0 = min(close, key=lambda t: dist_bearing(lat, lon, *geom_point(t))[0])
            d, b = dist_bearing(lat, lon, *geom_point(t0))
            P.add("aerial", "trees", "info", f"{len(close)} STREET TREES AT CURB", f"{len(close)} city street trees within 25 m (" + ", ".join(s for s, _ in sp) + "): may block ladder placement.", ground(d, b),
                  [ev("ClaritiMapLayers2_WFL1/57", t0["attributes"].get("FID"), agol_url("ClaritiMapLayers2_WFL1/57", "FID", t0["attributes"].get("FID")), "2026-01-27", "trees within 25 m", "SF Public Works")])
    ug = feats(bdir, "undergrounded")
    if ug:
        a = ug[0]["attributes"]
        P.add("aerial", "undergrounded", "info", f"{a.get('ST_NAME')} {a.get('ST_TYPE')}: UTILITIES UNDERGROUNDED",
              f"Public Works lists {a.get('ST_NAME')} {a.get('ST_TYPE')} {a.get('L_F_ADD')}-{a.get('L_T_ADD')} as undergrounded (no overhead utility lines on this segment; trolley wires are separate).", ground(*nearest_on_paths(lat, lon, ug[0]["geometry"]["paths"])),
              [ev("ClaritiMapLayers2_WFL1/63", a.get("FID"), agol_url("ClaritiMapLayers2_WFL1/63", "FID", a.get("FID")), "2026-01-27", "segment within 40 m", "SF Public Works")])

    # ---- SRO (occupancy) and exposures
    SRO_LAYERS = {"sro_city": ("City_Funded_or_Operated_SROs_List_/0", "OBJECTID", "2026-01-16"), "sro_cmtl": ("CMTL_SROs/0", "OBJECTID", "2016-12-16"),
                  "sro_all": ("all_sro_point_wEHD/0", "OBJECTID", "2020-02-26")}
    for key in ("sro_city", "sro_cmtl", "sro_all"):
        if any(p["layer"] == "occupancy" and p["label"].startswith("SRO") for p in P.items):
            break
        for f in feats(bdir, key)[:1]:
            a = f["attributes"]
            oidf = next((k for k in a if k.lower() in ("objectid", "fid", "objectid_1")), "OBJECTID")
            SRO_LAYERS[key] = (SRO_LAYERS[key][0], oidf, SRO_LAYERS[key][2])
            oid = a.get(oidf)
            elev = next((a[k] for k in a if "elev" in k.lower()), None)
            rooms_k = next((a[k] for k in a if re.search(r"(room|unit)", k, re.I) and isinstance(a[k], (int, float))), None)
            P.add("occupancy", f"{key}", "danger" if str(elev).upper().startswith("N") else "caution",
                  "SRO HOTEL" + (", NO ELEVATOR" if str(elev).upper().startswith("N") else ""),
                  f"Listed on the city's SRO inventory ({key})" + (f", elevator: {elev}" if elev is not None else "") + (f", {rooms_k} rooms/units" if rooms_k else "") + ": dense sleeping occupancy.", BLDG,
                  [ev(SRO_LAYERS[key][0], oid, agol_url(SRO_LAYERS[key][0], SRO_LAYERS[key][1], oid), SRO_LAYERS[key][2], "point within 30 m", "SF city SRO layer")])
            break
    for key, layer, label, sev in [("adult_residential", "Mass_Care_Housing_Human_Services_ESF_6/2", "EXPOSURE: RESIDENTIAL CARE", "caution"),
                                   ("rcfe", "Mass_Care_Housing_Human_Services_ESF_6/5", "EXPOSURE: ELDER CARE", "caution"),
                                   ("daycare24", "Mass_Care_Housing_Human_Services_ESF_6/3", "EXPOSURE: CHILD CARE", "caution")]:
        n = nearest(key, layer, "objectid")
        if n:
            d, b, a, oid = n
            P.add("exposure", f"{key}-{oid}", sev, f"{label} {d} M", f"{a.get('factype', '').title()} at {a.get('address', '').title()}, {d} m: occupants may not self-evacuate.", ground(d, b),
                  [ev(layer, oid, agol_url(layer, "objectid", oid), "2025-10-21", "nearest within 120 m", "SF DEM ESF-6 (state licensing data)")])
    nbr_soft = [f for f in feats(bdir, "softstory_esf3") if f["attributes"].get("softstoryparcel_pts_mapblklot") != apn]
    if nbr_soft:
        P.add("exposure", "softstory-neighbors", "caution", f"{len(nbr_soft)} SOFT-STORY NEIGHBORS", f"{len(nbr_soft)} other soft-story parcels within 60 m.", ground(*dist_bearing(lat, lon, *geom_point(nbr_soft[0]))),
              [ev("Public_Works_and_Engineering_ESF_3/3", f["attributes"].get("objectid"), agol_url("Public_Works_and_Engineering_ESF_3/3", "objectid", f["attributes"].get("objectid")), "2018-03-14", "soft-story points within 60 m", "SF DEM ESF-3") for f in nbr_soft[:3]])
    for key, layer, label in [("hazmat_active", "Oil_and_Hazards_ESF_10/1", "HAZMAT FACILITY"), ("gas_stations", "Logistics_and_Fuel_ESF_7/0", "GAS STATION"), ("substations", "Water_and_Utilities_ESF_12/4", "ELECTRICAL SUBSTATION")]:
        n = nearest(key, layer, "objectid") or nearest(key, layer, "OBJECTID") or nearest(key, layer, "FID")
        if n:
            d, b, a, oid = n
            nm = a.get("name") or a.get("NAME") or a.get("facility_name") or a.get("Name") or ""
            P.add("hazmat", f"{key}-{oid}", "caution", f"{label} {d} M", f"{label.title()} {nm} {d} m away.".replace("  ", " "), ground(d, b),
                  [ev(layer, oid, agol_url(layer, "objectid", oid), "2018-09-19", "nearest within buffer", "SF DEM ESF layers")])
    evc = feats(bdir, "ev_chargers") + feats(bdir, "ev_chargeup")
    if evc:
        f = min(evc, key=lambda f: dist_bearing(lat, lon, *geom_point(f))[0])
        d, b = dist_bearing(lat, lon, *geom_point(f))
        a = f["attributes"]
        P.add("hazmat", "ev", "info", f"EV CHARGER {d} M", f"Curbside EV charging at {a.get('Street_Address') or a.get('address') or 'nearby'}, {d} m: lithium-ion vehicle fires possible.", ground(d, b),
              [ev("SF_EV_CHARGERS/0", a.get("OBJECTID") or a.get("FID") or 0, AGOL + "SF_EV_CHARGERS/FeatureServer/0", "2026-06-18", "nearest within 120 m", "SF EV charger layer")])
    frs = dload(bdir, "epa_frs").get("Results", {}) or {}
    fac = frs.get("FRSFacility") or []
    if fac:
        P.add("hazmat", "epa-frs", "info", f"{len(fac)} EPA-REGISTERED FACILITIES <160 M", f"{len(fac)} facilities in EPA's Facility Registry within 0.1 mile (mostly small waste generators); none is a confirmed hazmat store.", ground(0, 0),
              [ev("epa-frs", fac[0].get("RegistryId"), f"https://frs-public.epa.gov/ords/frs_public2/fii_query_detail.disp_program_facility?p_registry_id={fac[0].get('RegistryId')}", TODAY.isoformat(), "within 0.1 mi", "EPA Facility Registry Service")])

    # ---- ground hazards
    geo_bits = []
    if rows(bdir, "burn_1906"):
        geo_bits.append(("burn1906", "danger", "1906 FIRE BURN AREA", "This block burned in the fire after the 1906 earthquake.", "ff3a-iqhv", "DataSF 1906 fire area"))
    liq = rows(bdir, "liquefaction")
    if liq:
        geo_bits.append(("liq", "caution", f"LIQUEFACTION ZONE {liq[0].get('liq')}", f"Soil liquefaction class {liq[0].get('liq')}: higher collapse risk after a quake.", "i4t7-35u3", "DataSF liquefaction zones"))
    for f in feats(bdir, "hz_san_andreas")[:1]:
        geo_bits.append(("sanandreas", "info", f"SAN ANDREAS M7.8: INTENSITY {f['attributes'].get('value')}", f"ABAG/USGS scenario shaking intensity {f['attributes'].get('value')} here for a San Andreas M7.8.", "Explore_Hazards_WFL1/10", "CCSF hazard layers"))
    for gkey, gsev, glab, gdet, gds, gsrc in geo_bits:
        P.add("geo", gkey, gsev, glab, gdet, ground(0, 0), [ev(gds, gkey, SODA + gds + ".json" if "-" in gds else AGOL + gds, "2020-01-01", "point inside zone", gsrc)])

    # ---- calls for service near the block (last 12 months)
    calls = rows(bdir, "fire_calls")
    if calls:
        inc_ids = {}
        for c in calls:
            inc_ids.setdefault(c["incident_number"], c)
        by = Counter(c.get("call_type") for c in inc_ids.values())
        fires = by.get("Structure Fire", 0) + by.get("Structure Fire / Smoke in Building", 0)
        top = ", ".join(f"{k} {v}" for k, v in by.most_common(3))
        P.add("calls", "12mo", "info", f"{len(inc_ids)} SFFD CALLS NEAR BLOCK, 12 MO",
              f"{len(inc_ids)} dispatched incidents within 120 m in the last 12 months ({top}); structure fire / smoke calls: {fires}. Data is about 8 hours behind.", ground(0, 0),
              [ev("nuek-vuh3", c["call_number"], soda_url("nuek-vuh3", "call_number", c["call_number"]), iso(c["received_dttm"]), "within 120 m, distinct incident_number") for c in list(inc_ids.values())[:3]])

    # ---- now: wind, air, quakes, alerts
    wxd = dload(bdir, "weather")
    wx = wxd.get("current")
    if wx and wx.get("wind_direction_10m") is not None:
        wdir = wx["wind_direction_10m"]
        to = (wdir + 180) % 360
        spd, gust = wx.get("wind_speed_10m"), wx.get("wind_gusts_10m")
        hr = wxd.get("hourly") or {}
        gmax = max([g for g in hr.get("wind_gusts_10m") or [] if g is not None], default=None)
        dirs = [x for x in hr.get("wind_direction_10m") or [] if x is not None]
        shift = dirs and max(abs(((x - wdir + 180) % 360) - 180) for x in dirs) >= 45
        strong = (gust or 0) >= 25 or (gmax or 0) >= 25
        P.add("wind", "now", "caution" if strong or shift else "info", f"WIND {round(spd)} MPH FROM {compass(wdir)}, SMOKE TO {compass(to)}",
              f"Model wind at {str(wx.get('time')).replace('T', ' ')} local: {spd} mph from the {compass(wdir)} ({wdir} deg), gusts {gust} mph, humidity {wx.get('relative_humidity_2m')}%. "
              f"Smoke and fire spread push toward the {compass(to)}: that side is the exposure." + (f" Next 6 h: gusts up to {gmax} mph" if gmax else "")
              + ("; direction shifts by 45 deg or more." if shift else ".") + " Forecast model, not a station reading.",
              ground(30, to), [ev("open-meteo", wx.get("time"), "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph" % (round(lat, 4), round(lon, 4)), str(wx.get("time"))[:10], "model forecast at the centroid; anchor points downwind", "Open-Meteo")])
    elif not wx:
        unknowns.append("Wind: weather service did not answer at build time")
    aq = dload(bdir, "air_quality").get("current")
    if aq:
        P.add("air", "aqi", "info", f"AIR QUALITY AQI {aq.get('us_aqi')}", f"Open-Meteo US AQI {aq.get('us_aqi')}, PM2.5 {aq.get('pm2_5')} ug/m3 at {aq.get('time')}.", ground(0, 0),
              [ev("open-meteo-aq", aq.get("time"), "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=%s&longitude=%s&current=us_aqi" % (round(lat, 4), round(lon, 4)), str(aq.get("time"))[:10], "model at the centroid", "Open-Meteo")])
    alerts = dload(bdir, "nws_alerts").get("features") or []
    for a in alerts[:2]:
        pr = a.get("properties", {})
        P.add("wind", f"nws-{pr.get('id', '')[-8:]}", "danger" if "Red Flag" in pr.get("event", "") else "caution", pr.get("event", "WEATHER ALERT"), pr.get("headline", ""), ground(0, 0),
              [ev("nws", pr.get("id"), pr.get("@id") or "https://api.weather.gov/alerts/active", str(pr.get("sent"))[:10], "alert polygon contains point", "National Weather Service")])
    for q in (dload(bdir, "earthquakes").get("features") or [])[:1]:
        pr = q["properties"]
        if pr.get("mag", 0) >= 3.5:
            P.add("geo", "quake", "caution", f"M{pr['mag']} QUAKE THIS WEEK", f"USGS: M{pr['mag']} {pr['place']} on {iso(pr['time'])}.", ground(0, 0),
                  [ev("usgs", q["id"], pr.get("url"), iso(pr["time"]), "within 50 km, last 7 days", "USGS")])

    # ---- OSM entrance (crowd-sourced, low confidence)
    osm = dload(bdir, "osm").get("elements") or []
    for e in osm:
        t = e.get("tags", {})
        if "entrance" in t and "lat" in e:
            d, b = dist_bearing(lat, lon, e["lat"], e["lon"])
            P.add("aerial", f"osm-entrance-{e['id']}", "info", f"ENTRANCE ({t.get('entrance').upper()}) {d} M",
                  f"OpenStreetMap volunteers mapped a {t.get('entrance')} entrance here; not an official record, verify on arrival.", ground(d, b),
                  [ev("osm", e["id"], f"https://www.openstreetmap.org/node/{e['id']}", TODAY.isoformat(), "OSM node within 40 m", "© OpenStreetMap contributors")])
            break

    # ---- unknowns (no public record exists for these)
    unknowns += [
        "Stair count and locations: no public floor plans",
        "Standpipe and FDC locations: no public record",
        "Roof access and roof construction: no public record",
        "Interior layout and exact units per floor: permits give a lower bound only",
        "Gas and electric shutoff locations: not public",
        "Knox box: no public dataset",
    ]
    if not any(p["layer"] == "softstory" for p in P.items) and 3 <= floors <= 7 and residential:
        unknowns.append("Soft-story status: not on the city list")
    if not rows(bdir, "fire_permits"):
        unknowns.append("Battery storage, hazmat or tanks: no SFFD fire permit at this address (absence of a permit is not proof of absence)")

    # ---- resolution
    def link(ds, method, key, conf, recs, example):
        if recs:
            links.append({"datasetId": ds, "method": method, "key": key, "confidence": conf, "records": recs, "example": example})

    def ex(rs, *fields):
        for r in rs:
            for f in fields:
                if r.get(f):
                    return str(r[f]) if not isinstance(r[f], dict) else json.dumps(r[f])
        return ""

    link("wv5m-vpq2", "apn", f"{blk}/{lot}", "exact", len(ass), loc or apn)
    link("i98e-djp9", "apn", f"{blk}/{lot}", "exact", len(permits), permit_addr or "")
    link("tyz3-vt28", "apn", apn, "exact", len(rows(bdir, "permitsf")), ex(rows(bdir, "permitsf"), "streetno") + " " + ex(rows(bdir, "permitsf"), "streetname"))
    for k, ds in [("electrical", "ftty-kx6y"), ("plumbing", "a6aw-rudh"), ("boiler", "5dp4-gtxk"), ("dbi_complaints", "gm2e-bten"), ("dbi_nov", "nbtm-fbw5"), ("sec604", "75h8-2zhw"), ("softstory_padded", "beah-shgi")]:
        rs = rows(bdir, k)
        link(ds, "apn", f"{blk}/{lot}", "exact", len(rs), ex(rs, "street_number", "property_address", "street_number_low") + " " + ex(rs, "street_name"))
    link("ynuv-fyni", "apn", f"mblr SF{apn}", "exact", len(fp), f"SF{apn}")
    link("4zuq-2cbe", "eas", f"eas {res['eas_baseid']}", "exact", len(viol), ex(viol, "address"))
    for k, ds, m in [("fire_incidents", "wr8u-xric", 25), ("fire_inspections", "wb4c-6hwj", 15), ("fire_complaints", "2wsq-7wmv", 20), ("fire_permits", "893e-xam6", 30)]:
        rs = rows(bdir, k)
        addrs = Counter(r.get("address") or r.get("permit_address") for r in rs)
        link(ds, "address_norm", f"address '{res['address_like'].rstrip('%')}*' or within {m} m", "high", len(rs), ", ".join(a for a, _ in addrs.most_common(3) if a))
    link("nuek-vuh3", "spatial", "within 120 m (block-level points)", "low", len(calls), ex(calls, "address"))
    aliases = sorted({a for a in [res.get("address"), assessor_addr, permit_addr, ex(rows(bdir, "historic"), "name").upper()] + tall_alias if a}, key=len)

    # ---- layer status for the sources drawer
    layers = []
    for k, m in man["sources"].items():
        if k in ("footprint_pt", "softstory"):
            continue
        layers.append({"layer": k, "status": m["status"], "ms": m["ms"], "datasetId": m["datasetId"], "source": m["source"], "records": m["records"],
                       # a failed fetch claims no date; refresh.py carries the last good layer forward
                       "asOf": (newest_record_date(bdir, k) or man["fetchedAt"][:10]) if m["status"] != "fetch_failed" else None,
                       "fetchedAt": man["fetchedAt"][:10],
                       "lastGoodAt": man["fetchedAt"][:10] if m["status"] != "fetch_failed" else None})

    # ---- order: danger first, then caution, then info
    sev_rank = {"danger": 0, "caution": 1, "info": 2}
    pins = sorted(P.items, key=lambda p: (sev_rank[p["severity"]], p["id"]))  # deterministic for refresh diffs
    addr_disp = (res.get("address") or "").title().replace(" Av", " Ave").replace("Avee", "Ave")
    building = {
        "id": bid, "apn": apn, "address": addr_disp,
        "centroid": {"lat": round(clat, 7), "lon": round(clon, 7)},
        "footprint": footprint, "heightM": height, "floors": floors, "floorHeightM": round(height / floors, 2),
        "yearBuilt": year_built, "constructionType": construction, "units": units, "rooms": rooms, "use": use,
        "pins": pins, "conflicts": conflicts, "unknowns": unknowns, "layers": layers,
        "resolution": {"apn": apn, "easBaseId": res.get("eas_baseid"), "aliases": aliases, "links": links},
        "fetchedAt": man["fetchedAt"],
        "meta": {"footprintAsOf": fp_asof, "heightSource": "2010 LiDAR (hgt_median_m)", "footprintAreaM2": round(area_m2),
                 "sourcesQueried": len(man["sources"]), "sourcesWithRecords": sum(1 for m in man["sources"].values() if m["status"] == "ok"),
                 "fetchWallMs": man.get("wallMs")},
    }
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, bid + ".json")
    if os.path.exists(out):  # keep Lane C's precomputed brief/answers across rebuilds
        prev = json.load(open(out, encoding="utf-8"))
        if prev.get("fallback"):
            building["fallback"] = prev["fallback"]
    building["meta"]["lotAreaM2"] = round(num(a0.get("lot_area")) * 0.0929) if num(a0.get("lot_area")) else None
    building["meta"]["buildingAreaM2"] = round(num(a0.get("property_area")) * 0.0929) if num(a0.get("property_area")) else None
    json.dump(building, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"{bid}: {floors} floors, {height} m, {len(pins)} pins ({Counter(p['severity'] for p in pins)}), {len(conflicts)} conflicts, {len(links)} links -> {out}")
    return building


if __name__ == "__main__":
    for b in sys.argv[1:] or ["sf-3722080", "sf-0874003", "sf-3703081", "sf-1244030"]:
        build(b)
