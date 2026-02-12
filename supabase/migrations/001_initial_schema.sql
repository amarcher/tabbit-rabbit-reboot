-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  venmo_username text,
  cashapp_cashtag text,
  paypal_username text,
  created_at timestamptz default now()
);

-- Tabs (a bill/receipt to split)
create table tabs (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Tab',
  owner_id uuid references profiles(id) on delete cascade not null,
  tax_percent numeric(5,2) default 0,
  tip_percent numeric(5,2) default 0,
  receipt_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rabbits (people on a tab)
create table rabbits (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references tabs(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  color text not null,
  created_at timestamptz default now()
);

-- Items (line items on a receipt)
create table items (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references tabs(id) on delete cascade not null,
  description text not null,
  price_cents integer not null,
  created_at timestamptz default now()
);

-- Item-Rabbit assignments (many-to-many)
create table item_rabbits (
  item_id uuid references items(id) on delete cascade,
  rabbit_id uuid references rabbits(id) on delete cascade,
  primary key (item_id, rabbit_id)
);

-- Indexes
create index idx_tabs_owner on tabs(owner_id);
create index idx_items_tab on items(tab_id);
create index idx_rabbits_tab on rabbits(tab_id);
create index idx_item_rabbits_item on item_rabbits(item_id);
create index idx_item_rabbits_rabbit on item_rabbits(rabbit_id);

-- Enable RLS
alter table profiles enable row level security;
alter table tabs enable row level security;
alter table rabbits enable row level security;
alter table items enable row level security;
alter table item_rabbits enable row level security;

-- Profiles: users can read any profile, update their own
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Tabs: owners can CRUD, rabbits can read
create policy "Tab owners have full access"
  on tabs for all using (auth.uid() = owner_id);

create policy "Rabbits can view their tabs"
  on tabs for select using (
    exists (
      select 1 from rabbits
      where rabbits.tab_id = tabs.id
        and rabbits.profile_id = auth.uid()
    )
  );

-- Rabbits: tab owners can CRUD, rabbits can read their own tab's rabbits
create policy "Tab owners manage rabbits"
  on rabbits for all using (
    exists (
      select 1 from tabs
      where tabs.id = rabbits.tab_id
        and tabs.owner_id = auth.uid()
    )
  );

create policy "Rabbits can view co-rabbits"
  on rabbits for select using (
    exists (
      select 1 from rabbits r
      where r.tab_id = rabbits.tab_id
        and r.profile_id = auth.uid()
    )
  );

-- Items: tab owners can CRUD, tab rabbits can read
create policy "Tab owners manage items"
  on items for all using (
    exists (
      select 1 from tabs
      where tabs.id = items.tab_id
        and tabs.owner_id = auth.uid()
    )
  );

create policy "Tab rabbits can view items"
  on items for select using (
    exists (
      select 1 from rabbits
      where rabbits.tab_id = items.tab_id
        and rabbits.profile_id = auth.uid()
    )
  );

-- Item-Rabbits: tab owners can CRUD, tab rabbits can read
create policy "Tab owners manage assignments"
  on item_rabbits for all using (
    exists (
      select 1 from items
      join tabs on tabs.id = items.tab_id
      where items.id = item_rabbits.item_id
        and tabs.owner_id = auth.uid()
    )
  );

create policy "Tab rabbits can view assignments"
  on item_rabbits for select using (
    exists (
      select 1 from items
      join rabbits on rabbits.tab_id = items.tab_id
      where items.id = item_rabbits.item_id
        and rabbits.profile_id = auth.uid()
    )
  );

-- Storage bucket for receipt images
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict do nothing;

create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "Anyone can view receipts"
  on storage.objects for select
  using (bucket_id = 'receipts');

-- Enable realtime for collaborative editing
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table rabbits;
alter publication supabase_realtime add table item_rabbits;
