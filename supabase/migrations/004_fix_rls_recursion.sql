-- Helper functions (security definer bypasses RLS, breaking the recursion cycle)

create or replace function public.is_tab_owner(p_tab_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tabs
    where id = p_tab_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_tab_rabbit(p_tab_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.rabbits
    where tab_id = p_tab_id and profile_id = auth.uid()
  );
$$;

create or replace function public.get_tab_id_for_item(p_item_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select tab_id from public.items where id = p_item_id;
$$;

-- Drop old policies that cause recursion
drop policy if exists "Tab owners have full access" on tabs;
drop policy if exists "Rabbits can view their tabs" on tabs;
drop policy if exists "Tab owners manage rabbits" on rabbits;
drop policy if exists "Rabbits can view co-rabbits" on rabbits;
drop policy if exists "Tab owners manage items" on items;
drop policy if exists "Tab rabbits can view items" on items;
drop policy if exists "Tab owners manage assignments" on item_rabbits;
drop policy if exists "Tab rabbits can view assignments" on item_rabbits;

-- Tabs: simple owner check (no cross-table reference)
create policy "Tab owners have full access"
  on tabs for all using (auth.uid() = owner_id);

create policy "Rabbits can view their tabs"
  on tabs for select using (public.is_tab_rabbit(id));

-- Rabbits: use helper function instead of querying tabs directly
create policy "Tab owners manage rabbits"
  on rabbits for all using (public.is_tab_owner(tab_id));

create policy "Rabbits can view co-rabbits"
  on rabbits for select using (public.is_tab_rabbit(tab_id));

-- Items: use helper function
create policy "Tab owners manage items"
  on items for all using (public.is_tab_owner(tab_id));

create policy "Tab rabbits can view items"
  on items for select using (public.is_tab_rabbit(tab_id));

-- Item-Rabbits: use helper functions
create policy "Tab owners manage assignments"
  on item_rabbits for all using (
    public.is_tab_owner(public.get_tab_id_for_item(item_id))
  );

create policy "Tab rabbits can view assignments"
  on item_rabbits for select using (
    public.is_tab_rabbit(public.get_tab_id_for_item(item_id))
  );
