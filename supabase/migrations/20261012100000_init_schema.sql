-- COURT IQ – Grundschema
-- Tabellen, Hilfsfunktionen, Row Level Security und Aufstellungslogik.
-- Reproduzierbar auf einer leeren Supabase-Instanz ausführbar.

-- ---------------------------------------------------------------------------
-- Typen
-- ---------------------------------------------------------------------------
create type public.team_role as enum ('owner', 'coach', 'viewer');
create type public.motivation_status as enum ('unrated', 'green', 'yellow', 'red');
create type public.throwing_hand as enum ('left', 'right', 'both');

-- Interne Hilfsfunktionen liegen in einem nicht per API veröffentlichten Schema.
create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Allgemeine Trigger
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- teams & team_members
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teams_owner_id_idx on public.teams (owner_id);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function private.set_updated_at();

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.team_role not null default 'coach',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);

-- Mitgliedschaft wird ausschliesslich aus der Datenbank abgeleitet (auth.uid()).
create or replace function private.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_team(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'coach')
  );
$$;

create or replace function private.is_team_owner(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

create or replace function private.shares_team_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  );
$$;

grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.can_edit_team(uuid) to authenticated;
grant execute on function private.is_team_owner(uuid) to authenticated;
grant execute on function private.shares_team_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 60),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 60),
  birth_date date check (birth_date >= date '1900-01-01'),
  jersey_number smallint check (jersey_number between 0 and 99),
  primary_position text not null
    check (primary_position in ('TW', 'LA', 'RL', 'RM', 'RR', 'RA', 'KM')),
  alternative_positions text[] not null default '{}'
    check (alternative_positions <@ array['TW', 'LA', 'RL', 'RM', 'RR', 'RA', 'KM']::text[]),
  height_cm smallint check (height_cm between 100 and 230),
  throwing_hand public.throwing_hand,
  photo_path text check (char_length(photo_path) <= 300),
  strengths text[] not null default '{}' check (cardinality(strengths) <= 30),
  strengths_notes text check (char_length(strengths_notes) <= 5000),
  weaknesses text[] not null default '{}' check (cardinality(weaknesses) <= 30),
  weaknesses_notes text check (char_length(weaknesses_notes) <= 5000),
  attack_traits text[] not null default '{}' check (cardinality(attack_traits) <= 30),
  attack_behavior text check (char_length(attack_behavior) <= 5000),
  defense_traits text[] not null default '{}' check (cardinality(defense_traits) <= 30),
  defense_behavior text check (char_length(defense_behavior) <= 5000),
  tactical_notes text check (char_length(tactical_notes) <= 5000),
  coach_notes text check (char_length(coach_notes) <= 5000),
  general_notes text check (char_length(general_notes) <= 5000),
  motivation_status public.motivation_status not null default 'unrated',
  motivation_note text check (char_length(motivation_note) <= 2000),
  motivation_assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ziel für zusammengesetzte Fremdschlüssel (Spieler gehört zur selben Mannschaft wie die Aufstellung)
  unique (id, team_id)
);

create index players_team_id_idx on public.players (team_id);
create unique index players_team_jersey_uidx
  on public.players (team_id, jersey_number)
  where jersey_number is not null;

create trigger players_set_updated_at
  before update on public.players
  for each row execute function private.set_updated_at();

-- Bewertungszeitpunkt wird serverseitig gesetzt, nie vom Client übernommen.
-- Die Ampel selbst wird ausschliesslich manuell gesetzt, nie automatisch abgeleitet.
create or replace function private.players_track_motivation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.motivation_assessed_at := case when new.motivation_status = 'unrated' then null else now() end;
  elsif new.motivation_status is distinct from old.motivation_status
     or new.motivation_note is distinct from old.motivation_note then
    new.motivation_assessed_at := case when new.motivation_status = 'unrated' then null else now() end;
  else
    new.motivation_assessed_at := old.motivation_assessed_at;
  end if;
  return new;
end;
$$;

create trigger players_track_motivation
  before insert or update on public.players
  for each row execute function private.players_track_motivation();

create or replace function private.players_lock_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id then
    raise exception 'team_change_not_allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger players_lock_team
  before update on public.players
  for each row execute function private.players_lock_team();

-- ---------------------------------------------------------------------------
-- lineups & lineup_positions
-- ---------------------------------------------------------------------------
create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null default 'Aktuelle Aufstellung' check (char_length(btrim(name)) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id)
);

create index lineups_team_id_idx on public.lineups (team_id);
-- Pro Mannschaft höchstens eine aktive Aufstellung.
create unique index lineups_one_active_per_team_uidx
  on public.lineups (team_id)
  where is_active;

create trigger lineups_set_updated_at
  before update on public.lineups
  for each row execute function private.set_updated_at();

