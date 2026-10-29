"""Read supplied ISO workbooks; never edit them. Run from build root."""
import json, re, hashlib
from pathlib import Path
import openpyxl
root=Path(__file__).resolve().parents[1]
selection=root/'source/005 - ISO Imp (Selection) 261029 - V1.1.xlsx'
prices=root/'source/010 - ISO (Pricelist) - 261029 - V1.0.xlsx'
w=openpyxl.load_workbook(selection,data_only=True,read_only=False)
d=w['Dimension'];c=w['ISO Curve'];p=openpyxl.load_workbook(prices,data_only=True,read_only=False)['ISO-261029']
number=lambda x:isinstance(x,(int,float)) and not isinstance(x,bool)
model=lambda x:str(x or '').replace('ISO ','').strip()
torque={d.cell(i,17).value:d.cell(i,18).value for i in range(4,43) if number(d.cell(i,17).value) and number(d.cell(i,18).value)}
keys=['h1','h2','suction','discharge','a','f','a_plus_f','weight_kg','seal','m1','n1','casing_pressure_bar','shaft_mm']
dims={}
for i in range(4,43):
 m=model(d.cell(i,2).value)
 if not re.match(r'^\d+-\d+-\d+',m):continue
 row={k:d.cell(i,j).value for j,k in enumerate(keys,3) if d.cell(i,j).value not in (None,'','x','X')}
 if row.get('shaft_mm') in torque:row['max_torque_nm']=torque[row['shaft_mm']]
 dims[m]=row
catalog=[]
for i in range(5,44):
 m=model(p.cell(i,3).value)
 variants=[{'material':p.cell(4,j).value,'priceUsd':p.cell(i,j).value,'priceRmb':None,'priceMyr':None,'rarity':'many'} for j in range(5,15) if number(p.cell(i,j).value)]
 catalog.append({'id':'iso-'+m.lower(),'model':m,'connection':p.cell(i,4).value,'rarity':'many','variants':variants,'dimensions':dims.get(m,{}),'sourceRow':i})
pumps=[];rejected=[]
for i in list(range(4,23))+list(range(44,82)):
 m=model(c.cell(i,3).value);q=[c.cell(i,j).value for j in range(12,32)];h=[c.cell(i,j).value for j in range(32,52)]
 if not all(number(x) for x in q+h):rejected.append({'model':m,'row':i,'reason':'Q/H absent'});continue
 rpm=c.cell(i,212).value or (2900 if i<43 else 1450) # Explicit section heading when row RPM is blank
 imp=[c.cell(i,j).value for j in range(4,11)]
 assert number(rpm) and all(number(x) for x in imp),(i,rpm,imp)
 seen={}
 for flow,head in zip(q,h):assert flow not in seen or seen[flow]==head,(m,rpm,flow);seen[flow]=head
 item={'id':f'iso-{m.lower()}-{rpm}','model':m,'rpm':rpm,'pole':2 if i<43 else 4,'impellers':imp,'multiplier':c.cell(i,11).value,'flow_lps':q,'head_m':h,'efficiency':{},'dimensions':dims.get(m,{}),'sourceRow':i}
 npsh=[c.cell(i,j).value for j in range(52,72)]
 if all(number(x) for x in npsh):item['npsh_m']=npsh
 for index,letter in enumerate('ABCDEFG'):
  vals=[c.cell(i,j).value for j in range(72+20*index,92+20*index)]
  if all(number(x) for x in vals):item['efficiency'][letter]=vals
 assert len(item['efficiency'])==7,(m,'missing efficiency')
 pumps.append(item)
output=root/'selector-iso';output.mkdir(exist_ok=True)
data={'version':'5.00.11','product':'B.G.Reich ISO End Suction Pump','baseFrequencyHz':50,'sourceWorkbook':selection.name,'modelCount':len(pumps),'pumps':pumps}
(output/'iso-data.js').write_text('(function(root){const data='+json.dumps(data,separators=(',',':'))+';if(typeof module==="object"&&module.exports)module.exports=data;else root.ISO_SELECTOR_DB=data;})(globalThis);\n')
(root/'iso-products-v50011.js').write_text('window.KEYSUITE_ISO_PRODUCTS='+json.dumps(catalog,separators=(',',':'))+';\n')
report={'models':len(catalog),'variants':sum(len(x['variants']) for x in catalog),'curveRows':len(pumps),'technicalModels':len(set(x['model'] for x in pumps)),'priceOnlyModels':sorted(set(x['model'] for x in catalog)-set(x['model'] for x in pumps)),'missingCurveRows':rejected,'sha256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in [selection,prices]}}
(root/'tests/v50011/iso-import-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
