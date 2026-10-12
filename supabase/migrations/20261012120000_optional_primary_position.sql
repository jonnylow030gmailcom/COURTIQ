-- Bevorzugte Position optional: z. B. bei importierten Kadern, deren Quelle nur
-- „Feldspieler“ angibt. Keine erfundenen Positionen – offen lassen, bis der Trainer sie setzt.
alter table public.players alter column primary_position drop not null;
