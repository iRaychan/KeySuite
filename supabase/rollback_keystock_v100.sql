-- Non-destructive rollback: disable KeyStock API, preserve every stock and audit row.
-- Run only after approval. Restore the V5.00.50 website separately.
begin;
revoke execute on function public.keysuite_stock_v100(text,jsonb) from authenticated;
revoke execute on function keystock.api(text,jsonb) from authenticated;
notify pgrst,'reload schema';
commit;
-- To re-enable after review:
-- grant execute on function keystock.api(text,jsonb) to authenticated;
-- grant execute on function public.keysuite_stock_v100(text,jsonb) to authenticated;
-- notify pgrst,'reload schema';
