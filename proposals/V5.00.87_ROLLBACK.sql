-- Restore the V5.00.86 application FIRST. This removes only derived V5.00.87 objects.
-- Original quotations, archives, save/delete RPCs, policies and old history RPC remain intact.
begin;
drop trigger if exists keysuite_history_v50087 on public.ks_quotations;
drop trigger if exists keysuite_history_v50087 on public.ks_quotation_archive_v409;
drop function if exists public.keysuite_history_page_v50087(text,text,text,text,text[],text,integer);
drop function if exists public.keysuite_history_document_v50087(text,text,text);
drop function if exists public.keysuite_history_rows_v50087(text);
drop function if exists public.keysuite_history_company_v50087(text);
drop function if exists public.keysuite_history_trigger_v50087();
drop function if exists public.keysuite_project_quotation_v50087(text,text,text,text,jsonb,timestamptz);
drop table if exists public.ks_quotation_history_v50087;
notify pgrst,'reload schema';
commit;
