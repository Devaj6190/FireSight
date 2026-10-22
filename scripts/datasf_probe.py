import ssl, certifi
CTX=ssl.create_default_context(cafile=certifi.where())
import json, time, urllib.request, urllib.parse, sys, concurrent.futures as cf
B="https://data.sf.gov/resource/"
def q(ds, params, base=B):
    url = base+ds+".json?"+urllib.parse.urlencode(params) if ds else base
    t=time.time()
    req=urllib.request.Request(url, headers={"User-Agent":"firesight-hack/0.1 (vidyut hackathon)","Accept":"application/json, application/geo+json"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            body=r.read(); st=r.status
    except urllib.error.HTTPError as e:
        body=e.read(); st=e.code
    return st, round((time.time()-t)*1000), json.loads(body) if body[:1] in b'[{' else body[:200]
num, street = sys.argv[1], sys.argv[2]   # e.g. 1018 MISSION
st,ms,eas = q("3mea-di5p", {"$where":f"address_number={num} and upper(street_name)='{street}'"})
print("EAS",st,ms,json.dumps(eas)[:700])
apn = eas[0]["parcel_number"]; blk, lot = apn[:4], apn[4:]
lat, lon = float(eas[0]["latitude"]), float(eas[0]["longitude"])
print("APN",apn,blk,lot,lat,lon)
like = f"{num} {street.title()}%"
calls = {
 "assessor": ("wv5m-vpq2", {"parcel_number":apn,"$order":"closed_roll_year desc","$limit":1}),
 "permits": ("i98e-djp9", {"$where":f"block='{blk}' and lot='{lot}'","$order":"filed_date desc","$limit":200}),
 "dbi_complaints": ("gm2e-bten", {"$where":f"block='{blk}' and lot='{lot}'","$order":"date_filed desc","$limit":100}),
 "dbi_nov": ("nbtm-fbw5", {"$where":f"block='{blk}' and lot='{lot}'","$order":"date_filed desc","$limit":100}),
 "fire_inspections": ("wb4c-6hwj", {"$where":f"upper(address) like '{num} {street}%'","$order":"inspection_start_date desc","$limit":50}),
 "fire_violations": ("4zuq-2cbe", {"$where":f"upper(address) like '{num} {street}%'","$order":"violation_date desc","$limit":50}),
 "fire_incidents": ("wr8u-xric", {"$where":f"upper(address) like '{num} {street}%'","$order":"incident_date desc","$limit":50}),
 "calls_for_service": ("nuek-vuh3", {"$where":f"upper(address) like '{num} BLOCK OF {street}%' or upper(address) like '{num} {street}%'","$order":"received_dttm desc","$limit":50}),
 "soft_story": ("beah-shgi", {"parcel_number":apn}),
 "footprint": ("ynuv-fyni", {"$where":f"intersects(shape,'POINT ({lon} {lat})')","$limit":3}),
}
def run(k):
    ds,p=calls[k]; return k,q(ds,p)
t0=time.time()
with cf.ThreadPoolExecutor(12) as ex:
    res=dict(ex.map(run, calls))
print("FANOUT_WALL_MS", round((time.time()-t0)*1000))
for k,(st,ms,d) in res.items():
    n=len(d) if isinstance(d,list) else 'ERR'
    print(f"\n### {k} status={st} ms={ms} rows={n}")
    print(json.dumps(d[:2] if isinstance(d,list) else d, default=str)[:900])
json.dump({k:v[2] for k,v in res.items()}, open(sys.argv[3],"w"), default=str)
