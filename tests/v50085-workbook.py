"""Verify generated BSW records directly against all workbook rows and source cells."""
import sys,json
from pathlib import Path
from openpyxl import load_workbook
root=Path(__file__).resolve().parents[1]
w=load_workbook(sys.argv[1],data_only=True)
s=(root/'bsw-data-v50027.js').read_text();d=json.JSONDecoder().raw_decode(s.split('const data=',1)[1])[0]
v=json.JSONDecoder().raw_decode((root/'bsw-variants-v50036.js').read_text().split('window.KEYSUITE_BSW_VARIANTS=',1)[1])[0]
by={m['model']:m for m in d['catalogue']};names=set();count=0
for r in w['BSW Data'].iter_rows(min_row=4,values_only=True):
 if not r[1]:continue
 names.add(r[1]);m=by[r[1]];count+=1
 for field,index in [('motor_kw',2),('motor_hp',3),('pole',4),('speed_rpm',5),('weight_kg',9),('connection',10)]:assert m[field]==r[index],(r[1],field)
 for field,index in [('H1',6),('H2',7),('L',8),('Weight',9),('ØDNM',10),('ØD',11),('Øk',12),('n-Øs',13),('Øs',14)]:assert m['dimensions'][field]==r[index],(r[1],field)
 if any(r[i] is not None for i in range(15,75)):
  c=d['curves'][r[1]]
  assert c['flow']==list(r[15:35]);assert c['efficiency']==list(r[35:55]);assert c['head_per_stage']==list(r[55:75]);assert c['shutoff_power_per_impeller_kw']['full']==r[75]
 else:assert r[1] not in d['curves']
assert names==set(by)==set(v)
for r in w['Price Column'].iter_rows(min_row=4,values_only=True):
 if not r[2]:continue
 for variant,i in [('M',4),('MA',7),('T',10),('TA',13)]:
  record=v[r[2]][variant]
  if r[i]=='x' or r[i] is None:assert record is None
  else:assert record=={'price':r[i],'rarity':r[i-1].lower()}
assert len(d['models'])==len(d['curves'])==8
assert all(m['model'] in d['curves'] for m in d['models'])
assert '#VALUE!' not in json.dumps(d)
result={'status':'PASS','workbookRowsChecked':count,'uniqueModels':len(names),'curves':len(d['curves']),'allModelFieldsAndCurvePointsMatch':True,'allVariantPricesAndAvailabilityMatch':True,'sampleErrorExcluded':True}
(root/'tests/v50085-workbook-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
