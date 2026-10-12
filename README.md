# COURT IQ

Mit COURT IQ verwalten und analysieren Handballtrainer:innen ihre Mannschaft. Die App bietet ein interaktives Spielfeld mit sieben Startpositionen und einer beliebig grossen Ersatzbank, eine filterbare Teamübersicht und ausführliche Spielerprofile mit Stärken, Verhalten, Notizen und einer Motivationsampel.

Alle Ansichten nutzen denselben Datenbestand in Supabase (PostgreSQL). Er wird live zwischen Geräten abgeglichen.

---

## Funktionen

| Bereich | Inhalt |
| --- | --- |
| **Dashboard** | Anzahl Spieler, Startaufstellung (x/7), Bank, nicht eingeteilte Spieler, Verteilung der Motivationsampel, zuletzt bearbeitete Spieler. Bei leerer Mannschaft erscheint ein Hinweis mit Schaltfläche zum Anlegen. |
| **Spielfeld** | Spielfeldhälfte als SVG im Meter-Massstab: 6-m-Torraum, gestrichelte 9-m-Linie, 7-m-Marke, 4-m-Torwartgrenze, Tor, Auswechsellinien. Sieben feste Positionen (TW, LA, RL, RM, RR, RA, KM). Drag-and-drop mit Maus und Touch, Ersatzbank ohne Obergrenze, Bereich „Nicht eingeteilt“. Dialoge zum Zuordnen, Tauschen und Entfernen. |
| **Team** | Tabelle (Tablet/Desktop) bzw. Karten (Smartphone). Suche nach Vor- und Nachname (unabhängig von Akzenten), Filter nach Position und Motivation, Sortierung nach Name, Alter, Position und Motivation. Aktionen: öffnen, bearbeiten, löschen. |
| **Spieler** | Kartenübersicht, Formular zum Anlegen/Bearbeiten (Stammdaten, Positionen, Stärken/Schwächen, Angriff, Abwehr, Motivation, Notizen) und Detailprofil mit allen Aktionen. |
| **Einstellungen** | Mannschaftsname, Trainerteam mit Rollen, Farbschema (Hell/Dunkel/System), eigenes Konto, Datenschutzhinweise. |

## Technik

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui (Base UI) · Lucide · Supabase (Auth, PostgreSQL, Storage, Realtime) · dnd-kit · React Hook Form + Zod · Vitest · Schrift **Exo** über `next/font/google`. Die Schrift wird beim Build heruntergeladen und selbst ausgeliefert, im Browser entsteht keine Verbindung zu Google.

```
src/
  app/                     Routen (App Router)
    (app)/                 Geschützter Bereich: Dashboard, Spielfeld, Team, Spieler, Einstellungen
    login/ onboarding/     Anmeldung, Registrierung, Mannschaft anlegen
    auth/confirm|signout   E-Mail-Bestätigung, Abmelden
  proxy.ts                 Session-Erneuerung + Umleitung zur Anmeldung (Next 16: früher „middleware“)
  components/
    court/                 Spielfeld, Spielerpunkte, Drag-and-drop, Zuordnungsdialoge
    player/                Formular, Profil, Foto, Ampel, Stichworte
    team/ dashboard/ settings/ layout/ ui/
    providers/             TeamDataProvider = gemeinsame Datenquelle aller Ansichten
  lib/
    domain/                Positionen, Spielfeldgeometrie, Motivation, Formatierung (rein, ohne I/O)
    lineup/logic.ts        Aufstellungsregeln (rein, getestet, identisch zur SQL-Funktion)
    team/list.ts           Filter/Sortierung der Teamliste
    validation/            Zod-Schemas
    data/                  Datenzugriff (Supabase), Fehlerübersetzung
    supabase/ auth/        Clients (Browser/Server/Proxy), Session-Ermittlung
  types/database.ts        Typen des Datenbankschemas
supabase/migrations/       Versionierte SQL-Migrationen (Schema, RLS, Storage)
tests/unit/                Unit-Tests (Logik, Validierung, Geometrie, Liste)
tests/integration/         Tests gegen eine echte Supabase-Instanz (RLS, Aufstellung, Storage)
```

