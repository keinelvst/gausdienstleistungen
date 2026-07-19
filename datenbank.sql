-- ════════════════════════════════════════════════════════════════════
--  Gaus Dienstleistungen – Datenbank für Anfragen und Touren
--  ------------------------------------------------------------------
--  Dieses Skript im Supabase-Projekt unter "SQL Editor" komplett
--  einfügen und auf "Run" klicken. Es kann gefahrlos mehrfach
--  ausgeführt werden (es legt nur an, was noch nicht existiert).
--
--  WICHTIG: Dieses Projekt wird mit einer anderen Anwendung geteilt.
--  Deshalb heißen alle Tabellen "gaus_..." und der Lesezugriff ist
--  fest auf die Adressen in gaus_admins eingesperrt – ein normaler
--  Benutzer der anderen Anwendung kommt an die Kundendaten NICHT heran.
--
--  Anleitung: siehe SUPABASE-EINRICHTUNG.md
-- ════════════════════════════════════════════════════════════════════

-- ── Tabelle 0: Wer darf in den Adminbereich? ────────────────────────
create table if not exists public.gaus_admins (
  email text primary key
);

-- Prüffunktion. "security definer" ist nötig, damit die Prüfung selbst
-- nicht wieder durch die Zugriffsregeln läuft (Endlosschleife).
create or replace function public.ist_gaus_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.gaus_admins
     where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ── Tabelle 1: Anfragen ─────────────────────────────────────────────
create table if not exists public.gaus_anfragen (
  id            uuid primary key default gen_random_uuid(),
  erstellt_am   timestamptz not null default now(),

  -- "beiladung_hin" | "beiladung_rueck" | "sonderfahrt" | "putzservice"
  bereich       text not null,
  -- "neu" | "angenommen" | "abgelehnt" | "erledigt"
  status        text not null default 'neu',

  name          text,
  telefon       text,
  wunschtermin  date,
  preis_eur     numeric,

  -- Abholung / Einsatzort
  abhol_label   text,
  abhol_lat     double precision,
  abhol_lon     double precision,
  abhol_etage   int,
  abhol_aufzug  boolean,

  -- Lieferung (bei Putzservice leer)
  liefer_label  text,
  liefer_lat    double precision,
  liefer_lon    double precision,
  liefer_etage  int,
  liefer_aufzug boolean,

  volumen_m3    numeric,
  gewicht_kg    numeric,

  -- Vollständige Anfrage als JSON (Gegenstände, Preisaufschlüsselung, …)
  daten         jsonb,
  -- Freie Notiz, nur im Adminbereich
  notiz         text
);

create index if not exists gaus_anfragen_erstellt_am_idx on public.gaus_anfragen (erstellt_am desc);
create index if not exists gaus_anfragen_status_idx      on public.gaus_anfragen (status);

-- ── Tabelle 2: Geplante Touren ──────────────────────────────────────
create table if not exists public.gaus_touren (
  id            uuid primary key default gen_random_uuid(),
  erstellt_am   timestamptz not null default now(),
  name          text,
  datum         date,
  richtung      text,               -- "hin" | "rueck"
  -- Stopps in der geplanten Reihenfolge, inkl. Koordinaten und Anfrage-ID
  stopps        jsonb not null default '[]'::jsonb,
  dauer_sek     int,
  distanz_km    numeric,
  notiz         text
);

create index if not exists gaus_touren_datum_idx on public.gaus_touren (datum desc);

-- ── Zugriffsschutz (Row Level Security) ─────────────────────────────
-- Ohne diesen Block könnte jeder alle Kundendaten lesen.
alter table public.gaus_admins   enable row level security;
alter table public.gaus_anfragen enable row level security;
alter table public.gaus_touren   enable row level security;

-- Alte Regeln entfernen, damit das Skript wiederholbar bleibt
drop policy if exists "gaus_anfrage_anlegen_oeffentlich" on public.gaus_anfragen;
drop policy if exists "gaus_anfragen_admin_lesen"        on public.gaus_anfragen;
drop policy if exists "gaus_anfragen_admin_aendern"      on public.gaus_anfragen;
drop policy if exists "gaus_anfragen_admin_loeschen"     on public.gaus_anfragen;
drop policy if exists "gaus_touren_admin_alles"          on public.gaus_touren;
drop policy if exists "gaus_admins_selbst_lesen"         on public.gaus_admins;

-- Die Website darf Anfragen ANLEGEN – aber nichts lesen, ändern, löschen.
create policy "gaus_anfrage_anlegen_oeffentlich"
  on public.gaus_anfragen for insert to anon
  with check (true);

-- Lesen, Ändern, Löschen NUR für Adressen aus gaus_admins.
create policy "gaus_anfragen_admin_lesen"
  on public.gaus_anfragen for select to authenticated using (public.ist_gaus_admin());
create policy "gaus_anfragen_admin_aendern"
  on public.gaus_anfragen for update to authenticated
  using (public.ist_gaus_admin()) with check (public.ist_gaus_admin());
create policy "gaus_anfragen_admin_loeschen"
  on public.gaus_anfragen for delete to authenticated using (public.ist_gaus_admin());

create policy "gaus_touren_admin_alles"
  on public.gaus_touren for all to authenticated
  using (public.ist_gaus_admin()) with check (public.ist_gaus_admin());

-- Die Freigabeliste selbst ist für niemanden über die Website lesbar;
-- geändert wird sie ausschließlich hier im SQL Editor.
create policy "gaus_admins_selbst_lesen"
  on public.gaus_admins for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ── Spam-Bremse ─────────────────────────────────────────────────────
-- Verhindert, dass jemand die Datenbank mit Tausenden Anfragen flutet:
-- Aus derselben Minute werden höchstens 20 Anfragen angenommen.
create or replace function public.gaus_anfragen_ratelimit()
returns trigger language plpgsql security definer
set search_path = public as $$
declare anzahl int;
begin
  select count(*) into anzahl from public.gaus_anfragen
   where erstellt_am > now() - interval '1 minute';
  if anzahl >= 20 then
    raise exception 'Zu viele Anfragen in kurzer Zeit. Bitte kurz warten.';
  end if;
  return new;
end $$;

drop trigger if exists gaus_anfragen_ratelimit_trg on public.gaus_anfragen;
create trigger gaus_anfragen_ratelimit_trg
  before insert on public.gaus_anfragen
  for each row execute function public.gaus_anfragen_ratelimit();

-- ════════════════════════════════════════════════════════════════════
--  ZUM SCHLUSS: Deine E-Mail-Adresse freischalten
--  Trage hier die Adresse ein, mit der du dich im Adminbereich
--  anmeldest – klein geschrieben. Ohne diese Zeile siehst du im
--  Adminbereich nichts, auch wenn die Anmeldung klappt.
-- ════════════════════════════════════════════════════════════════════
insert into public.gaus_admins (email)
values ('keinelvst@gmail.com'), ('gaus.julian6@gmail.com')
on conflict (email) do nothing;
