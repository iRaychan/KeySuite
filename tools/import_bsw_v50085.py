"""Import the complete approved BSW V1.3 workbook; no production writes."""
import sys, json, re, hashlib, zipfile
from pathlib import Path
from openpyxl import load_workbook
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).resolve()
with zipfile.ZipFile(Path(sys.argv[2]).resolve()) as z:
 raw=z.read('bsw-data-v50027.js').decode()
 old_data=json.JSONDecoder().raw_decode(raw.split('const data=',1)[1])[0]
 raw=z.read('bsw-variants-v50036.js').decode()
 old_variants=json.JSONDecoder().raw_decode(raw.split('window.KEYSUITE_BSW_VARIANTS=',1)[1])[0]
 baseline={'data':old_data,'variants':old_variants}
old=baseline['data']
w=load_workbook(source,data_only=True)
# Read all cells, including presentation sheets, and retain workbook errors as evidence.
errors=[{'sheet':s.title,'cell':c.coordinate,'value':c.value} for s in w for row in s for c in row if c.data_type=='e']
models=[]; curves={}; variants={}; duplicate_rows=[]; seen_rows={}
def numeric(v): return isinstance(v,(int,float)) and not isinstance(v,bool)
for idx, row in enumerate(w['BSW Data'].iter_rows(min_row=4,values_only=True),4):
 name=row[1]
 if not name: continue
 name=str(name).strip()
 if name in seen_rows:
  assert tuple(row)==seen_rows[name][1], f'Conflicting duplicate {name}'
  duplicate_rows.append({'model':name,'kept_row':seen_rows[name][0],'duplicate_row':idx});continue
 seen_rows[name]=(idx,tuple(row))
 match=re.fullmatch(r'BSW (\d+)F[\d]+-[2468](?:H)?',name)
 if not match: raise ValueError(f'Unexpected model at row {idx}: {name}')
 dims=dict(zip(['H1','H2','L','Weight','ØDNM','ØD','Øk','n-Øs','Øs'],row[6:15]))
 record=dict(id='BSW:'+name,model=name,series='BSW '+match[1],family=int(match[1]),motor_kw=row[2],motor_hp=row[3],pole=row[4],speed_rpm=row[5],weight_kg=row[9],connection=row[10],dimensions=dims,source_row=idx)
 arrays=[list(row[a:a+20]) for a in [15,35,55]]
 supplied=any(v is not None for a in arrays for v in a)
 if supplied:
  if not all(len(a)==20 and all(numeric(v) for v in a) for a in arrays):raise ValueError(f'Incomplete curve {name}')
  curves[name]=dict(flow=arrays[0],efficiency=arrays[1],head_per_stage=arrays[2],npshr=[0]*20,has_npsh=False,speed_rpm=row[5],shutoff_power_per_impeller_kw=dict(full=row[75] if numeric(row[75]) else None,medium=None,small=None))
  record.update(series=name,stages=1,fullImpellers=1,smallImpellers=0,smallestImpellers=0,curve_complete=True,dimension_drawing='../assets/v50027/bsw-dimension-1.png')
 models.append(record)
for row in w['Price Column'].iter_rows(min_row=4,values_only=True):
 name=row[2]
 if not name: continue
 variants[name]={}
 for variant,col in [('M',4),('MA',7),('T',10),('TA',13)]:
  price=row[col]; rarity=row[col-1]
  if price=='x' or price is None:variants[name][variant]=None
  else:
   if not numeric(price) or price<0:raise ValueError(f'Invalid price {name} {variant}')
   if str(rarity).lower() not in ['many','common','rare']:raise ValueError(f'Invalid rarity {name} {variant}')
   variants[name][variant]={'price':price,'rarity':rarity.lower()}
assert len({m['model'] for m in models})==len(models)
assert set(variants)=={m['model'] for m in models}
technical=[]
s=w['Pg 2']
for r in range(3,38):
 for a,b in [(2,4),(6,8)]:
  label,value=s.cell(r,a).value,s.cell(r,b).value
  if label is not None and value is not None:technical.append([str(label),str(value)])
s=w['Pg 3 BSW Dimension'];sample=[]
for r in range(5,9):
 for a,b in [(3,4),(6,7)]:sample.append([s.cell(r,a).value,s.cell(r,b).value])
data=dict(base_hz=50,curves=curves,models=[m for m in models if m['model'] in curves],catalogue=models,families=sorted({m['family'] for m in models}),technical=technical,sample_dimensions=sample,dimension_drawing='../assets/v50027/bsw-dimension-1.png',source=source.name,database_version='261122-V1.3',app_version='5.00.85',generation_code='BSW')
# The workbook contains the same engineering drawing; source bytes are authoritative.
with zipfile.ZipFile(source) as z: (root/'assets/v50027/bsw-dimension-1.png').write_bytes(z.read('xl/media/image1.png'))
dump=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'),allow_nan=False)
(root/'bsw-data-v50027.js').write_text("/* BSW V1.3 complete workbook import — KeySuite V5.00.85. */\n(()=>{'use strict';const data="+dump(data)+";globalThis.KeySuiteBSWData=Object.freeze(data);})();\n")
(root/'bsw-variants-v50036.js').write_text('/* Complete BSW V1.3 variant availability and workbook prices. */\nwindow.KEYSUITE_BSW_VARIANTS='+dump(variants)+';\n')
oldby={m['model']:m for m in old['catalogue']};newby={m['model']:m for m in models}
fields=['motor_kw','motor_hp','pole','speed_rpm','weight_kg','connection','dimensions']
modified=[]
for name in sorted(set(oldby)&set(newby)):
 changes={k:{'before':oldby[name].get(k),'after':newby[name].get(k)} for k in fields if oldby[name].get(k)!=newby[name].get(k)}
 if old['curves'].get(name)!=curves.get(name):changes['curve']={'before':old['curves'].get(name),'after':curves.get(name)}
 if baseline['variants'].get(name)!=variants.get(name):changes['variants']={'before':baseline['variants'].get(name),'after':variants.get(name)}
 if changes:modified.append({'model':name,'changes':changes})
report=dict(baseline_source=old['source'],baseline_version=old['database_version'],baseline_note='The supplied V5.00.84 archive ships data labelled V1.1; no V1.2 workbook was supplied. Comparison is against actual shipped engineering/variant records.',new_source=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),old_count=len(oldby),new_count=len(newby),added=sorted(set(newby)-set(oldby)),removed=sorted(set(oldby)-set(newby)),modified=modified,curve_count=len(curves),identical_duplicate_rows=duplicate_rows,workbook_errors=errors,error_disposition='Pg 3 BSW Dimension!B2 is a sample presentation error; model dimensions are imported exclusively from BSW Data G:O. No error value is used as engineering data.',source_price_policy='Workbook zero prices stay zero/unpriced; existing editable currency prices retain their normal precedence. No production price records are modified.')
(root/'BSW_V13_COMPARISON.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['old_count','new_count','added','removed','curve_count','workbook_errors']}));print('Modified:',len(modified))