### Datenfluss

- Ein **TeamDataProvider** lädt Spieler und aktive Aufstellung einmal und stellt sie allen Ansichten bereit. Eine Änderung im Profil ist daher sofort auch im Spielfeld und in der Teamliste sichtbar.
- **Supabase Realtime** meldet Änderungen anderer Geräte an `players` und `lineup_positions`. RLS gilt auch hier. Zusätzlich wird beim Zurückkehren in den Tab und nach einem Verbindungsabbruch neu abgeglichen.
- **Aufstellungsänderungen** werden sofort angezeigt, aber strikt nacheinander in eine Warteschlange gestellt und über die Datenbankfunktion `move_player` gespeichert. Ist die Warteschlange leer, wird der Stand vom Server geladen. Schlägt eine Aktion fehl, erscheint eine Meldung und die Anzeige springt automatisch auf den gespeicherten Stand zurück.
- Die Datenbank ist die maßgebliche Quelle. Nach einem Neuladen der Seite geht keine gespeicherte Änderung verloren.

### Datenmodell

| Tabelle | Zweck |
| --- | --- |
| `profiles` | Anzeigename, 1:1 zu `auth.users` (wird per Trigger angelegt) |
| `teams` | Mannschaft mit `owner_id` |
| `team_members` | Mitgliedschaft + Rolle `owner` / `coach` / `viewer`, eindeutig je Team und Benutzer:in |
| `players` | Stammdaten, Positionen, Stichwort-Arrays + Freitexte, Motivation (`motivation_status`, `motivation_note`, `motivation_assessed_at`) |
| `lineups` | Aufstellungen; per Teil-Index höchstens **eine aktive** je Mannschaft |
| `lineup_positions` | Eine Zeile pro eingeteiltem Spieler: `position_code` ∈ {TW, LA, RL, RM, RR, RA, KM, BANK}, `sort_order` für die Bank |

Abweichungen vom Ursprungsentwurf und warum:

- **`lineup_positions.player_id` ist Pflicht.** Eine freie Position hat einfach keine Zeile. Die sieben Feldpositionen sind über `position_code` fest identifiziert (zentrale Konfiguration `src/lib/domain/positions.ts` + Check-Constraint). Dadurch löscht `ON DELETE CASCADE` beim Löschen eines Spielers seine Zuordnung sauber mit, und es gibt keine Zeilen mit „Bank ohne Spieler“.
- **Konsistenzregeln in der Datenbank:** `UNIQUE (lineup_id, player_id)` (ein Spieler höchstens einmal je Aufstellung) und ein Teil-Unique-Index auf `(lineup_id, position_code)` für alle Feldpositionen. Die Bank ist davon ausgenommen und hat **keine Obergrenze**.
- **Teamgrenzen per zusammengesetzten Fremdschlüsseln:** `lineup_positions.team_id` verweist auf `(lineup_id, team_id)` und `(player_id, team_id)`. So kann ein Spieler eines Teams nie in die Aufstellung eines anderen Teams geraten.
- **Strukturiert und Freitext zugleich:** `strengths`, `weaknesses`, `attack_traits`, `defense_traits` sind Stichwortlisten (`text[]`), dazu gibt es jeweils Freitext.
- **Alter** wird nie gespeichert, sondern aus `birth_date` berechnet.
- **`motivation_assessed_at`** setzt ein Trigger auf dem Server, wann immer sich Status oder Begründung ändern. Die Ampel selbst wird nur manuell gesetzt und nie automatisch abgeleitet.
- `updated_at` wird per Trigger gepflegt, alle Primärschlüssel sind UUIDs.

