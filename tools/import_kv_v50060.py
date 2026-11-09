"""Import supported KV 12/15 V1.5 records into the existing KV data shape."""
import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook
from import_kv_v50031 import embedded_json, dimension_group

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
DATA = ROOT / 'supabase/functions/shared-kv/kv-data.js'
PRICE = ROOT / 'kv-price-data-v50017.js'
data = embedded_json(DATA, 'const data=')
prices = embedded_json(PRICE, 'Object.freeze(')
book = load_workbook(SOURCE, read_only=True, data_only=True)
curves = data['curves']
for row in book['KV Data'].iter_rows(min_row=4, values_only=True):
    series = row[4]
    if series not in ('KV 12', 'KV 15'):
        continue
    if series not in curves:
        raise ValueError(f'Missing baseline curve: {series}')
    curve = curves[series]
    for index, field in enumerate(('flow', 'efficiency', 'npshr', 'head_per_stage', 'efficiency_2', 'head_per_stage_2')):
        values = row[5 + index * 20:25 + index * 20]
        if len(values) != 20 or not all(isinstance(v, (int, float)) for v in values):
            raise ValueError(f'Incomplete {field}: {series}')
        curve[field] = list(values)
    for key, value in zip(('full', 'medium', 'small'), row[165:168]):
        if isinstance(value, (int, float)):
            curve['shutoff_power_per_impeller_kw'][key] = value
    if isinstance(row[171], (int, float)):
        curve['speed_rpm'] = row[171]

models = {row['model']: row for row in data['models']}
price_models = {row['model']: row for row in prices['models']}
added = []
withheld = []
for source_row, row in enumerate(book['KV'].iter_rows(min_row=4, values_only=True), 4):
    model = row[1]
    if not isinstance(model, str) or not re.fullmatch(r'KV (12|15)-\d+(?:-\d+)?', model.strip()):
        continue
    model = model.strip()
    match = re.fullmatch(r'KV (12|15)-(\d+)(?:-(\d+))?', model)
    series = f'KV {match[1]}'
    if match[3] or int(match[2]) != int(row[7] or 0) * 10 or not isinstance(row[6], str) or not all(isinstance(row[i], (int, float)) and row[i] > 0 for i in (2,3,4,7,8,9,10,11,12,13)):
        withheld.append(model)
        continue
    group = dimension_group(data['dimension_groups'], int(match[1]))
    dimensions = dict(zip(('B1','B2','H','D1','D2','Weight','D'), row[8:15]))
    dimensions.update(group['labels'], drawing=group['image'])
    models[model] = {'id': f'KV:{model}', 'model': model, 'series': series,
                     'stages': int(row[7]), 'fullImpellers': int(row[7]),
                     'smallImpellers': 0, 'smallestImpellers': 0,
                     'connection': row[6], 'motor_kw': row[2], 'motor_hp': row[3],
                     'max_operating_pressure_bar': row[4], 'weight_kg': row[13],
                     'dimensions': dimensions, 'source_row': source_row}
    if model not in price_models:
        price_models[model] = {'id': f'KV:{model}', 'model': model,
            'pricesByCurrency': {c: dict.fromkeys(('KVC','KV','KVN'), 0) for c in ('USD','RMB','MYR')},
            'rarityByCurrency': {c: dict.fromkeys(('KVC','KV','KVN'), 'common') for c in ('USD','RMB','MYR')},
            'sourceRow': source_row, 'motor_kw': row[2], 'motor_hp': row[3], 'connection': row[6]}
        added.append(model)

data.update(models=list(models.values()), available_families=list(dict.fromkeys(m['series'] for m in models.values())),
            source=SOURCE.name, database_version='261109-V1.5', app_version='5.00.60')
prices.update(models=list(price_models.values()), sourceWorkbook=SOURCE.name)
dump = lambda obj: json.dumps(obj, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
DATA.write_text('/* KV engineering data from V1.5 workbook. */\n(()=>{\'use strict\';const data='+dump(data)+';globalThis.KeySuiteKVData=Object.freeze(data);})();\n')
PRICE.write_text('/* KV V1.5 catalogue; new prices intentionally unset. */\n(()=>{\'use strict\';window.KeySuiteKVPriceData=Object.freeze('+dump(prices)+');})();\n')
print(json.dumps({'added': added, 'withheld': withheld, 'count': len(added)}))
