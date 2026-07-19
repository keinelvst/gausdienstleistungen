# Datenbank – Stand und Bedienung

Die Datenbank ist **eingerichtet und aktiv** (19.07.2026). Anfragen von der
Website landen automatisch darin, der Adminbereich liest sie aus.

| | |
|---|---|
| Anbieter | Supabase, Gratis-Plan |
| Projekt | `gaus-dienstleistungen` |
| Kennung | `cnshxqkuvtkenrogbjti` |
| Serverstandort | Frankfurt (Deutschland) – wichtig für die DSGVO |
| Dashboard | https://supabase.com/dashboard/project/cnshxqkuvtkenrogbjti |

## Wie du dich anmeldest

Adminbereich: https://keinelvst.github.io/gausdienstleistungen/admin.html
(oder auf der Website ganz unten auf **„Interner Bereich"**)

Anmeldung mit deiner E-Mail-Adresse und dem Passwort, das du im Supabase-
Dashboard unter **Authentication → Users** für dich angelegt hast.

## Wer darf was

Der Schlüssel in der Website (`supabaseAnonKey`, beginnt mit
`sb_publishable_`) ist von Supabase ausdrücklich dafür gemacht, öffentlich
zu sein. Er kann **ausschließlich neue Anfragen anlegen** – nichts lesen,
nichts ändern, nichts löschen. Geprüft am 19.07.2026:

| Versuch ohne Anmeldung | Ergebnis |
|---|---|
| Anfragen lesen | leere Liste |
| Anfragen ändern | 0 Zeilen betroffen |
| Anfragen löschen | 0 Zeilen betroffen |
| sich selbst freischalten | abgewiesen (401) |

Gelesen werden darf nur von den Adressen in der Tabelle `gaus_admins`.
Zusätzlich ist die **Selbstregistrierung abgeschaltet** – niemand kann sich
in deinem Projekt ein Konto anlegen.

> ⚠️ Der Schlüssel `sb_secret_…` im Dashboard hebelt jeden Schutz aus.
> Der darf **niemals** in die Website, in ein Chatfenster oder in eine E-Mail.

## Eine weitere Person freischalten

Im Dashboard unter **SQL Editor** ausführen:

```sql
insert into public.gaus_admins (email) values ('neue.adresse@example.com')
on conflict (email) do nothing;
```

Und unter **Authentication → Users** einen Benutzer mit derselben Adresse
anlegen (Haken bei *Auto Confirm User* setzen).

## Tabellen

- `gaus_anfragen` – alle eingegangenen Anfragen samt Adressen, Maßen und Preis
- `gaus_touren` – die im Tourenplaner gespeicherten Routen
- `gaus_admins` – Freigabeliste für den Adminbereich

Das komplette Skript liegt als `datenbank.sql` im Projektordner und kann
gefahrlos erneut ausgeführt werden.

## Pausiertes Projekt

Um Platz im Gratis-Plan zu schaffen, wurde das alte Projekt
*„keinelvst@gmail.com's Project"* (die Vorstufe der Fußball-App mit
`players`, `matches`, `sponsors`, `sponsor_inquiries`) **pausiert, nicht
gelöscht**. Die Daten sind vollständig erhalten und **90 Tage lang** wieder
einschaltbar; danach bleiben nur herunterladbare Sicherungskopien.
`footylab` wurde nicht angefasst.

## Noch offen: Datenschutzerklärung

Da jetzt Kundenadressen gespeichert werden, ist eine **Datenschutzerklärung
Pflicht** (DSGVO Art. 13). Sie muss nennen:

- wer du bist (Name, Anschrift, Kontakt),
- welche Daten gespeichert werden (Adressen, Kontaktdaten, Angaben zur Sendung),
- wozu (Bearbeitung der Anfrage und Durchführung des Transports),
- auf welcher Grundlage (Art. 6 Abs. 1 lit. b DSGVO – vorvertragliche Maßnahme),
- wie lange (Vorschlag: Anfragen ohne Auftrag nach 6 Monaten löschen,
  Aufträge 10 Jahre wegen der steuerlichen Aufbewahrungspflicht),
- dass Supabase als Auftragsverarbeiter eingesetzt wird (Server Frankfurt),
- die Rechte der Kunden (Auskunft, Löschung, Widerspruch, Beschwerde).

Kostenlose Generatoren: `e-recht24.de` oder `datenschutz-generator.de`.
