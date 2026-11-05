"""Import cached KV V1.4 engineering values and prepare a price-list seed."""
import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

from import_kv_v50031 import DATA, PRICE, ROOT, dimension_group, embedded_json

source = Path(sys.argv[1])
book = load_workbook(source, data_only=True, read_only=True)
data = embedded_json(DATA, "const data=")
prices = embedded_json(PRICE, "Object.freeze(")
original = {m["model"]: m for m in data["models"]}
models = original.copy()
price_models = {m["model"]: m for m in prices["models"]}
curve_fields = ("flow", "efficiency", "npshr", "head_per_stage",
                "efficiency_2", "head_per_stage_2", "efficiency_3", "head_per_stage_3")
changed_curves = []
for row in book["KV Data"].iter_rows(min_row=4, values_only=True):
    series = row[4]
    if series not in data["curves"]:
        continue
    curve = data["curves"][series]
    before = json.dumps(curve, sort_keys=True)
    for index, field in enumerate(curve_fields):
        samples = row[5 + 20 * index:25 + 20 * index]
        if all(isinstance(value, (float, int)) for value in samples):
            if curve.get(field) != list(samples):
                curve[field] = list(samples)
        elif index < 4:
            raise ValueError(f"Incomplete {field} for {series}")
    for key, value in zip(("full", "medium", "small"), row[165:168]):
        if isinstance(value, (int, float)):
            curve["shutoff_power_per_impeller_kw"][key] = value
    if isinstance(row[171], (int, float)):
        curve["speed_rpm"] = row[171]
    if json.loads(before) != curve:
        changed_curves.append(series)

withheld = []
for number, row in enumerate(book["KV"].iter_rows(min_row=4, values_only=True), 4):
    model = row[1]
    if not isinstance(model, str):
        continue
    match = re.fullmatch(r"KV (\d+)-(\d+)(-\d+)?", model.strip())
    if not match:
        continue
    model = model.strip()
    family = int(match[1])
    series = f"KV {family}"
    if match[3] or series not in data["curves"] or not all(
        isinstance(row[i], (int, float)) and row[i] > 0 for i in (2, 3, 4, 7, 8, 9, 10, 11, 12, 13)
    ) or not isinstance(row[6], str):
        withheld.append(model)
        continue
    stages = int(row[7])
    assert int(match[2]) == stages * 10, model
    group = dimension_group(data["dimension_groups"], family)
    dimensions = dict(zip(("B1", "B2", "H", "D1", "D2", "Weight", "D"), row[8:15]))
    dimensions.update(group["labels"], drawing=group["image"])
    models[model] = {
        "id": f"KV:{model}", "model": model, "series": series,
        "stages": stages, "fullImpellers": stages, "smallImpellers": 0, "smallestImpellers": 0,
        "connection": row[6], "motor_kw": row[2], "motor_hp": row[3],
        "max_operating_pressure_bar": row[4], "weight_kg": row[13],
        "dimensions": dimensions, "source_row": number,
    }
    price = price_models.setdefault(model, {
        "id": f"KV:{model}", "model": model,
        "pricesByCurrency": {c: dict.fromkeys(("KVC", "KV", "KVN"), 0) for c in ("USD", "RMB", "MYR")},
        "rarityByCurrency": {c: dict.fromkeys(("KVC", "KV", "KVN"), "common") for c in ("USD", "RMB", "MYR")},
    })
    price.update(sourceRow=number, motor_kw=row[2], motor_hp=row[3], connection=row[6])

added = [m for m in models if m not in original]
updated = [m for m in original if original[m] != models[m]]
assert len(original) == 171 and len(added) == 45 and len(withheld) == 2
data.update(models=list(models.values()), source=source.name, database_version="261105-V1.4",
            app_version="5.00.41", available_families=list(dict.fromkeys(m["series"] for m in models.values())))
prices.update(sourceWorkbook=source.name, models=list(price_models.values()))
serialize = lambda payload: json.dumps(payload, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
DATA.write_text("/* KV engineering data from the supplied V1.4 workbook. */\n"
                "(()=>{'use strict';const data=" + serialize(data) +
                ";globalThis.KeySuiteKVData=Object.freeze(data);})();\n", encoding="utf-8")
PRICE.write_text("/* KV V1.4 price-list catalogue. Existing variant prices retained. */\n"
                 "(()=>{'use strict';window.KeySuiteKVPriceData=Object.freeze(" + serialize(prices) +
                 ");})();\n", encoding="utf-8")
sql_literal = lambda value: "'" + value.replace("'", "''") + "'"
values = ",\n".join("  (" + ", ".join((sql_literal(models[m]["id"]), sql_literal(m),
                    str(models[m]["source_row"]), sql_literal(source.name))) + ")" for m in added)
(ROOT / "KV_V1.4_PRICELIST_SEED.sql").write_text(
    "-- Run after approval. Existing model prices, rarity and active status are preserved.\n"
    "BEGIN;\nINSERT INTO public.ks_products_kv (id, model, source_row, source_workbook) VALUES\n"
    + values + "\nON CONFLICT DO NOTHING;\nCOMMIT;\n", encoding="utf-8")
print(json.dumps(dict(added=added, updated=updated, withheld=withheld, changed_curves=changed_curves), indent=2))
