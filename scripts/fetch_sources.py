"""Pull every public source we know about for one SF building into data/raw/sf-<apn>/.

Usage: python -I scripts/fetch_sources.py 400 DUBOCE
Writes one JSON per source plus manifest.json (status, ms, rows, url, asOf hints).
Personal fields (names, phones, emails, inspectors, owners) are dropped before anything is saved.
"""
import concurrent.futures as cf
import json
import math
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import certifi

CTX = ssl.create_default_context(cafile=certifi.where())
UA = "firesight-hack/0.2 (super{set} hackathon, Lane B)"
SODA = "https://data.sf.gov/resource/"
AGOL = "https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "raw")

PERSONAL = re.compile(
    r"(phone|e_?mail|contact|manager|owner|holder|inspector|taken_by|changed_by|cancelled_by|"
    r"checked_by|mailing|mail_|applicant|licensee|first_?name|last_?name|\bfax\b|website|"
    r"plan_checked|ownership|dba_name_associated|administrator|created_user|last_edited_user|creator|editor|^inspector$)",
    re.I,
)


def scrub(obj):
    if isinstance(obj, list):
        return [scrub(x) for x in obj]
    if isinstance(obj, dict):
        if set(obj) >= {"name", "type", "alias"} and PERSONAL.search(str(obj.get("name"))):
            return None  # ArcGIS field definition for a personal column
        out = {k: scrub(v) for k, v in obj.items() if not PERSONAL.search(k)}
        if isinstance(out.get("fields"), list):
            out["fields"] = [f for f in out["fields"] if f is not None]
        return out
    return obj


def http(url, data=None, timeout=40):
    t = time.time()
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
            body, st = r.read(), r.status
    except urllib.error.HTTPError as e:
        body, st = e.read(), e.code
    except Exception as e:  # timeouts, DNS, TLS
        return 0, round((time.time() - t) * 1000), f"{type(e).__name__}: {e}"
    ms = round((time.time() - t) * 1000)
    try:
        return st, ms, json.loads(body)
    except Exception:
        return st, ms, body[:300].decode("utf-8", "replace")


def soda(ds, where=None, order=None, limit=200, select=None, extra=None):
    p = {"$limit": limit}
    if where:
        p["$where"] = where
    if order:
        p["$order"] = order
    if select:
        p["$select"] = select
    if extra:
        p.update(extra)
    return SODA + ds + ".json?" + urllib.parse.urlencode(p)


def agol(service, layer, lon, lat, dist=None, extra=""):
    p = {
        "geometry": f"{lon},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": 4326,
        "outSR": 4326,
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "true" if dist else "false",  # point-in-zone queries only need attributes
        "geometryPrecision": 6,
        "f": "json",
    }
    if dist:
        p.update({"distance": dist, "units": "esriSRUnit_Meter"})
    return AGOL + urllib.parse.quote(service) + f"/FeatureServer/{layer}/query?" + urllib.parse.urlencode(p) + extra


def resolve(num, street):
    st, ms, rows = http(soda("3mea-di5p", f"address_number={int(num)} and upper(street_name)='{street.upper()}'", limit=50))
    if not isinstance(rows, list) or not rows:
        sys.exit(f"EAS lookup failed: {st} {rows}")
    r = rows[0]
    return {
        "apn": r["parcel_number"],
        "block": r["parcel_number"][:4],
        "lot": r["parcel_number"][4:],
        "eas_baseid": r["eas_baseid"],
        "lat": float(r["latitude"]),
        "lon": float(r["longitude"]),
        "address": r.get("address"),
        "eas_rows": rows,
        "eas_ms": ms,
        "address_like": f"{int(num)} {street.upper().split()[0]}%",
    }


