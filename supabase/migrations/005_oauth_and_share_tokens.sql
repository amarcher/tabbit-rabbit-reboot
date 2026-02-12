-- Migration 005: OAuth profile trigger update + share tokens + public RPC

-- 1. Update handle_new_user() to populate display_name from Google OAuth metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

-- 2. Add share_token column to tabs (DEFAULT auto-populates existing rows)
alter table public.tabs
  add column share_token uuid default gen_random_uuid() not null unique;

-- 3. Create RPC function for fetching shared tab data (bypasses RLS)
create or replace function public.get_shared_tab(p_share_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_tab record;
  v_result jsonb;
begin
  select t.id, t.name, t.tax_percent, t.tip_percent, t.owner_id
  into v_tab
  from public.tabs t
  where t.share_token = p_share_token;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'tab', jsonb_build_object(
      'name', v_tab.name,
      'tax_percent', v_tab.tax_percent,
      'tip_percent', v_tab.tip_percent
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'description', i.description,
        'price_cents', i.price_cents
      ) order by i.created_at)
      from public.items i
      where i.tab_id = v_tab.id
    ), '[]'::jsonb),
    'rabbits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'color', r.color
      ) order by r.created_at)
      from public.rabbits r
      where r.tab_id = v_tab.id
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', ir.item_id,
        'rabbit_id', ir.rabbit_id
      ))
      from public.item_rabbits ir
      join public.items i on i.id = ir.item_id
      where i.tab_id = v_tab.id
    ), '[]'::jsonb),
    'owner_profile', (
      select jsonb_build_object(
        'display_name', p.display_name,
        'venmo_username', p.venmo_username,
        'cashapp_cashtag', p.cashapp_cashtag,
        'paypal_username', p.paypal_username
      )
      from public.profiles p
      where p.id = v_tab.owner_id
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 4. Grant anon access so unauthenticated users can call the RPC
grant execute on function public.get_shared_tab(uuid) to anon;
grant execute on function public.get_shared_tab(uuid) to authenticated;
