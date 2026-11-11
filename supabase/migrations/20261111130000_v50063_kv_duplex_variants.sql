-- Prepared only. Apply after reviewing existing KV prices and backing up the table.
-- Existing KVC, KV and KVN columns and rows are untouched.
ALTER TABLE public.ks_products_kv
  ADD COLUMN IF NOT EXISTS price_kvd_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_kvd_rmb numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_kvd_myr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_kvsd_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_kvsd_rmb numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_kvsd_myr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rarity_kvd_usd text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS rarity_kvd_rmb text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS rarity_kvd_myr text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS rarity_kvsd_usd text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS rarity_kvsd_rmb text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS rarity_kvsd_myr text NOT NULL DEFAULT 'common';

CREATE OR REPLACE FUNCTION public.keysuite_save_kv_product_price_v50063(
 p_product_id text,p_variant text,p_currency text,p_price numeric,p_rarity text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off AS $$
DECLARE v_variant text:=upper(trim(coalesce(p_variant,'')));v_currency text:=upper(trim(coalesce(p_currency,'')));v_rarity text:=lower(trim(coalesce(p_rarity,'')));v_price_column text;v_rarity_column text;result public.ks_products_kv;
BEGIN
 IF NOT public.keysuite_is_owner_v50017() THEN RAISE EXCEPTION 'Owner access required'; END IF;
 IF v_variant NOT IN ('KVC','KV','KVN','KVD','KVSD') OR v_currency NOT IN ('USD','RMB','MYR') THEN RAISE EXCEPTION 'Unsupported KV variant or currency'; END IF;
 IF v_rarity NOT IN ('common','many','rare','fixed') OR p_price IS NULL OR p_price<0 THEN RAISE EXCEPTION 'Invalid price or rarity'; END IF;
 v_price_column:=CASE WHEN v_variant='KV' THEN 'price_'||lower(v_currency) ELSE 'price_'||lower(v_variant)||'_'||lower(v_currency) END;
 v_rarity_column:=CASE WHEN v_variant='KV' THEN 'rarity_'||lower(v_currency) ELSE 'rarity_'||lower(v_variant)||'_'||lower(v_currency) END;
 EXECUTE format('UPDATE public.ks_products_kv SET %I=$1,%I=$2,updated_at=now() WHERE id=$3 RETURNING *',v_price_column,v_rarity_column) INTO result USING p_price,v_rarity,p_product_id;
 IF result.id IS NULL THEN RAISE EXCEPTION 'KV product not found'; END IF;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.keysuite_save_kv_product_price_v50063(text,text,text,numeric,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.keysuite_save_kv_product_price_v50063(text,text,text,numeric,text) TO authenticated;