-- Eine Zeile = ein eingeteilter Spieler. Die sieben Feldpositionen sind über
-- position_code fest identifiziert (Konfiguration + Check-Constraint); eine freie
-- Position hat schlicht keine Zeile. Die Bank (BANK) nimmt beliebig viele Spieler auf.
create table public.lineup_positions (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null,
  team_id uuid not null,
  player_id uuid not null,
  position_code text not null
    check (position_code in ('TW', 'LA', 'RL', 'RM', 'RR', 'RA', 'KM', 'BANK')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lineup_id, team_id) references public.lineups (id, team_id) on delete cascade,
  foreign key (player_id, team_id) references public.players (id, team_id) on delete cascade,
  -- Ein Spieler kommt pro Aufstellung höchstens einmal vor.
  unique (lineup_id, player_id)
);

-- Jede Feldposition ist pro Aufstellung höchstens einmal besetzt.
create unique index lineup_positions_field_uidx
  on public.lineup_positions (lineup_id, position_code)
  where position_code <> 'BANK';
create index lineup_positions_team_id_idx on public.lineup_positions (team_id);
create index lineup_positions_player_id_idx on public.lineup_positions (player_id);

create trigger lineup_positions_set_updated_at
  before update on public.lineup_positions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.players enable row level security;
alter table public.lineups enable row level security;
alter table public.lineup_positions enable row level security;

-- profiles: eigenes Profil und Profile von Teamkolleg:innen lesen, nur eigenes ändern
create policy "profiles_select_self_or_teammates" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_team_with(id));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- teams: Mitglieder lesen, Eigentümer:in ändert/löscht. Anlegen nur über create_team().
create policy "teams_select_members" on public.teams
  for select to authenticated
  using (private.is_team_member(id));

create policy "teams_update_owner" on public.teams
  for update to authenticated
  using (private.is_team_owner(id))
  with check (private.is_team_owner(id));

create policy "teams_delete_owner" on public.teams
  for delete to authenticated
  using (private.is_team_owner(id));

-- team_members: Mitglieder sehen die Mitgliederliste. Hinzufügen/Rollen nur über RPC.
create policy "team_members_select_members" on public.team_members
  for select to authenticated
  using (private.is_team_member(team_id));

create policy "team_members_delete_owner" on public.team_members
  for delete to authenticated
  using (private.is_team_owner(team_id) and role <> 'owner');

-- players: Mitglieder lesen, Trainer:innen (owner/coach) schreiben und löschen
create policy "players_select_members" on public.players
  for select to authenticated
  using (private.is_team_member(team_id));

create policy "players_insert_editors" on public.players
  for insert to authenticated
  with check (private.can_edit_team(team_id));

create policy "players_update_editors" on public.players
  for update to authenticated
  using (private.can_edit_team(team_id))
  with check (private.can_edit_team(team_id));

create policy "players_delete_editors" on public.players
  for delete to authenticated
  using (private.can_edit_team(team_id));

-- lineups: Mitglieder lesen, Trainer:innen dürfen umbenennen
create policy "lineups_select_members" on public.lineups
  for select to authenticated
  using (private.is_team_member(team_id));

create policy "lineups_update_editors" on public.lineups
  for update to authenticated
  using (private.can_edit_team(team_id))
  with check (private.can_edit_team(team_id));

-- lineup_positions: nur lesen. Änderungen ausschliesslich über move_player(),
-- damit jede Umstellung atomar und konsistent ist.
create policy "lineup_positions_select_members" on public.lineup_positions
  for select to authenticated
  using (private.is_team_member(team_id));

-- Unangemeldete Clients erhalten keinerlei Tabellenrechte.
revoke all on public.profiles, public.teams, public.team_members, public.players,
  public.lineups, public.lineup_positions from anon;

-- ---------------------------------------------------------------------------
-- RPC: Mannschaft anlegen
-- ---------------------------------------------------------------------------
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_team uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'invalid_team_name' using errcode = '22023';
  end if;

  insert into public.teams (name, owner_id) values (btrim(p_name), v_user) returning id into v_team;
  insert into public.team_members (team_id, user_id, role) values (v_team, v_user, 'owner');
  insert into public.lineups (team_id) values (v_team);
  return v_team;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Mitglieder verwalten (nur Eigentümer:in)
-- ---------------------------------------------------------------------------
create or replace function public.add_team_member(p_team uuid, p_email text, p_role public.team_role)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not private.is_team_owner(p_team) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
  if v_user is null then
    return 'not_found';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team, v_user, p_role)
  on conflict (team_id, user_id) do nothing;
  if not found then
    return 'exists';
  end if;
  return 'added';
end;
$$;