### Aufstellungsregeln (`move_player`)

| Aktion | Ergebnis |
| --- | --- |
| Feld → freie Feldposition | Verschieben (im Dialog mit Rückfrage, damit nichts unbemerkt passiert) |
| Feld → belegte Feldposition | **Tausch** |
| Bank → belegte Feldposition | Verdrängter Spieler übernimmt den Bankplatz |
| Nicht eingeteilt → belegte Feldposition | Rückfrage: Verdrängten auf die Bank oder aus der Aufstellung nehmen (beim Ziehen: auf die Bank) |
| → Bank / Bankplatz | Anhängen bzw. an der Stelle einfügen (Umsortieren) |
| → „Nicht eingeteilt“ | Aus der Aufstellung entfernen |

Die Funktion sperrt die Aufstellungszeile (`FOR UPDATE`). Gleichzeitige Aktionen von zwei Geräten laufen deshalb nacheinander und können keinen inkonsistenten Zustand erzeugen. Dieselben Regeln stehen als reine TypeScript-Funktion in `src/lib/lineup/logic.ts` und sind getestet.

### Sicherheit

- **RLS ist auf allen Tabellen aktiv.** Die Mitgliedschaft ergibt sich ausschliesslich aus `team_members` und `auth.uid()`, nie aus Angaben des Clients. Die Hilfsfunktionen liegen im nicht veröffentlichten Schema `private`.
- **Lesen:** alle Mitglieder. **Spieler anlegen, bearbeiten, löschen und Aufstellung ändern:** `owner` und `coach`. **Mannschaft umbenennen und Mitglieder verwalten:** nur `owner`. `viewer` kann nur lesen.
- `lineup_positions` lässt sich nicht direkt beschreiben, Änderungen laufen nur über `move_player` (mit Rechteprüfung).
- Unangemeldete Besucher (`anon`) erhalten keine Tabellenrechte.
- **Fotos:** Sie liegen im privaten Bucket `player-photos` unter dem Pfad `{team_id}/{player_id}/{zufall}.webp`. Storage-Richtlinien prüfen dieselben Teamgrenzen, und ein Hochladen ist nur für einen Spieler des eigenen Teams möglich. Angezeigt werden die Fotos über signierte URLs mit einer Stunde Gültigkeit. Vor dem Upload verkleinert der Browser das Bild auf höchstens 1024 px und entfernt dabei Metadaten wie GPS-Daten. Es gibt keine Bilder als Base64 in der Datenbank.
- Der **Service-Role-Key wird nie im Frontend verwendet**, nur optional in lokalen Integrationstests.
- Sicherheits-Header: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Suchmaschinen-Indexierung ist abgeschaltet (`robots: noindex`).

---

## Einrichtung

### 1. Lokal installieren und starten

Voraussetzung: Node.js 24 (LTS) und npm.

```bash
npm install
cp .env.example .env.local   # Werte eintragen (Schritt 3)
npm run dev                  # http://localhost:3000
```

### 2. Supabase-Projekt konfigurieren

