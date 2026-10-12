-- COURT IQ – Datierte Trainer-Notizen pro Spieler
-- Jede Notiz hat ein vom Trainer gewähltes Datum und bleibt dauerhaft im Profil sichtbar.

create table public.player_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  player_id uuid not null,
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  note_date date not null default current_date check (note_date >= date '1900-01-01'),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Notiz gehört immer zu einem Spieler derselben Mannschaft
  foreign key (player_id, team_id) references public.players (id, team_id) on delete cascade
);

create index player_notes_player_date_idx on public.player_notes (player_id, note_date desc, created_at desc);
create index player_notes_team_id_idx on public.player_notes (team_id);
create index player_notes_author_id_idx on public.player_notes (author_id);

create trigger player_notes_set_updated_at
  before update on public.player_notes
  for each row execute function private.set_updated_at();

-- Verfasser:in und Zuordnung sind nach dem Anlegen unveränderlich.
create or replace function private.player_notes_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.author_id is distinct from old.author_id
     or new.player_id is distinct from old.player_id
     or new.team_id is distinct from old.team_id then
    raise exception 'note_owner_change_not_allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger player_notes_lock
  before update on public.player_notes
  for each row execute function private.player_notes_lock();

alter table public.player_notes enable row level security;

-- Lesen: alle Mitglieder der Mannschaft
create policy "player_notes_select_members" on public.player_notes
  for select to authenticated
  using (private.is_team_member(team_id));

-- Anlegen: Trainer:innen (owner/coach), immer im eigenen Namen
create policy "player_notes_insert_editors" on public.player_notes
  for insert to authenticated
  with check (private.can_edit_team(team_id) and author_id = (select auth.uid()));

-- Ändern: nur die eigene Notiz
create policy "player_notes_update_author" on public.player_notes
  for update to authenticated
  using (author_id = (select auth.uid()) and private.can_edit_team(team_id))
  with check (author_id = (select auth.uid()) and private.can_edit_team(team_id));

-- Löschen: eigene Notiz oder Eigentümer:in der Mannschaft
create policy "player_notes_delete_author_or_owner" on public.player_notes
  for delete to authenticated
  using (
    (author_id = (select auth.uid()) and private.can_edit_team(team_id))
    or private.is_team_owner(team_id)
  );

revoke all on public.player_notes from anon;
