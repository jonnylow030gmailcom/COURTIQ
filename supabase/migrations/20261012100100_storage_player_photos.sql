-- COURT IQ – Privater Speicher für Spielerfotos
-- Pfadschema: {team_id}/{player_id}/{zufälliger_name}.{jpg|png|webp}
-- Zugriff nur für Mitglieder der Mannschaft (lesen) bzw. Trainer:innen (schreiben).
-- Fotos werden im Client über kurzlebige signierte URLs angezeigt.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- Prüft, ob ein Objektpfad zu einem Spieler einer Mannschaft gehört, die der/die
-- angemeldete Benutzer:in bearbeiten darf.
create or replace function private.can_write_player_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.players p
    where p.team_id = private.try_uuid((storage.foldername(p_name))[1])
      and p.id = private.try_uuid((storage.foldername(p_name))[2])
      and private.can_edit_team(p.team_id)
  );
$$;

grant execute on function private.try_uuid(text) to authenticated;
grant execute on function private.can_write_player_photo(text) to authenticated;

create policy "player_photos_select_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'player-photos'
    and private.is_team_member(private.try_uuid((storage.foldername(name))[1]))
  );

create policy "player_photos_insert_editors" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'player-photos'
    and private.can_write_player_photo(name)
  );

create policy "player_photos_update_editors" on storage.objects
  for update to authenticated
  using (bucket_id = 'player-photos' and private.can_write_player_photo(name))
  with check (bucket_id = 'player-photos' and private.can_write_player_photo(name));

create policy "player_photos_delete_editors" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'player-photos'
    and private.can_edit_team(private.try_uuid((storage.foldername(name))[1]))
  );