1. Unter [supabase.com](https://supabase.com) ein Projekt anlegen. Für den Einsatz in der EU eine EU-Region wählen, z. B. Frankfurt (`eu-central-1`).
2. **Authentication → Sign In / Providers → Email**: aktiviert lassen. „Confirm email“ sollte für den Produktivbetrieb **an** sein.
3. **Authentication → URL Configuration**:
   - *Site URL*: die Produktions-URL, z. B. `https://court-iq.vercel.app`
   - *Redirect URLs*: `http://localhost:3000/auth/confirm` und `https://<deine-domain>/auth/confirm`
4. Optional unter **Authentication → Emails**: die Bestätigungsmail auf Deutsch anpassen. Der Link `{{ .ConfirmationURL }}` funktioniert ohne Änderung.
5. Hinweis: Der eingebaute Supabase-Mailversand ist stark begrenzt (wenige Mails pro Stunde). Für echten Betrieb unter **Authentication → SMTP** einen eigenen SMTP-Server eintragen.

### 3. Umgebungsvariablen

Aus **Project Settings → API Keys** in `.env.local` eintragen:

| Variable | Wert |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable Key (`sb_publishable_…`) oder der ältere `anon`-Key |

### 4. Datenbankmigrationen ausführen

Variante A, Supabase CLI (empfohlen):

```bash
npx supabase login
npx supabase init            # einmalig, legt supabase/config.toml an (Migrationen bleiben erhalten)
npx supabase link --project-ref <project-ref>
npx supabase db push         # spielt supabase/migrations/*.sql ein
```

Variante B, ohne CLI: Die Dateien aus `supabase/migrations/` **in Namensreihenfolge** im Supabase-Dashboard unter **SQL Editor** ausführen.

Danach prüfen:
- **Database → Tables**: Bei allen sechs Tabellen ist „RLS enabled“ zu sehen.
- **Storage**: Der Bucket `player-photos` existiert und ist **privat**.
- **Database → Publications → supabase_realtime**: `players` und `lineup_positions` sind enthalten.

### 5. Repository zu GitHub pushen

```bash
git remote add origin https://github.com/jonnylow030gmailcom/COURTIQ.git
git push -u origin main
```

`.env.local` und `.env.test.local` werden durch `.gitignore` nie eingecheckt. Die Spielerdaten liegen nur in Supabase, nie im Repository. Bei jedem Push prüft GitHub Actions (`.github/workflows/ci.yml`) Lint, Typen, Tests und Build.

### 6. Deployment mit GitHub verbinden (Vercel)

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden: **Add New → Project → `COURTIQ` importieren**. Next.js wird automatisch erkannt.
2. Unter **Environment Variables** beide `NEXT_PUBLIC_SUPABASE_*`-Werte eintragen (Production und Preview).
3. **Deploy**. Danach startet jeder Push auf `main` ein Produktions-Deployment, jeder Pull Request ein Vorschau-Deployment.
4. Die Vercel-URL in Supabase als *Site URL* und *Redirect URL* eintragen (siehe Schritt 2.3).

### 7. Produktion starten

Die App öffnen, unter **Registrieren** ein Konto anlegen und die E-Mail bestätigen. Danach die **Mannschaft anlegen**: Du wirst automatisch Eigentümer:in und die aktive Aufstellung entsteht dabei. Weitere Trainer:innen registrieren sich selbst und werden anschliessend unter **Einstellungen → Trainerteam** per E-Mail hinzugefügt.

Lokal lässt sich der Produktionsbuild so starten:

```bash
npm run build
npm start
```

---

## Qualitätssicherung

```bash
npm run lint          # ESLint (inkl. React-Compiler-Regeln)
npm run typecheck     # Routen-Typen erzeugen + tsc --noEmit
npm test              # Unit-Tests (Vitest)
npm run test:integration   # Tests gegen eine echte Test-Instanz (siehe unten)
npm run build         # Produktionsbuild
```

**Integrationstests** (`tests/integration/supabase-rls.test.ts`): Lege dafür eine eigene Test-Instanz an, nie Produktion. Trage dann in `.env.test.local` `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY` und `SUPABASE_TEST_SERVICE_ROLE_KEY` ein. Der Test legt eigene Testkonten an und löscht sie am Ende wieder. Er prüft unter anderem:
- Anlegen und Wiederfinden von Spielern sowie die Constraints (Position, eindeutige Trikotnummer)
- den Bewertungszeitpunkt, der serverseitig gesetzt wird
- Zuordnen, Bank → Feld, Tausch, Feld → Bank und gleichzeitige Aktionen ohne Inkonsistenz
- dass das Löschen eines Spielers auch seine Zuordnung entfernt
- Foto-Upload, signierte URL, keinen öffentlichen Zugriff, keinen fremden Upload
- dass eine andere Mannschaft weder lesen noch schreiben noch umstellen kann
- dass die Rolle „Nur lesen“ wirklich nur lesen kann und unangemeldete Clients nichts sehen

Ohne Zugangsdaten werden diese Tests übersprungen.

---

## Datenschutz (DSGVO) – vor dem produktiven Einsatz klären

In Handballmannschaften spielen oft **Minderjährige**. Die Technik ist darauf ausgelegt: keine öffentlichen Profile, keine öffentliche Suche, private Fotos, Zugriff nur über Teamrollen, nur nötige Felder (Geburtsdatum, Grösse und Wurfhand sind optional). Folgende Punkte muss der Verein bzw. der Betreiber noch **organisatorisch** klären:

1. **Rechtsgrundlage und Einwilligung:** Für Fotos und Trainerbewertungen von Minderjährigen eine schriftliche Einwilligung der Erziehungsberechtigten einholen (Art. 6 Abs. 1 lit. a, Art. 8 DSGVO; KUG für Fotos). Den Zweck klar festlegen.
2. **Auftragsverarbeitung:** Mit Supabase (und ggf. Vercel) einen AV-Vertrag abschliessen (DPA im Dashboard) und die **EU-Region** wählen. Drittlandtransfers (USA) und die Standardvertragsklauseln dokumentieren.
3. **Informationspflichten (Art. 13/14):** Spieler:innen und Eltern informieren, welche Daten zu welchem Zweck verarbeitet werden. Dazu gehört auch, dass es eine interne Motivationsbewertung gibt.
4. **Verzeichnis von Verarbeitungstätigkeiten** im Verein ergänzen.
5. **Löschkonzept:** Spieler, die den Verein verlassen, löschen. Das Löschen entfernt Daten, Zuordnung und Fotos. Aufbewahrungsfristen festlegen.
6. **Auskunft und Export (Art. 15/20):** Bisher gibt es nur die Anzeige im Profil, eine Exportfunktion fehlt noch.
7. **Zugriff:** Nur berechtigte Trainer:innen aufnehmen und ausscheidende Trainer:innen sofort entfernen. Die Rolle „Nur lesen“ für Betreuer:innen nutzen.
8. **Motivationsampel:** Sie ist eine interne Beobachtung und kein Persönlichkeitsprofil. Formulierungen in den Begründungen sachlich halten.
9. **Konten:** Für den Produktivbetrieb E-Mail-Bestätigung und eigenes SMTP aktivieren. Optional die Passwortrichtlinie und den Leaked-Password-Schutz in Supabase Auth einschalten.

---

## Noch offen / bewusste Grenzen

- **Passwort vergessen** und **Einladungs-Mails** gibt es noch nicht. Mitglieder werden über die E-Mail eines bestehenden Kontos hinzugefügt.
- Pro Konto wird die **erste** Mannschaft verwendet. Das Datenmodell unterstützt mehrere Mannschaften, Aufstellungen und Trainer:innen; ein Teamwechsler in der Oberfläche fehlt noch.
- Wer gleichzeitig mit einem anderen Gerät dasselbe Spielerprofil bearbeitet, überschreibt dessen Änderungen („last write wins“). Für die Aufstellung gilt das nicht, dort sorgt die Zeilensperre für Konsistenz.
- **End-to-End-Tests im Browser** (Playwright) sind noch nicht eingerichtet. Die zentralen Abläufe decken die Unit- und Integrationstests ab. Die Bedienung im Browser mit echter Datenbank (inkl. Tablet-Ansicht) steht noch aus.
- `next.config.ts`: `cacheComponents` ist **aus**. Alle Seiten sind personalisiert, die Daten kommen über Supabase im Client mit Echtzeit-Abgleich. Das vermeidet Suspense-Pflichten für jede Seite mit Anmeldung.
