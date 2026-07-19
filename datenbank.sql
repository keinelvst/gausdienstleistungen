-- ════════════════════════════════════════════════════════════════════
--  Gaus Dienstleistungen – Datenbank für Anfragen und Touren
--  ------------------------------------------------------------------
--  Dieses Skript im Supabase-Projekt unter "SQL Editor" komplett
--  einfügen und auf "Run" klicken. Es kann gefahrlos mehrfach
--  ausgeführt werden (es legt nur an, was noch nicht existiert).
--  Anleitung: siehe SUPABASE-EINRICHTUNG.md
-- ════════════════════════════════════════════════════════════════════

-- ── Tabelle 1: Anfragen ─────────────────────────────────────────────
create table if not exists public.anfragen (
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

create index if not exists anfragen_erstellt_am_idx on public.anfragen (erstellt_am desc);
create index if not exists anfragen_status_idx      on public.anfragen (status);

-- ── Tabelle 2: Geplante Touren ──────────────────────────────────────
create table if not exists public.touren (
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

create index if not exists touren_datum_idx on public.touren (datum desc);

-- ── Zugriffsschutz (Row Level Security) ─────────────────────────────
-- Ohne diesen Block könnte jeder im Internet alle Kundendaten lesen.
alter table public.anfragen enable row level security;
alter table public.touren   enable row level security;

-- Alte Regeln entfernen, damit das Skript wiederholbar bleibt
drop policy if exists "anfrage_anlegen_oeffentlich" on public.anfragen;
drop policy if exists "anfragen_admin_lesen"        on public.anfragen;
drop policy if exists "anfragen_admin_aendern"      on public.anfragen;
drop policy if exists "anfragen_admin_loeschen"     on public.anfragen;
drop policy if exists "touren_admin_alles"          on public.touren;

-- Die Website darf Anfragen ANLEGEN – aber nichts lesen, ändern, löschen.
create policy "anfrage_anlegen_oeffentlich"
  on public.anfragen for insert to anon
  with check (true);

-- Nur angemeldete Admins (dein Login) dürfen Anfragen sehen und bearbeiten.
create policy "anfragen_admin_lesen"
  on public.anfragen for select to authenticated using (true);
create policy "anfragen_admin_aendern"
  on public.anfragen for update to authenticated using (true) with check (true);
create policy "anfragen_admin_loeschen"
  on public.anfragen for delete to authenticated using (true);

-- Touren: ausschließlich für angemeldete Admins.
create policy "touren_admin_alles"
  on public.touren for all to authenticated using (true) with check (true);

-- ── Spam-Bremse ─────────────────────────────────────────────────────
-- Verhindert, dass jemand die Datenbank mit Tausenden Anfragen flutet:
-- Aus derselben Minute werden höchstens 20 Anfragen angenommen.
create or replace function public.anfragen_ratelimit()
returns trigger language plpgsql security definer as $$
declare anzahl int;
begin
  select count(*) into anzahl from public.anfragen
   where erstellt_am > now() - interval '1 minute';
  if anzahl >= 20 then
    raise exception 'Zu viele Anfragen in kurzer Zeit. Bitte kurz warten.';
  end if;
  return new;
end $$;

drop trigger if exists anfragen_ratelimit_trg on public.anfragen;
create trigger anfragen_ratelimit_trg
  before insert on public.anfragen
  for each row execute function public.anfragen_ratelimit();
