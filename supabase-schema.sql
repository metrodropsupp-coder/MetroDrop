create table if not exists public.case_sections (
  id uuid primary key,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key,
  section_id uuid not null references public.case_sections(id) on delete cascade,
  name text not null,
  image text not null,
  price integer not null default 0,
  contents jsonb not null default '[]'::jsonb,
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.case_sections enable row level security;
alter table public.cases enable row level security;

drop policy if exists "public can read case sections" on public.case_sections;
drop policy if exists "public can insert case sections" on public.case_sections;
drop policy if exists "public can delete case sections" on public.case_sections;
drop policy if exists "public can read cases" on public.cases;
drop policy if exists "public can insert cases" on public.cases;
drop policy if exists "public can delete cases" on public.cases;
drop policy if exists "public can update cases" on public.cases;

create policy "public can read case sections" on public.case_sections for select using (true);
create policy "public can insert case sections" on public.case_sections for insert with check (true);
create policy "public can delete case sections" on public.case_sections for delete using (true);
create policy "public can read cases" on public.cases for select using (true);
create policy "public can insert cases" on public.cases for insert with check (true);
create policy "public can delete cases" on public.cases for delete using (true);
create policy "public can update cases" on public.cases for update using (true) with check (true);

alter table public.cases add column if not exists contents jsonb not null default '[]'::jsonb;