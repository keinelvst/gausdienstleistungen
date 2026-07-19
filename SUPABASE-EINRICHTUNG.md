# Datenbank einrichten (ca. 10 Minuten, kostenlos)

Damit du im Adminbereich alle Anfragen siehst, müssen sie irgendwo gespeichert
werden. Dafür nutzen wir **Supabase** – kostenlos, kein Zahlungsmittel nötig.

Der Adminbereich funktioniert auch **ohne** diese Einrichtung: Er läuft dann im
Übungsmodus mit Beispieldaten auf deinem Gerät, damit du den Tourenplaner
ausprobieren kannst. Echte Kundenanfragen kommen erst nach diesen Schritten an.

---

## Schritt 1 – Konto anlegen

1. Gehe auf **https://supabase.com** und klicke oben rechts auf *Start your project*.
2. Melde dich mit deinem GitHub-Konto an (dasselbe, mit dem die Website
   veröffentlicht wird) – das ist am schnellsten.

## Schritt 2 – Projekt erstellen

1. Klicke auf **New project**.
2. *Name*: `gaus-dienstleistungen`
3. *Database Password*: Klicke auf **Generate a password** und **speichere das
   Passwort in deinem Passwort-Manager**. Du brauchst es später wahrscheinlich
   nie wieder, aber es lässt sich nicht nachschauen.
4. *Region*: **Central EU (Frankfurt)** – wichtig, damit die Kundendaten in
   Deutschland liegen (DSGVO).
5. *Plan*: **Free**.
6. **Create new project** – die Einrichtung dauert ein bis zwei Minuten.

## Schritt 3 – Tabellen anlegen

1. Links in der Leiste auf **SQL Editor** klicken.
2. Öffne die Datei `datenbank.sql` aus deinem Projektordner mit dem Editor
   (Rechtsklick → *Öffnen mit* → *Editor*), markiere alles (`Strg+A`) und
   kopiere es (`Strg+C`).
3. Füge es im SQL Editor ein (`Strg+V`) und klicke unten rechts auf **Run**.
4. Es sollte *Success. No rows returned* erscheinen. Fertig.

## Schritt 4 – Deinen Admin-Login anlegen

1. Links auf **Authentication** → **Users** → Button **Add user** →
   *Create new user*.
2. *Email*: deine E-Mail-Adresse.
3. *Password*: ein Passwort, das du dir merkst (mindestens 8 Zeichen).
4. Häkchen bei **Auto Confirm User** setzen – sonst kannst du dich nicht
   anmelden.
5. **Create user**.

> Mit dieser E-Mail und diesem Passwort meldest du dich später im Adminbereich
> an. Es ist das einzige Konto – lege dir keine weiteren an.

## Schritt 5 – Die zwei Schlüssel abholen

1. Links ganz unten auf **Project Settings** (Zahnrad) → **API**.
2. Dort stehen zwei Werte, die ich brauche:
   - **Project URL** – sieht aus wie `https://abcdefghijkl.supabase.co`
   - **Project API keys → `anon` `public`** – ein sehr langer Text, der mit
     `eyJ...` beginnt

**Schicke mir diese zwei Werte.** Beide sind dafür gemacht, öffentlich in einer
Website zu stehen – sie erlauben nur das Anlegen neuer Anfragen, nicht das Lesen.
Zum Lesen ist dein Login aus Schritt 4 nötig.

> ⚠️ Der Schlüssel mit der Bezeichnung **`service_role`** darf **niemals** in die
> Website oder zu mir. Der hebelt jeden Schutz aus. Finger weg davon.

---

## Was passiert danach

- Klickt ein Kunde auf der Website auf *Per WhatsApp anfragen*, wird die Anfrage
  automatisch gespeichert: Adressen, Gegenstände, Maße, Gewicht, Etagen und der
  berechnete Preis.
- Du öffnest `https://keinelvst.github.io/gausdienstleistungen/admin.html`,
  meldest dich an und siehst alles.
- Der Tourenplaner stellt aus den offenen Anfragen automatisch Routen zusammen.

## Wichtig: Datenschutzerklärung ist jetzt Pflicht

Sobald Kundenadressen gespeichert werden, brauchst du eine
**Datenschutzerklärung** auf der Website – vorher war sie nur empfohlen, jetzt
ist sie rechtlich verpflichtend (DSGVO Art. 13). Sie muss nennen:

- wer du bist (Name, Anschrift, Kontakt),
- welche Daten gespeichert werden (Adressen, Kontaktdaten, Angaben zur Sendung),
- wozu (Bearbeitung der Anfrage und Durchführung des Transports),
- auf welcher Grundlage (Art. 6 Abs. 1 lit. b DSGVO – vorvertragliche Maßnahme),
- wie lange (Vorschlag: Anfragen ohne Auftrag nach 6 Monaten löschen,
  Aufträge 10 Jahre wegen der steuerlichen Aufbewahrungspflicht),
- dass Supabase als Auftragsverarbeiter eingesetzt wird (Server Frankfurt),
- die Rechte der Kunden (Auskunft, Löschung, Widerspruch, Beschwerde).

Kostenlose Generatoren: `e-recht24.de` oder `datenschutz-generator.de`.
Schick mir den fertigen Text, dann baue ich ihn ein – zusammen mit dem noch
fehlenden Impressum.