def sources(b):
    apn, blk, lot, lat, lon, eas = b["apn"], b["block"], b["lot"], b["lat"], b["lon"], b["eas_baseid"]
    lot_np = str(int(lot)) if lot.isdigit() else lot.lstrip("0")
    apn_slash = f"{blk}/{lot}"
    pt = f"'POINT ({lon} {lat})'"
    addr = b["address_like"]  # e.g. "400 DUBOCE%": city fire datasets store free-text addresses
    near = lambda col, m: f"(upper(address) like '{addr}' or within_circle({col},{lat},{lon},{m}))"
    S = {}
    # --- DataSF: the building itself --------------------------------------------------
    S["assessor"] = ("wv5m-vpq2", "Assessor secured property tax roll", soda("wv5m-vpq2", f"parcel_number='{apn}'", "closed_roll_year desc", 3))
    S["footprint"] = ("ynuv-fyni", "Building footprints + 2010 LiDAR heights", soda("ynuv-fyni", f"mblr='SF{apn}'", limit=5))
    S["footprint_pt"] = ("ynuv-fyni", "Building footprints (point fallback)", soda("ynuv-fyni", f"intersects(shape,{pt})", limit=3))
    S["landuse"] = ("c5ge-t6pj", "Land use (residential units by parcel)", soda("c5ge-t6pj", f"mapblklot='{apn}'", limit=5, select="mapblklot,resunits,resunits_s,cie,med,mips,retail,pdr,visitor,total_comm,residentia,geography_type,data_as_of"))
    S["historic"] = ("3tsw-4idn", "Historic resource status by parcel", soda("3tsw-4idn", f"intersects(the_geom,{pt})", limit=5, select="apn,name,lowstnum,highstnum,stname,sttype,ceqacode,ceqacodea10a11,ceqacodereason,yearbuilt,data_as_of"))
    S["energy"] = ("96ck-qcfe", "Existing buildings energy performance", soda("96ck-qcfe", f"parcel_number='{apn_slash}'", "benchmark_year desc", 3))
    S["tall_building"] = ("5kya-mfst", "Tall building inventory", soda("5kya-mfst", f"mapblocklot='{apn}'", limit=5))
    S["rentboard"] = ("gdc7-dmcn", "Rent Board housing inventory (block level)", soda("gdc7-dmcn", f"block_num='{blk}'", "submission_year desc", 300))
    S["zoning_height"] = ("h9wh-cg3m", "Zoning height and bulk district", soda("h9wh-cg3m", f"intersects(the_geom,{pt})", limit=3, select="height,gen_hght"))
    # --- DataSF: permits and building history ------------------------------------------
    S["permits"] = ("i98e-djp9", "DBI building permits (legacy)", soda("i98e-djp9", f"block='{blk}' and lot='{lot}'", "filed_date desc", 500))
    S["permitsf"] = ("tyz3-vt28", "PermitSF permits (new system)", soda("tyz3-vt28", f"parcel_number='{apn}'", "submitted_date desc", 200))
    S["electrical"] = ("ftty-kx6y", "Electrical permits", soda("ftty-kx6y", f"block='{blk}' and lot='{lot}'", "filed_date desc", 300))
    S["plumbing"] = ("a6aw-rudh", "Plumbing permits", soda("a6aw-rudh", f"block='{blk}' and lot='{lot}'", "filed_date desc", 300))
    S["boiler"] = ("5dp4-gtxk", "Boiler permits", soda("5dp4-gtxk", f"block='{blk}' and lot='{lot}'", "application_date desc", 100))
    S["sec604"] = ("75h8-2zhw", "Section 604 elevated elements affidavits", soda("75h8-2zhw", f"block='{blk}' and lot='{lot}'", limit=50))
    S["building_inspections"] = ("vckc-dh2h", "DBI building inspections", soda("vckc-dh2h", f"block='{blk}' and lot='{lot}'", "scheduled_date desc", 200))
    S["dbi_complaints"] = ("gm2e-bten", "DBI complaints (all divisions)", soda("gm2e-bten", f"block='{blk}' and lot='{lot}'", "date_filed desc", 300))
    S["dbi_nov"] = ("nbtm-fbw5", "DBI notices of violation", soda("nbtm-fbw5", f"block='{blk}' and lot='{lot}'", "date_filed desc", 300))
    S["softstory"] = ("beah-shgi", "Soft-story program list", soda("beah-shgi", f"block='{blk}' and lot='{lot_np}'", limit=10))
    S["softstory_padded"] = ("beah-shgi", "Soft-story program list (padded lot)", soda("beah-shgi", f"block='{blk}' and lot='{lot}'", limit=10))
    # --- DataSF: fire department -----------------------------------------------------
    S["fire_incidents"] = ("wr8u-xric", "SFFD fire incidents", soda("wr8u-xric", near("point", 25), "incident_date desc", 300))
    S["fire_violations"] = ("4zuq-2cbe", "SFFD fire code violations", soda("4zuq-2cbe", f"starts_with(eas_id,'{eas}-')", "violation_date desc", 200))
    S["fire_inspections"] = ("wb4c-6hwj", "SFFD fire inspections", soda("wb4c-6hwj", near("location", 15), "inspection_start_date desc", 200))
    S["fire_permits"] = ("893e-xam6", "SFFD fire permits (ESS, tanks, hazmat, ERRCS)", soda("893e-xam6", f"(upper(permit_address) like '{addr}' or within_circle(location,{lat},{lon},30))", "permit_application_date desc", 100))
    S["fire_complaints"] = ("2wsq-7wmv", "SFFD fire safety complaints", soda("2wsq-7wmv", near("location", 20), "received_date desc", 200))
    S["fire_calls"] = ("nuek-vuh3", "SFFD/EMS dispatched calls near the block", soda("nuek-vuh3", f"within_circle(case_location,{lat},{lon},120) and received_dttm > '2025-10-22'", "received_dttm desc", 1000, select="call_number,incident_number,call_type,call_type_group,received_dttm,on_scene_dttm,response_dttm,address,unit_type,number_of_alarms,station_area,battalion"))
    # --- DataSF: around the building --------------------------------------------------
    S["burn_1906"] = ("ff3a-iqhv", "Area burned after the 1906 earthquake", soda("ff3a-iqhv", f"intersects(geometry,{pt})", limit=2, select="id,objectid"))
    S["liquefaction"] = ("i4t7-35u3", "Soil liquefaction hazard zone", soda("i4t7-35u3", f"intersects(the_geom,{pt})", limit=2, select="liq"))
    S["schools"] = ("7e7j-59qk", "Schools within 150 m", soda("7e7j-59qk", f"within_circle(point,{lat},{lon},150)", limit=20))
    S["storm_inlets"] = ("jtgq-b7c5", "Storm drain inlets within 60 m (runoff path)", soda("jtgq-b7c5", f"within_circle(location,{lat},{lon},60)", limit=50))
    S["entertainment"] = ("86e8-rfem", "Places of entertainment within 60 m", soda("86e8-rfem", f"within_circle(point,{lat},{lon},60)", limit=20))
    S["businesses"] = ("g8m3-pdis", "Registered businesses at the address (counts/types only)", soda("g8m3-pdis", f"within_circle(location,{lat},{lon},25) and location_end_date IS NULL", limit=200, select="uniqueid,full_business_address,self_reported_naics_code,lic_code_description,location_start_date,administratively_closed,location", extra=None))
    S["police_calls"] = ("gnap-fj3t", "SFPD calls near the corner (count only)", soda("gnap-fj3t", f"within_circle(intersection_point,{lat},{lon},80)", "received_datetime desc", 200, select="cad_number,received_datetime,call_type_final_desc,priority_final,sensitive_call"))
    # --- SF DEM / CCSF ArcGIS: firefighting and hazards --------------------------------
    S["esf4_stations"] = ("Firefighting_ESF_4/0", "SF DEM fire stations", agol("Firefighting_ESF_4", 0, lon, lat, 2500))
    S["esf4_cisterns"] = ("Firefighting_ESF_4/2", "SF DEM cisterns", agol("Firefighting_ESF_4", 2, lon, lat, 400))
    S["esf4_hydrants_hp"] = ("Firefighting_ESF_4/3", "SF DEM AWSS high-pressure hydrants", agol("Firefighting_ESF_4", 3, lon, lat, 300))
    S["esf4_hydrants_lp"] = ("Firefighting_ESF_4/4", "SF DEM low-pressure hydrants", agol("Firefighting_ESF_4", 4, lon, lat, 150))
    S["esf4_callboxes"] = ("Firefighting_ESF_4/1", "SF DEM fire alarm call boxes", agol("Firefighting_ESF_4", 1, lon, lat, 200))
    S["esf4_first_run"] = ("Firefighting_ESF_4/9", "First-run station boundary", agol("Firefighting_ESF_4", 9, lon, lat))
    S["esf4_battalion"] = ("Firefighting_ESF_4/6", "Fire battalion", agol("Firefighting_ESF_4", 6, lon, lat))
    S["trolley_wires"] = ("Public Works Emergency Response Layers/5", "Muni overhead trolley wires", agol("Public Works Emergency Response Layers", 5, lon, lat, 100))
    S["subsidewalk_yes"] = ("ClaritiMapLayers2_WFL1/61", "Sub-sidewalk basements (confirmed)", agol("ClaritiMapLayers2_WFL1", 61, lon, lat, 100))
    S["subsidewalk_maybe"] = ("ClaritiMapLayers2_WFL1/60", "Sub-sidewalk basements (maybe)", agol("ClaritiMapLayers2_WFL1", 60, lon, lat, 100))
    S["dpw_trees"] = ("ClaritiMapLayers2_WFL1/57", "DPW-maintained street trees", agol("ClaritiMapLayers2_WFL1", 57, lon, lat, 40))
    S["undergrounded"] = ("ClaritiMapLayers2_WFL1/63", "Undergrounded streets (no overhead utility wires)", agol("ClaritiMapLayers2_WFL1", 63, lon, lat, 40))
    S["sro_city"] = ("City_Funded_or_Operated_SROs_List_/0", "City SRO list (elevator flag)", agol("City_Funded_or_Operated_SROs_List_", 0, lon, lat, 30))
    S["sro_cmtl"] = ("CMTL_SROs/0", "SRO unit counts (2016)", agol("CMTL_SROs", 0, lon, lat, 30))
    S["sro_all"] = ("all_sro_point_wEHD/0", "All SROs (2020)", agol("all_sro_point_wEHD", 0, lon, lat, 30))
    S["adult_residential"] = ("Mass_Care_Housing_Human_Services_ESF_6/2", "Adult residential facilities nearby", agol("Mass_Care_Housing_Human_Services_ESF_6", 2, lon, lat, 120))
    S["rcfe"] = ("Mass_Care_Housing_Human_Services_ESF_6/5", "Residential care for the elderly nearby", agol("Mass_Care_Housing_Human_Services_ESF_6", 5, lon, lat, 120))
    S["daycare24"] = ("Mass_Care_Housing_Human_Services_ESF_6/3", "24-hour day care nearby", agol("Mass_Care_Housing_Human_Services_ESF_6", 3, lon, lat, 120))
    S["schools_esf6"] = ("Mass_Care_Housing_Human_Services_ESF_6/1", "Schools (ESF-6) nearby", agol("Mass_Care_Housing_Human_Services_ESF_6", 1, lon, lat, 150))
    S["hazmat_active"] = ("Oil_and_Hazards_ESF_10/1", "Active hazmat facilities", agol("Oil_and_Hazards_ESF_10", 1, lon, lat, 200))
    S["contaminated_land"] = ("Oil_and_Hazards_ESF_10/0", "Contaminated land cleanups", agol("Oil_and_Hazards_ESF_10", 0, lon, lat, 200))
    S["gas_stations"] = ("Logistics_and_Fuel_ESF_7/0", "Gas stations nearby", agol("Logistics_and_Fuel_ESF_7", 0, lon, lat, 300))
    S["generators"] = ("Water_and_Utilities_ESF_12/0", "Registered generators nearby", agol("Water_and_Utilities_ESF_12", 0, lon, lat, 200))
    S["substations"] = ("Water_and_Utilities_ESF_12/4", "Electrical substations nearby", agol("Water_and_Utilities_ESF_12", 4, lon, lat, 400))
    S["gas_pipeline"] = ("Water_and_Utilities_ESF_12/5", "Natural gas pipelines (national scale)", agol("Water_and_Utilities_ESF_12", 5, lon, lat, 300))
    S["medical"] = ("Health_and_Medical_ESF_8/0", "Medical facilities nearby", agol("Health_and_Medical_ESF_8", 0, lon, lat, 300))
    S["hospitals"] = ("SF_HOSPITALS/0", "Hospitals within 3 km", agol("SF_HOSPITALS", 0, lon, lat, 3000))
    S["helipads"] = ("Transportation_ESF_1/7", "Hospital helipads within 3 km", agol("Transportation_ESF_1", 7, lon, lat, 3000))
    S["priority_routes"] = ("Transportation_ESF_1/10", "Priority (emergency) routes", agol("Transportation_ESF_1", 10, lon, lat, 120))
    S["traffic_cams"] = ("Transportation_ESF_1/9", "Caltrans traffic cameras within 1.5 km", agol("Transportation_ESF_1", 9, lon, lat, 1500))
    S["muni_metro"] = ("Transportation_ESF_1/4", "Muni Metro light rail lines nearby", agol("Transportation_ESF_1", 4, lon, lat, 120))
    S["softstory_esf3"] = ("Public_Works_and_Engineering_ESF_3/3", "Soft-story parcels nearby (exposures)", agol("Public_Works_and_Engineering_ESF_3", 3, lon, lat, 60))
    S["ev_chargers"] = ("SF_EV_CHARGERS/0", "EV chargers nearby", agol("SF_EV_CHARGERS", 0, lon, lat, 120))
    S["ev_chargeup"] = ("ChargeUp_SF_(view)/0", "ChargeUp SF curbside chargers", agol("ChargeUp_SF_(view)", 0, lon, lat, 120))
    S["installed_solar"] = ("Installed _Solar/0", "Installed solar (city layer)", agol("Installed _Solar", 0, lon, lat, 30))
    S["solar_potential"] = ("Solar_Potential/0", "Rooftop solar potential", agol("Solar_Potential", 0, lon, lat, 10))
    S["cooking_fires"] = ("cooking_fires_19/0", "Cooking fire locations (city analysis)", agol("cooking_fires_19", 0, lon, lat, 60))
    S["hz_tsunami"] = ("Explore_Hazards_WFL1/9", "Tsunami inundation zone", agol("Explore_Hazards_WFL1", 9, lon, lat))
    S["hz_landslide"] = ("Explore_Hazards_WFL1/11", "Landslide hazard zone", agol("Explore_Hazards_WFL1", 11, lon, lat))
    S["hz_san_andreas"] = ("Explore_Hazards_WFL1/10", "San Andreas M7.8 shaking scenario", agol("Explore_Hazards_WFL1", 10, lon, lat))
    S["hz_hayward"] = ("Explore_Hazards_WFL1/12", "Hayward M7.0 shaking scenario", agol("Explore_Hazards_WFL1", 12, lon, lat))
    S["hz_liquefaction"] = ("Explore_Hazards_WFL1/13", "Soil liquefaction hazard (Explore Hazards)", agol("Explore_Hazards_WFL1", 13, lon, lat))
    S["hz_flood"] = ("Explore_Hazards_WFL1/4", "100-year storm flood risk", agol("Explore_Hazards_WFL1", 4, lon, lat))
    S["hz_heat"] = ("Explore_Hazards_WFL1/2", "Heat vulnerability index", agol("Explore_Hazards_WFL1", 2, lon, lat))
    S["hz_air"] = ("Explore_Hazards_WFL1/0", "Air pollutant exposure zone", agol("Explore_Hazards_WFL1", 0, lon, lat))
    S["hz_wildfire"] = ("Wildfire_Hazard_2025/0", "Wildfire hazard 2025", agol("Wildfire_Hazard_2025", 0, lon, lat))
    S["hz_reservoir"] = ("Explore_Hazards_WFL1/8", "Reservoir inundation hazard", agol("Explore_Hazards_WFL1", 8, lon, lat))
    # --- Beyond the city ----------------------------------------------------------------
    S["weather"] = ("open-meteo", "Open-Meteo current conditions", "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "timezone": "America/Los_Angeles", "wind_speed_unit": "mph", "temperature_unit": "fahrenheit",
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,precipitation,cloud_cover",
        "hourly": "wind_speed_10m,wind_direction_10m,wind_gusts_10m", "forecast_hours": 6, "daily": "sunrise,sunset", "forecast_days": 1}))
    S["air_quality"] = ("open-meteo-aq", "Open-Meteo air quality", "https://air-quality-api.open-meteo.com/v1/air-quality?" + urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "current": "us_aqi,pm2_5,pm10,carbon_monoxide"}))
    S["nws_alerts"] = ("nws", "NWS active alerts at the point", f"https://api.weather.gov/alerts/active?point={lat:.4f},{lon:.4f}")
    S["earthquakes"] = ("usgs", "USGS earthquakes M2+ within 50 km, last 7 days", "https://earthquake.usgs.gov/fdsnws/event/1/query?" + urllib.parse.urlencode({
        "format": "geojson", "latitude": lat, "longitude": lon, "maxradiuskm": 50, "minmagnitude": 2, "orderby": "time",
        "starttime": time.strftime("%Y-%m-%d", time.gmtime(time.time() - 7 * 86400))}))
    S["epa_frs"] = ("epa-frs", "EPA FRS regulated facilities within 0.1 mi", "https://frs-public.epa.gov/ords/frs_public2/frs_rest_services.get_facilities?" + urllib.parse.urlencode({
        "latitude83": lat, "longitude83": lon, "search_radius": 0.1, "output": "JSON"}))
    S["wikipedia"] = ("wikipedia", "Wikipedia articles within 300 m", "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": 300, "gslimit": 20, "format": "json"}))
    S["sanborn"] = ("loc-sanborn", "Library of Congress Sanborn fire insurance maps, San Francisco", "https://www.loc.gov/collections/sanborn-maps/?" + urllib.parse.urlencode({
        "fa": "location_city:san francisco", "fo": "json", "c": 50, "at": "results"}))
    S["osm"] = ("osm-overpass", "OpenStreetMap building, entrances and access tags", None)  # POST, handled below
    return S