create or replace function public.set_member_role(p_member uuid, p_role public.team_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.team_members;
begin
  select * into v_member from public.team_members where id = p_member;
  if not found or not private.is_team_owner(v_member.team_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_member.role = 'owner' or p_role = 'owner' then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  update public.team_members set role = p_role where id = p_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Spieler in der Aufstellung bewegen (atomar)
--
-- p_target:     'TW' | 'LA' | 'RL' | 'RM' | 'RR' | 'RA' | 'KM' | 'BANK' | 'NONE'
-- p_bench_index: Zielindex auf der Bank (Index in der Liste ohne den Spieler), null = ans Ende
-- p_displaced:  was mit einem verdrängten Spieler passiert, wenn der bewegte Spieler
--               vorher nicht eingeteilt war: 'bench' (auf die Bank) oder 'none' (entfernen)
--
-- Regeln (identisch zu src/lib/lineup/logic.ts):
--   Feld -> belegtes Feld:   Tausch
--   Bank -> belegtes Feld:   Verdrängter übernimmt den Bankplatz
--   frei -> belegtes Feld:   Verdrängter auf die Bank oder entfernt (p_displaced)
--   * -> BANK / NONE:        Spieler auf die Bank bzw. aus der Aufstellung
-- ---------------------------------------------------------------------------
create or replace function private.compact_bench(p_lineup uuid)
returns void
language sql
set search_path = ''
as $$
  update public.lineup_positions lp
  set sort_order = r.rn - 1
  from (
    select id, row_number() over (order by sort_order, created_at, id) as rn
    from public.lineup_positions
    where lineup_id = p_lineup and position_code = 'BANK'
  ) r
  where lp.id = r.id and lp.sort_order <> r.rn - 1;
$$;

create or replace function public.move_player(
  p_lineup uuid,
  p_player uuid,
  p_target text,
  p_bench_index integer default null,
  p_displaced text default 'bench'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_src_code text;
  v_src_sort integer;
  v_occupant uuid;
  v_count integer;
  v_index integer;
begin
  -- Sperrt die Aufstellung: gleichzeitige Umstellungen werden nacheinander ausgeführt.
  select team_id into v_team from public.lineups where id = p_lineup for update;
  if not found then
    raise exception 'lineup_not_found' using errcode = 'P0002';
  end if;
  if not private.can_edit_team(v_team) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_target is null or p_target not in ('TW', 'LA', 'RL', 'RM', 'RR', 'RA', 'KM', 'BANK', 'NONE') then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_displaced not in ('bench', 'none') then
    raise exception 'invalid_displaced' using errcode = '22023';
  end if;
  perform 1 from public.players where id = p_player and team_id = v_team;
  if not found then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;

  select position_code, sort_order into v_src_code, v_src_sort
  from public.lineup_positions
  where lineup_id = p_lineup and player_id = p_player;

  if p_target = 'NONE' then
    delete from public.lineup_positions where lineup_id = p_lineup and player_id = p_player;
    perform private.compact_bench(p_lineup);
    return;
  end if;

  if p_target = 'BANK' then
    if v_src_code = 'BANK' and p_bench_index is null then
      return;
    end if;
    delete from public.lineup_positions where lineup_id = p_lineup and player_id = p_player;
    perform private.compact_bench(p_lineup);

    select count(*) into v_count
    from public.lineup_positions
    where lineup_id = p_lineup and position_code = 'BANK';
    v_index := least(greatest(coalesce(p_bench_index, v_count), 0), v_count);

    update public.lineup_positions
    set sort_order = sort_order + 1
    where lineup_id = p_lineup and position_code = 'BANK' and sort_order >= v_index;

    insert into public.lineup_positions (lineup_id, team_id, player_id, position_code, sort_order)
    values (p_lineup, v_team, p_player, 'BANK', v_index);
    return;
  end if;

  -- Ziel ist eine Feldposition
  if v_src_code = p_target then
    return;
  end if;

  select player_id into v_occupant
  from public.lineup_positions
  where lineup_id = p_lineup and position_code = p_target;

  delete from public.lineup_positions where lineup_id = p_lineup and player_id = p_player;

  if v_occupant is not null then
    delete from public.lineup_positions where lineup_id = p_lineup and player_id = v_occupant;

    if v_src_code is not null and v_src_code <> 'BANK' then
      insert into public.lineup_positions (lineup_id, team_id, player_id, position_code, sort_order)
      values (p_lineup, v_team, v_occupant, v_src_code, 0);
    elsif v_src_code = 'BANK' then
      insert into public.lineup_positions (lineup_id, team_id, player_id, position_code, sort_order)
      values (p_lineup, v_team, v_occupant, 'BANK', v_src_sort);
    elsif p_displaced = 'bench' then
      insert into public.lineup_positions (lineup_id, team_id, player_id, position_code, sort_order)
      values (
        p_lineup, v_team, v_occupant, 'BANK',
        coalesce((select max(sort_order) + 1 from public.lineup_positions
                  where lineup_id = p_lineup and position_code = 'BANK'), 0)
      );
    end if;
  end if;

  insert into public.lineup_positions (lineup_id, team_id, player_id, position_code, sort_order)
  values (p_lineup, v_team, p_player, p_target, 0);

  perform private.compact_bench(p_lineup);
end;
$$;

revoke execute on function public.create_team(text) from public, anon;
revoke execute on function public.add_team_member(uuid, text, public.team_role) from public, anon;
revoke execute on function public.set_member_role(uuid, public.team_role) from public, anon;
revoke execute on function public.move_player(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.add_team_member(uuid, text, public.team_role) to authenticated;
grant execute on function public.set_member_role(uuid, public.team_role) to authenticated;
grant execute on function public.move_player(uuid, uuid, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: Änderungen an Spielern und Aufstellung an angemeldete Geräte senden
-- (RLS gilt auch für Realtime-Abos).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.players, public.lineup_positions;
  end if;
end;
$$;
