#!/usr/bin/env python3
"""Deterministically import the approved KV V1.3 workbook into KeySuite data files."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "supabase/functions/shared-kv/kv-data.js"
PRICE = ROOT / "kv-price-data-v50017.js"


def embedded_json(path: Path, marker: str) -> dict:
    text = path.read_text(encoding="utf-8")
    start = text.find(marker)
    if start < 0:
        raise RuntimeError(f"Could not read embedded JSON from {path}")
    payload = text[start + len(marker):]
    value, _ = json.JSONDecoder().raw_decode(payload)
    return value


def dimension_group(groups: list[dict], family: int) -> dict:
    for group in groups:
        if family in group["families"]:
            return group
    raise RuntimeError(f"Missing dimension group for KV {family}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: import_kv_v50031.py <004 - KV 261102 - V1.3.xlsx>")
    workbook_path = Path(sys.argv[1]).resolve()
    prior = embedded_json(DATA, "const data=")
    old_prices = embedded_json(PRICE, "Object.freeze(")
    prices_by_model = {row["model"]: row for row in old_prices["models"]}

    wb = load_workbook(workbook_path, data_only=True, read_only=True)
    ws = wb["KV"]
    models = []
    for row_number, row in enumerate(ws.iter_rows(min_row=4, max_col=15, values_only=True), 4):
        model = row[1]
        if not isinstance(model, str) or not re.fullmatch(r"KV\s+[1-5]-\d+", model.strip()):
            continue
        model = re.sub(r"\s+", " ", model.strip())
        family = int(re.search(r"KV\s+(\d+)-", model).group(1))
        group = dimension_group(prior["dimension_groups"], family)
        stages = int(row[7])
        dimensions = {
            "B1": row[8], "B2": row[9], "H": row[10], "D1": row[11],
            "D2": row[12], "Weight": row[13], "D": row[14],
            "L": group["labels"]["L"], "W": group["labels"]["W"],
            "drawing": group["image"],
        }
        models.append({
            "id": f"KV:{model}", "model": model, "series": f"KV {family}",
            "stages": stages, "fullImpellers": stages, "smallImpellers": 0,
            "smallestImpellers": 0, "connection": row[6],
            "motor_kw": row[2], "motor_hp": row[3],
            "max_operating_pressure_bar": row[4], "weight_kg": row[13],
            "dimensions": dimensions, "source_row": row_number,
        })

    if len(models) != 171:
        raise RuntimeError(f"Expected 171 complete models, found {len(models)}")
    complete_series = sorted({m["series"] for m in models}, key=lambda x: int(x.split()[1]))
    for series in complete_series:
        if series not in prior["curves"]:
            raise RuntimeError(f"No approved curve exists for {series}")
    prior.update({
        "models": models,
        "available_families": complete_series,
        "source": workbook_path.name,
        "database_version": "261102-V1.3",
        "app_version": "5.00.31",
        "generation_code": "KV",
    })
    DATA.write_text(
        "/* KeySuite V5.00.31 — approved KV 261102 V1.3 engineering data. */\n"
        "(()=>{'use strict';const data=" + json.dumps(prior, separators=(",", ":"), ensure_ascii=False)
        + ";globalThis.KeySuiteKVData=Object.freeze(data);})();\n", encoding="utf-8")

    price_rows = []
    for model in models:
        old = prices_by_model.get(model["model"], {})
        books = old.get("pricesByCurrency", {})
        rarity = old.get("rarityByCurrency", {})
        price_rows.append({
            "id": model["id"], "model": model["model"], "sourceRow": model["source_row"],
            "motor_kw": model["motor_kw"], "motor_hp": model["motor_hp"],
            "connection": model["connection"],
            "pricesByCurrency": {currency: {
                "KVC": books.get(currency, {}).get("KVC", 0),
                "KV": books.get(currency, {}).get("KV", 0),
                "KVN": books.get(currency, {}).get("KVN", 0),
            } for currency in ("USD", "RMB", "MYR")},
            "rarityByCurrency": {currency: {
                "KVC": rarity.get(currency, {}).get("KVC", "common"),
                "KV": rarity.get(currency, {}).get("KV", "common"),
                "KVN": rarity.get(currency, {}).get("KVN", "common"),
            } for currency in ("USD", "RMB", "MYR")},
        })
    payload = {"sourceWorkbook": workbook_path.name, "models": price_rows}
    PRICE.write_text(
        "/* KeySuite V5.00.31 — KV/KVC/KVN Price List seed data. */\n"
        "(()=>{'use strict';window.KeySuiteKVPriceData=Object.freeze(" + json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        + ");})();\n", encoding="utf-8")
    values = ",\n  ".join(
        "(" + ",".join([
            "'" + str(value).replace("'", "''") + "'"
            for value in (m["id"], m["model"], m["source_row"], workbook_path.name)
        ]) + ")" for m in models
    )
    migration = ROOT / "supabase/migrations/20261102190000_v50031_kv_costing_audit.sql"
    migration.write_text(f"""-- KeySuite V5.00.31 — KV V1.3, independent variants and costing authority.\nBEGIN;\n\nALTER TABLE public.ks_products_kv\n+  ADD COLUMN IF NOT EXISTS price_kvc_usd numeric NOT NULL DEFAULT 0,\n+  ADD COLUMN IF NOT EXISTS price_kvc_rmb numeric NOT NULL DEFAULT 0,\n+  ADD COLUMN IF NOT EXISTS price_kvc_myr numeric NOT NULL DEFAULT 0,\n+  ADD COLUMN IF NOT EXISTS price_kvn_usd numeric NOT NULL DEFAULT 0,\n+  ADD COLUMN IF NOT EXISTS price_kvn_rmb numeric NOT NULL DEFAULT 0,\n+  ADD COLUMN IF NOT EXISTS price_kvn_myr numeric NOT NULL DEFAULT 0,\n+  ADD COLUMN IF NOT EXISTS rarity_kvc_usd text NOT NULL DEFAULT 'common',\n+  ADD COLUMN IF NOT EXISTS rarity_kvc_rmb text NOT NULL DEFAULT 'common',\n+  ADD COLUMN IF NOT EXISTS rarity_kvc_myr text NOT NULL DEFAULT 'common',\n+  ADD COLUMN IF NOT EXISTS rarity_kvn_usd text NOT NULL DEFAULT 'common',\n+  ADD COLUMN IF NOT EXISTS rarity_kvn_rmb text NOT NULL DEFAULT 'common',\n+  ADD COLUMN IF NOT EXISTS rarity_kvn_myr text NOT NULL DEFAULT 'common';\n\n-- Existing KV price/rarity columns remain the KV book. KVC/KVN start empty.\nINSERT INTO public.ks_products_kv(id,model,source_row,source_workbook) VALUES\n  {values}\nON CONFLICT (id) DO UPDATE SET model=excluded.model,source_row=excluded.source_row,source_workbook=excluded.source_workbook,active=true;\n\nCREATE OR REPLACE FUNCTION public.keysuite_save_kv_product_price_v50031(\n+ p_product_id text,p_variant text,p_currency text,p_price numeric,p_rarity text\n+) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off AS $$\n+DECLARE v_variant text:=upper(trim(coalesce(p_variant,'')));v_currency text:=upper(trim(coalesce(p_currency,'')));v_rarity text:=lower(trim(coalesce(p_rarity,'')));v_price_column text;v_rarity_column text;result public.ks_products_kv;\n+BEGIN\n+ IF NOT public.keysuite_is_owner_v50017() THEN RAISE EXCEPTION 'Owner access required'; END IF;\n+ IF v_variant NOT IN ('KVC','KV','KVN') OR v_currency NOT IN ('USD','RMB','MYR') THEN RAISE EXCEPTION 'Unsupported KV variant or currency'; END IF;\n+ IF v_rarity NOT IN ('common','many','rare','fixed') OR coalesce(p_price,0)<0 THEN RAISE EXCEPTION 'Invalid price or rarity'; END IF;\n+ v_price_column:=CASE WHEN v_variant='KV' THEN 'price_'||lower(v_currency) ELSE 'price_'||lower(v_variant)||'_'||lower(v_currency) END;\n+ v_rarity_column:=CASE WHEN v_variant='KV' THEN 'rarity_'||lower(v_currency) ELSE 'rarity_'||lower(v_variant)||'_'||lower(v_currency) END;\n+ EXECUTE format('UPDATE public.ks_products_kv SET %I=$1,%I=$2,updated_at=now() WHERE id=$3 RETURNING *',v_price_column,v_rarity_column) INTO result USING p_price,v_rarity,p_product_id;\n+ IF result.id IS NULL THEN RAISE EXCEPTION 'KV product not found'; END IF;RETURN to_jsonb(result);\n+END $$;\n+REVOKE ALL ON FUNCTION public.keysuite_save_kv_product_price_v50031(text,text,text,numeric,text) FROM public,anon;\n+GRANT EXECUTE ON FUNCTION public.keysuite_save_kv_product_price_v50031(text,text,text,numeric,text) TO authenticated;\n\nUPDATE public.ks_role_permissions SET permissions=coalesce(permissions,'{{}}'::jsonb)||'{{\"view_costing_breakdown\":\"full\"}}'::jsonb WHERE lower(trim(coalesce(role,'')))='owner';\n+UPDATE public.ks_role_permissions SET permissions=coalesce(permissions,'{{}}'::jsonb)||'{{\"view_costing_breakdown\":\"none\"}}'::jsonb WHERE lower(trim(coalesce(role,'')))<>'owner' AND NOT(coalesce(permissions,'{{}}'::jsonb)?'view_costing_breakdown');\n\nCREATE OR REPLACE FUNCTION public.keysuite_can_view_costing_breakdown_v50031() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public SET row_security=off AS $$\n+DECLARE v_email text:=lower(trim(coalesce(auth.jwt()->>'email','')));v_role text;v_company text;v_level text:='none';\n+BEGIN\n+ IF v_email='' THEN RETURN false;END IF;\n+ SELECT lower(coalesce(role,'')),company_id::text INTO v_role,v_company FROM public.ks_user_access WHERE lower(coalesce(email,''))=v_email AND coalesce(active,true)=true LIMIT 1;\n+ IF v_role='owner' THEN RETURN true;END IF;\n+ SELECT lower(coalesce(permissions->>'view_costing_breakdown','none')) INTO v_level FROM public.ks_role_permissions WHERE company_id::text=v_company AND lower(coalesce(role,''))=v_role LIMIT 1;\n+ RETURN coalesce(v_level,'none')<>'none';\n+END $$;\n+REVOKE ALL ON FUNCTION public.keysuite_can_view_costing_breakdown_v50031() FROM public,anon;\n+GRANT EXECUTE ON FUNCTION public.keysuite_can_view_costing_breakdown_v50031() TO authenticated;\n+NOTIFY pgrst,'reload schema';\n+COMMIT;\n+""", encoding="utf-8")
    migration.write_text(migration.read_text(encoding="utf-8").replace("\n+", "\n"), encoding="utf-8")
    print(f"Imported {len(models)} models across {', '.join(complete_series)}")


if __name__ == "__main__":
    main()