CRITICAL = {"footprint", "footprint_pt", "assessor", "permits"}  # the model and header depend on these


def overpass(lat, lon):
    q = f"""[out:json][timeout:50];
(way(around:15,{lat},{lon})["building"];
 node(around:40,{lat},{lon})["entrance"];
 node(around:60,{lat},{lon})["emergency"];
 node(around:60,{lat},{lon})["highway"="street_lamp"];
 way(around:60,{lat},{lon})["highway"];);
out tags center;"""
    return http("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode(), timeout=70)


def count(d):
    if isinstance(d, list):
        return len(d)
    if isinstance(d, dict):
        if "features" in d:
            return len(d["features"])
        if "elements" in d:
            return len(d["elements"])
        if "query" in d and "geosearch" in d["query"]:
            return len(d["query"]["geosearch"])
        if "results" in d:
            return len(d["results"])
        if "Results" in d:
            return len((d["Results"] or {}).get("FRSFacility", []) or [])
        return 1
    return 0


def main():
    num, street = sys.argv[1], " ".join(sys.argv[2:]).upper()
    b = resolve(num, street)
    bid = "sf-" + b["apn"]
    out = os.path.normpath(os.path.join(ROOT, bid))
    os.makedirs(out, exist_ok=True)
    print(bid, b["address"], b["lat"], b["lon"], "eas", b["eas_baseid"])
    json.dump(scrub(b), open(os.path.join(out, "_resolve.json"), "w"), indent=1)
    S = sources(b)

    def run(k):
        ds, name, url = S[k]
        if k == "osm":
            st, ms, d = overpass(b["lat"], b["lon"])
            url = "https://overpass-api.de/api/interpreter (POST, see fetch_sources.py)"
        else:
            st, ms, d = http(url)
            if k in CRITICAL and (st != 200 or not isinstance(d, list) or not d):  # slow sources time out in CI: retry once
                time.sleep(3)
                st, ms2, d = http(url, timeout=90)
                ms += ms2
        return k, ds, name, url, st, ms, d

    t0 = time.time()
    manifest = {"building": bid, "query": f"{num} {street}", "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "sources": {}}
    with cf.ThreadPoolExecutor(16) as ex:
        for k, ds, name, url, st, ms, d in ex.map(run, S):
            ok = st == 200 and not (isinstance(d, dict) and "error" in d) and not isinstance(d, str)
            n = count(d) if ok else 0
            status = "fetch_failed" if not ok else ("no_records" if n == 0 else "ok")
            manifest["sources"][k] = {"datasetId": ds, "source": name, "status": status, "records": n, "ms": ms, "http": st, "url": url,
                                      "error": None if ok else (d if isinstance(d, str) else json.dumps(d)[:300])}
            json.dump(scrub(d), open(os.path.join(out, k + ".json"), "w", encoding="utf-8"), indent=1, default=str)
            print(f"{status:12} {n:5} {ms:6}ms  {k:20} {name}")
    manifest["wallMs"] = round((time.time() - t0) * 1000)
    json.dump(manifest, open(os.path.join(out, "manifest.json"), "w", encoding="utf-8"), indent=1)
    okc = sum(1 for v in manifest["sources"].values() if v["status"] == "ok")
    print(f"\n{okc}/{len(S)} sources with records, wall {manifest['wallMs']} ms -> {out}")


if __name__ == "__main__":
    main()
