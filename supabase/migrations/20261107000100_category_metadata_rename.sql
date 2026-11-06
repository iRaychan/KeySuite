begin;

create or replace function public.keysuite_rename_pricing_category(
  p_category_id text,
  p_category_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_category_name, ''));
begin
  if auth.uid() is null or public.keysuite_current_role() is distinct from 'owner' then
    raise exception 'Only the Owner can manage pricing categories.';
  end if;
  if v_name = '' then
    raise exception 'Category Name is required.';
  end if;
  if exists (
    select 1 from public.ks_pricing_categories
    where lower(category_name) = lower(v_name) and id <> p_category_id
  ) then
    raise exception 'A pricing category with this name already exists.';
  end if;

  update public.ks_pricing_categories
  set category_name = v_name
  where id = p_category_id;
  if not found then
    raise exception 'Pricing category was not found.';
  end if;
end;
$$;

revoke all on function public.keysuite_rename_pricing_category(text, text) from public, anon, authenticated;
grant execute on function public.keysuite_rename_pricing_category(text, text) to authenticated;

commit;
