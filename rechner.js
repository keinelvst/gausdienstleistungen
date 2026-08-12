/* ════════════════════════════════════════════════════════════════════
   Gausdienstleistungen – Preisrechner
   ────────────────────────────────────────────────────────────────────
   ALLE Preise und Einstellungen stehen im KONFIG-Block direkt hier
   unten. Werte ändern, Datei speichern, hochladen – fertig.

   Der Rechner arbeitet komplett im Browser: Entfernungen werden über
   die eingebaute PLZ-Tabelle (plz-daten.js) als Luftlinie × roadFactor
   geschätzt. Es wird kein externer Dienst aufgerufen.

   Selbsttest: die Seite mit ?test=1 aufrufen (z. B. index.html?test=1)
   und die Browser-Konsole öffnen – dort steht, ob alle Rechenproben
   stimmen. Nach jeder Änderung am KONFIG-Block empfohlen.
   ════════════════════════════════════════════════════════════════════ */

var KONFIG = {

  // ── Standort ───────────────────────────────────────────────────────
  depot: { lat: 48.7414, lon: 9.1344, label: "Engelboldstraße, 70569 Stuttgart" },

  // ── KOSTENKALKULATION (Selbstkosten) ───────────────────────────────
  // Der Preis deckt zuerst ALLE Kosten, danach kommt der Gewinnaufschlag.
  //
  // >>> GEWINN EINSTELLEN: Prozent-Aufschlag auf die Selbstkosten. <<<
  // 0 = reine Kostendeckung (der 30-€/h-Fahrerlohn ist dabei schon drin).
  gewinnaufschlagProzent: 20,

  fahrerStundensatzEur: 30,      // Lohn Fahrer, je Stunde
  beifahrerStundensatzEur: 30,   // Lohn Beifahrer/Träger, je Stunde

  dieselPreisEurProL: 2.20,      // €/Liter – gelegentlich an den Tankstellenpreis anpassen
  verbrauchLper100km: 14,        // Diesel real
  verschleissEurProKm: 0.065,    // Wartung + Verschleiß + Reifen
  abschreibungEurProKm: 0.09,    // Wertverlust Gebraucht-Transporter
  fixkostenEurProKm: 0.055,      // Versicherung, Steuer, HU – umgelegt je km
  mautEurProKm: 0,               // Rechtsstand 2026: mautfrei BIS 3,5 t zGG
  werbekostenProJahrEur: 4000,   // Werbung/Marketing pro Jahr – wird je km umgelegt
  jahresKilometer: 40000,        // geplante Jahres-km (Umlagebasis)

  durchschnittstempoKmh: 80,     // für die Fahrzeit-Schätzung
  roadFactor: 1.3,               // Luftlinie × Faktor ≈ Straßen-km

  // ── Be- und Entladen ───────────────────────────────────────────────
  ladezeitProStoppMin: 22.5,     // Grundzeit je Stopp (Abholung bzw. Lieferung)
  ladezeitProM3Min: 6,           // zusätzliche Minuten je m³ (über Abholung und
                                 // Lieferung zusammen) – viel Ladung = mehr Zeit

  // ── Lange Touren ───────────────────────────────────────────────────
  maxFahrzeitProTagStunden: 9,   // mehr Fahrzeit passt nicht in einen Tag (Lenkzeit)
  uebernachtungEurProNacht: 150, // Übernachtung + Spesen je nötiger Nacht unterwegs

  // ── Zuschläge Etagen & Schwergut (feste Euro-Beträge) ──────────────
  etagenGrundEur: 6,             // € je Etage und Adresse
  etagenProM3Eur: 4,             // € zusätzlich je Etage, je m³ Ladung
  aufzugFaktor: 0.30,            // Aufzug vorhanden => nur 30 % des Etagenzuschlags

  // Zuschlag je schwerem Einzelstück. Der Kunde wählt die Gewichtsklasse,
  //   eur         = einmaliger Zuschlag für das Stück
  //   proEtageEur = zusätzlich je Etage und Adresse
  schwergutStaffel: [
    { schluessel: "s80", eur: 80, proEtageEur: 20 },  // 80 bis unter 100 kg
    { schluessel: "s60", eur: 60, proEtageEur: 12 },  // 60 bis unter 80 kg
    { schluessel: "s40", eur: 30, proEtageEur: 6 }    // 40 bis unter 60 kg
  ],
  // Mengenrabatt: das teuerste Stück zählt voll, jedes weitere nur anteilig.
  weitereStueckeFaktor: 0.50,

  // ── Fahrzeug ───────────────────────────────────────────────────────
  vanVolumeM3: 10,               // Ladevolumen des Transporters ("volles Auto")
  maxZuladungKg: 1200,           // maximale Zuladung – schwerere Beiladungen
                                 // bekommen keinen Onlinepreis

  // ── Beiladung ──────────────────────────────────────────────────────
  vollpreisAbM3: 7.5,            // ab dieser Ladung zahlt der Kunde die Fahrt zu 100 %
  beiladungMinPreisEur: 60,      // Mindestauftragswert Beiladung

  // ── Umzug ──────────────────────────────────────────────────────────
  umzugMinPreisEur: 120,         // Mindestauftragswert Umzug
  umzugMaxOnlineM3: 25,          // darüber kein Onlinepreis => "bitte anfragen"
  umzugFernabKm: 150,            // braucht ein Umzug MEHRERE Fahrten und ist die
                                 // Strecke länger als das, gibt es keinen Online-
                                 // preis (dann lohnt ein größeres Fahrzeug –
                                 // individuelles Angebot statt Mondpreis)

  // ── Sonderfahrt ────────────────────────────────────────────────────
  sonderfahrtMinPreisEur: 60,    // Mindestpreis Sonderfahrt

  // ── Extras ─────────────────────────────────────────────────────────
  halteverbotEurProZone: 120,    // Halteverbotszone je Adresse (Genehmigung,
                                 // Schilder stellen und wieder abholen)
  montageStundensatzEur: 30,     // Möbel ab-/aufbauen, je Stunde
  wochenendZuschlagProzent: 0,   // Aufschlag, wenn der Wunschtermin auf Sa/So fällt
                                 // (0 = kein Zuschlag; z. B. 10 eintragen für 10 %)

  // >>> PREISSPANNE <<<
  // Angezeigt wird kein fester Betrag, sondern eine Spanne um den
  // berechneten Preis – so bleibt Luft für Dinge, die sich erst vor Ort
  // zeigen (enge Treppe, langer Trageweg, mehr Ladung als angegeben).
  spanneUnten: -1,               // Prozent unter dem berechneten Preis
  spanneOben: 15,                // Prozent darüber
  preisGueltigTage: 7,           // Hinweis "Preis gültig X Tage"

  // ── Region (für den Hinweis "Strecke wird selten gefahren") ────────
  regionRadiusKm: 50,            // Umkreis um das Depot, in dem häufig gefahren wird

  // ── Mengen-Vorauswahl im Formular (m³ anpassbar) ───────────────────
  mengenUmzug: [
    { label: "Einzelne Möbel (ca. 3 m³)", m3: 3 },
    { label: "WG-Zimmer (ca. 5 m³)", m3: 5 },
    { label: "1-Zimmer-Wohnung (ca. 10 m³)", m3: 10 },
    { label: "2-Zimmer-Wohnung (ca. 18 m³)", m3: 18 },
    { label: "3-Zimmer-Wohnung (ca. 25 m³)", m3: 25 }
  ],
  mengenBeiladung: [
    { label: "1–5 Kartons (ca. 1 m³)", m3: 1 },
    { label: "Einzelnes Möbelstück (ca. 2 m³)", m3: 2 },
    { label: "Mehrere Möbel / Kleinumzug (ca. 4 m³)", m3: 4 },
    { label: "Halber Transporter (ca. 5 m³)", m3: 5 },
    { label: "Ganzer Transporter (10 m³)", m3: 10 }
  ],
  mengenSonderfahrt: [
    { label: "Kleinladung (bis ca. 2 m³)", m3: 2 },
    { label: "Halber Transporter (ca. 5 m³)", m3: 5 },
    { label: "Voller Transporter (10 m³)", m3: 10 }
  ]
};

/* ════════════════════════════════════════════════════════════════════
   Ab hier: Programmlogik – hier muss normalerweise nichts geändert werden.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Helfer ──────────────────────────────────────────────────────────

  function fmtEur0(n) {
    return Math.round(n).toLocaleString("de-DE") + " €";
  }

  function haversineKm(a, b) {
    var R = 6371;
    var p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
    var dp = (b.lat - a.lat) * Math.PI / 180, dl = (b.lon - a.lon) * Math.PI / 180;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Straßen-km + Fahrzeit zwischen zwei Punkten (Luftlinie × roadFactor).
  function strecke(von, nach) {
    var km = haversineKm(von, nach) * KONFIG.roadFactor;
    return { km: km, stunden: km / KONFIG.durchschnittstempoKmh };
  }

  function normalisiere(text) {
    return String(text).toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  }

  // PLZ oder Ortsname => Koordinaten aus plz-daten.js, sonst null.
  // Ortsnamen werden mit eigenen Wortgrenzen geprüft (nicht \b), damit
  // auch Namen mit Klammern oder Bindestrich am Ende sauber passen.
  function findeOrt(text) {
    var t = String(text).trim();
    if (!t) return null;
    var plz = t.match(/\b(\d{5})\b/);
    if (plz && typeof PLZ_DATEN !== "undefined" && PLZ_DATEN[plz[1]]) {
      var p = PLZ_DATEN[plz[1]];
      return { lat: p[0], lon: p[1] };
    }
    if (typeof ORTE_DATEN !== "undefined") {
      var norm = normalisiere(t);
      var treffer = null, laenge = 0;
      for (var name in ORTE_DATEN) {
        if (name.length <= laenge) continue;
        var muster = name.replace(/[.*+?^${}()|[\]\\\/\-]/g, "\\$&");
        if (new RegExp("(^|[^a-z0-9])" + muster + "($|[^a-z0-9])").test(norm)) {
          treffer = ORTE_DATEN[name];
          laenge = name.length;
        }
      }
      if (treffer) return { lat: treffer[0], lon: treffer[1] };
    }
    return null;
  }

  function kostenProKm() {
    return KONFIG.dieselPreisEurProL * KONFIG.verbrauchLper100km / 100 +
           KONFIG.verschleissEurProKm + KONFIG.abschreibungEurProKm +
           KONFIG.fixkostenEurProKm + KONFIG.mautEurProKm +
           KONFIG.werbekostenProJahrEur / KONFIG.jahresKilometer;
  }

  function mitAufschlag(n) {
    return n * (1 + KONFIG.gewinnaufschlagProzent / 100);
  }

  function preisSpanne(total) {
    return {
      von: Math.floor(total * (1 + KONFIG.spanneUnten / 100)),
      bis: Math.ceil(total * (1 + KONFIG.spanneOben / 100))
    };
  }

  // Mengenrabatt: Beträge absteigend sortiert, das teuerste Stück zählt
  // voll, jedes weitere nur anteilig.
  function mitMengenrabatt(betraege) {
    betraege.sort(function (a, b) { return b - a; });
    var summe = 0;
    for (var i = 0; i < betraege.length; i++) {
      summe += betraege[i] * (i === 0 ? 1 : KONFIG.weitereStueckeFaktor);
    }
    return summe;
  }

  // schwer = { s40: Anzahl, s60: Anzahl, s80: Anzahl }
  function schwergutBetraege(schwer, feld) {
    var liste = [];
    KONFIG.schwergutStaffel.forEach(function (stufe) {
      var anzahl = schwer[stufe.schluessel] || 0;
      for (var i = 0; i < anzahl; i++) liste.push(stufe[feld]);
    });
    return liste;
  }

  // Etagenzuschlag über beide Adressen. adressen = [{etagen, aufzug}, ...]
  function etagenZuschlag(volumenM3, schwer, adressen) {
    var proEtage = KONFIG.etagenGrundEur + KONFIG.etagenProM3Eur * volumenM3 +
                   mitMengenrabatt(schwergutBetraege(schwer, "proEtageEur"));
    var summe = 0;
    adressen.forEach(function (a) {
      summe += a.etagen * proEtage * (a.aufzug ? KONFIG.aufzugFaktor : 1);
    });
    return summe;
  }

  function schwergutZuschlag(schwer) {
    return mitMengenrabatt(schwergutBetraege(schwer, "eur"));
  }

  // Be-/Entladezeit in Stunden: Grundzeit je Stopp + Menge (über beide Stopps).
  function ladeZeitStunden(stopps, volumenM3) {
    return (stopps * KONFIG.ladezeitProStoppMin +
            2 * KONFIG.ladezeitProM3Min * (volumenM3 || 0)) / 60;
  }

  // Nötige Übernachtungen, wenn die reine Fahrzeit nicht in einen Tag passt.
  function uebernachtungen(fahrzeitStunden) {
    return Math.max(0, Math.ceil(fahrzeitStunden / KONFIG.maxFahrzeitProTagStunden) - 1);
  }

  function wochenende(terminIso) {
    if (!terminIso) return false;
    var tag = new Date(terminIso + "T12:00:00").getDay();
    return tag === 0 || tag === 6;
  }

  // ══════════════════════════════════════════════════════════════════
  //  PREIS-ENGINES (pure Funktionen – kein DOM)
  //  Eingabe e: { von, nach, volumenM3, schwer, abholung, lieferung,
  //               traeger, termin, halteverbotZonen, montageStunden }
  // ══════════════════════════════════════════════════════════════════

  // Extras, die bei jeder Leistung gleich funktionieren.
  function extrasKosten(e, zeilen) {
    var summe = 0;
    var zonen = e.halteverbotZonen || 0;
    if (zonen > 0) {
      var hv = zonen * KONFIG.halteverbotEurProZone;
      zeilen.push({ label: "Halteverbotszone (" + zonen + "×)", eur: mitAufschlag(hv) });
      summe += hv;
    }
    var mh = e.montageStunden || 0;
    if (mh > 0) {
      var mo = mh * KONFIG.montageStundensatzEur;
      zeilen.push({ label: "Möbelmontage (ca. " + mh + " Std.)", eur: mitAufschlag(mo) });
      summe += mo;
    }
    return summe;
  }

  function ergebnisAus(zeilen, hinweise, selbstkosten, minPreis, termin) {
    var zwischensumme = mitAufschlag(selbstkosten);
    if (KONFIG.wochenendZuschlagProzent > 0 && wochenende(termin)) {
      var wz = zwischensumme * KONFIG.wochenendZuschlagProzent / 100;
      zeilen.push({ label: "Wochenendzuschlag (" + KONFIG.wochenendZuschlagProzent + " %)", eur: wz });
      zwischensumme += wz;
    }
    var mindestpreisAktiv = zwischensumme < minPreis;
    var total = Math.ceil(Math.max(zwischensumme, minPreis));
    if (mindestpreisAktiv) hinweise.push("Es gilt der Mindestauftragswert von " + fmtEur0(minPreis) + ".");
    return {
      ok: true,
      zeilen: zeilen,
      hinweise: hinweise,
      total: total,
      spanne: preisSpanne(total)
    };
  }

  function berechneSonderfahrt(e) {
    var anfahrt = strecke(KONFIG.depot, e.von);
    var haupt = strecke(e.von, e.nach);
    var rueck = strecke(e.nach, KONFIG.depot);
    var km = anfahrt.km + haupt.km + rueck.km;
    var fahrzeit = anfahrt.stunden + haupt.stunden + rueck.stunden;
    var ladezeit = ladeZeitStunden(2, e.volumenM3);
    var gesamt = fahrzeit + ladezeit;

    var fahrzeug = km * kostenProKm();
    var fahrer = gesamt * KONFIG.fahrerStundensatzEur;
    var beifahrer = e.traeger ? gesamt * KONFIG.beifahrerStundensatzEur : 0;
    var etagen = etagenZuschlag(e.volumenM3 || 0, e.schwer, [e.abholung, e.lieferung]);
    var schwergut = schwergutZuschlag(e.schwer);
    var naechte = uebernachtungen(fahrzeit);
    var hotel = naechte * KONFIG.uebernachtungEurProNacht;

    var zeilen = [
      { label: "Fahrt (" + Math.round(km) + " km inkl. An- und Rückfahrt)", eur: mitAufschlag(fahrzeug + fahrer) }
    ];
    if (beifahrer) zeilen.push({ label: "Beifahrer/Träger", eur: mitAufschlag(beifahrer) });
    if (etagen) zeilen.push({ label: "Etagenzuschlag", eur: mitAufschlag(etagen) });
    if (schwergut) zeilen.push({ label: "Schwere Einzelstücke", eur: mitAufschlag(schwergut) });
    if (hotel) zeilen.push({ label: "Übernachtung unterwegs (" + naechte + "×)", eur: mitAufschlag(hotel) });
    var extras = extrasKosten(e, zeilen);

    var hinweise = [];
    if (naechte > 0) hinweise.push("Die Strecke passt nicht in einen Fahrtag – " + naechte +
      " Übernachtung" + (naechte > 1 ? "en" : "") + " unterwegs ist eingerechnet.");

    var erg = ergebnisAus(zeilen, hinweise,
      fahrzeug + fahrer + beifahrer + etagen + schwergut + hotel + extras,
      KONFIG.sonderfahrtMinPreisEur, e.termin);
    erg.streckeKm = haupt.km;
    return erg;
  }

  function berechneBeiladung(e) {
    if (e.volumenM3 > KONFIG.vanVolumeM3) {
      return { ok: false, grund: "Mehr als " + KONFIG.vanVolumeM3 + " m³ passen nicht als Beiladung – fragen Sie gerne eine Sonderfahrt oder einen Umzug an." };
    }
    if (e.gewichtUeberLimit) {
      return { ok: false, grund: "Ladungen über " + KONFIG.maxZuladungKg.toLocaleString("de-DE") + " kg übersteigen die Zuladung des Transporters – fragen Sie gerne individuell an." };
    }
    var haupt = strecke(e.von, e.nach);
    var anteil = Math.min(e.volumenM3 / KONFIG.vollpreisAbM3, 1);

    var fahrzeug = haupt.km * kostenProKm() * anteil;
    var fahrer = haupt.stunden * KONFIG.fahrerStundensatzEur * anteil;
    var ladezeit = ladeZeitStunden(2, e.volumenM3);
    var laden = ladezeit * KONFIG.fahrerStundensatzEur;
    var traeger = e.traeger
      ? ladezeit * KONFIG.beifahrerStundensatzEur + haupt.stunden * KONFIG.beifahrerStundensatzEur * anteil
      : 0;
    var etagen = etagenZuschlag(e.volumenM3, e.schwer, [e.abholung, e.lieferung]);
    var schwergut = schwergutZuschlag(e.schwer);

    var zeilen = [
      { label: "Anteilige Fahrt (" + Math.round(haupt.km) + " km, " + e.volumenM3 + " m³)", eur: mitAufschlag(fahrzeug + fahrer) },
      { label: "Be- und Entladen", eur: mitAufschlag(laden) }
    ];
    if (traeger) zeilen.push({ label: "Tragehilfe", eur: mitAufschlag(traeger) });
    if (etagen) zeilen.push({ label: "Etagenzuschlag", eur: mitAufschlag(etagen) });
    if (schwergut) zeilen.push({ label: "Schwere Einzelstücke", eur: mitAufschlag(schwergut) });
    var extras = extrasKosten(e, zeilen);

    var hinweise = ["Ihre Ladung fährt auf einer Tour mit – der Termin richtet sich nach der geplanten Route."];
    var erg = ergebnisAus(zeilen, hinweise,
      fahrzeug + fahrer + laden + traeger + etagen + schwergut + extras,
      KONFIG.beiladungMinPreisEur, e.termin);
    erg.streckeKm = haupt.km;
    return erg;
  }

  function berechneUmzug(e) {
    if (e.volumenM3 > KONFIG.umzugMaxOnlineM3) {
      return { ok: false, grund: "Für Umzüge über " + KONFIG.umzugMaxOnlineM3 + " m³ erstellen wir gerne ein individuelles Angebot – fragen Sie einfach per WhatsApp an." };
    }
    var fahrten = Math.max(1, Math.ceil(e.volumenM3 / KONFIG.vanVolumeM3));
    var pendel = strecke(e.von, e.nach);

    // Mehrere Pendelfahrten lohnen nur in der Nähe – auf langen Strecken
    // ist ein größeres Fahrzeug wirtschaftlicher als 2× hin und zurück.
    if (fahrten > 1 && pendel.km > KONFIG.umzugFernabKm) {
      return { ok: false, grund: "Bei dieser Menge und Entfernung lohnt sich ein größeres Fahrzeug – dafür erstellen wir gerne ein individuelles Angebot. Fragen Sie einfach per WhatsApp an." };
    }

    var anfahrt = strecke(KONFIG.depot, e.von);
    var rueck = strecke(e.nach, KONFIG.depot);
    var km = anfahrt.km + rueck.km + pendel.km * (2 * fahrten - 1);
    var fahrzeit = km / KONFIG.durchschnittstempoKmh;
    var ladezeit = ladeZeitStunden(2 * fahrten, e.volumenM3);
    var gesamt = fahrzeit + ladezeit;

    var fahrzeug = km * kostenProKm();
    var fahrer = gesamt * KONFIG.fahrerStundensatzEur;
    var beifahrer = e.traeger ? gesamt * KONFIG.beifahrerStundensatzEur : 0;
    var etagen = etagenZuschlag(e.volumenM3, e.schwer, [e.abholung, e.lieferung]);
    var schwergut = schwergutZuschlag(e.schwer);
    var naechte = uebernachtungen(fahrzeit);
    var hotel = naechte * KONFIG.uebernachtungEurProNacht;

    var zeilen = [
      { label: "Fahrt (" + Math.round(km) + " km" + (fahrten > 1 ? ", " + fahrten + " Fahrten" : "") + ")", eur: mitAufschlag(fahrzeug) },
      { label: "Fahrer inkl. Be- und Entladen (" + gesamt.toFixed(1).replace(".", ",") + " Std.)", eur: mitAufschlag(fahrer) }
    ];
    if (beifahrer) zeilen.push({ label: "Träger (2. Person)", eur: mitAufschlag(beifahrer) });
    if (etagen) zeilen.push({ label: "Etagenzuschlag", eur: mitAufschlag(etagen) });
    if (schwergut) zeilen.push({ label: "Schwere Einzelstücke", eur: mitAufschlag(schwergut) });
    if (hotel) zeilen.push({ label: "Übernachtung unterwegs (" + naechte + "×)", eur: mitAufschlag(hotel) });
    var extras = extrasKosten(e, zeilen);

    var hinweise = [];
    if (fahrten > 1) hinweise.push("Bei " + e.volumenM3 + " m³ sind " + fahrten + " Fahrten mit dem " + KONFIG.vanVolumeM3 + "-m³-Transporter nötig.");
    if (naechte > 0) hinweise.push("Die Strecke passt nicht in einen Fahrtag – " + naechte +
      " Übernachtung" + (naechte > 1 ? "en" : "") + " unterwegs ist eingerechnet.");

    var erg = ergebnisAus(zeilen, hinweise,
      fahrzeug + fahrer + beifahrer + etagen + schwergut + hotel + extras,
      KONFIG.umzugMinPreisEur, e.termin);
    erg.streckeKm = pendel.km;
    erg.fahrten = fahrten;
    return erg;
  }

  // ══════════════════════════════════════════════════════════════════
  //  FORMULAR-ANBINDUNG
  // ══════════════════════════════════════════════════════════════════

  var el = {};
  var letztesErgebnis = null;

  function leseSchwer() {
    return {
      s40: Math.max(0, parseInt(el.s40.value, 10) || 0),
      s60: Math.max(0, parseInt(el.s60.value, 10) || 0),
      s80: Math.max(0, parseInt(el.s80.value, 10) || 0)
    };
  }

  function leseVolumen() {
    if (el.menge.value === "eigene") {
      var v = parseFloat(String(el.m3.value).replace(",", "."));
      return (v > 0) ? v : null;
    }
    var v2 = parseFloat(el.menge.value);
    return (v2 > 0) ? v2 : null;
  }

  function fuelleMengen(presets) {
    el.menge.innerHTML = "";
    presets.forEach(function (p, i) {
      var o = document.createElement("option");
      o.value = String(p.m3);
      o.textContent = p.label;
      if (i === 0) o.selected = true;
      el.menge.appendChild(o);
    });
    var eigene = document.createElement("option");
    eigene.value = "eigene";
    eigene.textContent = "Eigene Angabe (m³)";
    el.menge.appendChild(eigene);
  }

  // Sichtbarkeit der Zusatzfelder je Leistung.
  function passeFelderAn() {
    var l = el.leistung.value;
    var istUmzug = l === "Umzug", istBeiladung = l === "Beiladung", istSonderfahrt = l === "Sonderfahrt";
    var aktiv = istUmzug || istBeiladung || istSonderfahrt;

    el.blockMenge.hidden = !aktiv;
    el.blockEtagen.hidden = !aktiv;
    el.blockSchwer.hidden = !aktiv;
    el.blockTraeger.hidden = !aktiv;
    el.blockGewicht.hidden = !istBeiladung;
    el.blockExtras.hidden = !(istUmzug || istBeiladung);
    el.feldMontage.hidden = !istUmzug;

    if (aktiv && el.menge.dataset.modus !== l) {
      el.menge.dataset.modus = l;
      fuelleMengen(istUmzug ? KONFIG.mengenUmzug : (istBeiladung ? KONFIG.mengenBeiladung : KONFIG.mengenSonderfahrt));
      el.m3.parentElement.hidden = true;
    }

    el.traegerLabel.textContent = istUmzug
      ? "Träger (2. Person) einplanen – bei Umzügen empfohlen"
      : (istSonderfahrt ? "Beifahrer/Träger benötigt" : "Tragehilfe beim Be- und Entladen benötigt");
    // Solange der Kunde den Haken nicht selbst angefasst hat, folgt er
    // der Empfehlung je Leistung (Umzug: an, sonst: aus).
    if (!el.traeger.dataset.angefasst) el.traeger.checked = istUmzug;
  }

  function zeige(html) {
    el.box.innerHTML = html;
    el.box.hidden = false;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function rechne() {
    letztesErgebnis = null;
    var l = el.leistung.value;
    if (!l || l === "Weiß ich noch nicht") {
      el.box.hidden = true;
      return;
    }

    var vonText = el.von.value.trim(), nachText = el.nach.value.trim();
    if (!vonText || !nachText) { el.box.hidden = true; return; }

    var von = findeOrt(vonText), nach = findeOrt(nachText);
    if (!von || !nach) {
      zeige('<p class="preis-hinweis">Für die Sofort-Schätzung bitte bei „Von“ und „Nach“ eine ' +
            'Postleitzahl (oder einen größeren Ort) angeben.</p>');
      return;
    }

    var eingabe = {
      von: von, nach: nach,
      volumenM3: leseVolumen(),
      schwer: leseSchwer(),
      abholung: { etagen: parseInt(el.vonEtage.value, 10) || 0, aufzug: el.vonAufzug.checked },
      lieferung: { etagen: parseInt(el.nachEtage.value, 10) || 0, aufzug: el.nachAufzug.checked },
      traeger: el.traeger.checked,
      termin: el.termin.value,
      halteverbotZonen: el.blockExtras.hidden ? 0 : (parseInt(el.halteverbot.value, 10) || 0),
      montageStunden: (el.blockExtras.hidden || el.feldMontage.hidden) ? 0 : (parseFloat(el.montage.value) || 0),
      gewichtUeberLimit: !el.blockGewicht.hidden && el.gewicht.value === "ueber"
    };

    if (el.schwer100.checked) {
      zeige('<p class="preis-hinweis">Einzelstücke über 100 kg (z. B. Klavier, Tresor) kalkulieren wir ' +
            'individuell – senden Sie die Anfrage einfach ab, Sie bekommen schnell ein Angebot.</p>');
      return;
    }

    if (!eingabe.volumenM3) {
      zeige('<p class="preis-hinweis">Bitte die Menge in m³ angeben, dann erscheint hier die Preisschätzung.</p>');
      return;
    }

    var erg;
    if (l === "Sonderfahrt") erg = berechneSonderfahrt(eingabe);
    else if (l === "Umzug") erg = berechneUmzug(eingabe);
    else erg = berechneBeiladung(eingabe);

    if (!erg.ok) {
      zeige('<p class="preis-hinweis">' + esc(erg.grund) + '</p>');
      return;
    }

    letztesErgebnis = erg;
    letztesErgebnis.leistung = l;

    var html = '<p class="preis-titel">Ihre Preisschätzung</p><table class="preis-tabelle">';
    erg.zeilen.forEach(function (z) {
      html += '<tr><td>' + esc(z.label) + '</td><td>' + fmtEur0(z.eur) + '</td></tr>';
    });
    html += '</table>';
    html += '<p class="preis-total">Voraussichtlicher Preis: <strong>' +
            fmtEur0(erg.spanne.von) + " – " + fmtEur0(erg.spanne.bis) + '</strong></p>';
    erg.hinweise.forEach(function (h) {
      html += '<p class="preis-hinweis">' + esc(h) + '</p>';
    });
    html += '<p class="preis-klein">Unverbindliche Sofort-Schätzung (Entfernung über PLZ geschätzt, ca. ' +
            Math.round(erg.streckeKm) + '&nbsp;km Strecke). Den Festpreis bestätigen wir Ihnen mit dem Angebot – ' +
            'gültig ' + KONFIG.preisGueltigTage + '&nbsp;Tage.</p>';
    zeige(html);
  }

  // ── Öffentliche Schnittstelle ───────────────────────────────────────
  // "intern" macht den Rechenkern für eigene Preisbeispiele in der
  // Browser-Konsole sichtbar – ändert nichts an der Seite.
  window.GausRechner = {
    intern: {
      sonderfahrt: berechneSonderfahrt,
      beiladung: berechneBeiladung,
      umzug: berechneUmzug,
      strecke: strecke,
      luftlinieKm: haversineKm,
      kostenProKm: kostenProKm,
      findeOrt: findeOrt
    },

    // Zusatzzeilen für die WhatsApp-Nachricht (script.js fragt sie ab).
    whatsappZeilen: function () {
      var zeilen = [];
      var l = el.leistung ? el.leistung.value : "";
      var aktiv = l === "Umzug" || l === "Beiladung" || l === "Sonderfahrt";
      if (!aktiv) return zeilen;

      var v = leseVolumen();
      if (v) zeilen.push("Menge: ca. " + String(v).replace(".", ",") + " m³");
      if (!el.blockGewicht.hidden) {
        zeilen.push("Gewicht: " + el.gewicht.options[el.gewicht.selectedIndex].textContent);
      }
      var schwer = leseSchwer();
      var stuecke = [];
      if (schwer.s40) stuecke.push(schwer.s40 + "× 40–60 kg");
      if (schwer.s60) stuecke.push(schwer.s60 + "× 60–80 kg");
      if (schwer.s80) stuecke.push(schwer.s80 + "× 80–100 kg");
      if (el.schwer100.checked) stuecke.push("Stück über 100 kg");
      if (stuecke.length) zeilen.push("Schwere Stücke: " + stuecke.join(", "));

      var etageText = function (wert, aufzug) {
        return (wert === "0" ? "Erdgeschoss" : wert + ". Etage") + (aufzug ? " (Aufzug)" : "");
      };
      zeilen.push("Abholung: " + etageText(el.vonEtage.value, el.vonAufzug.checked));
      zeilen.push("Lieferung: " + etageText(el.nachEtage.value, el.nachAufzug.checked));
      if (el.traeger.checked) zeilen.push("Träger/Beifahrer: ja");

      if (!el.blockExtras.hidden) {
        var extras = [];
        var zonen = parseInt(el.halteverbot.value, 10) || 0;
        if (zonen) extras.push("Halteverbotszone " + zonen + "×");
        var mh = el.feldMontage.hidden ? 0 : (parseFloat(el.montage.value) || 0);
        if (mh) extras.push("Möbelmontage ca. " + mh + " Std.");
        if (el.verpackung.checked) extras.push("Verpackungsmaterial benötigt");
        if (extras.length) zeilen.push("Extras: " + extras.join(", "));
      }

      if (letztesErgebnis) {
        var kalk = letztesErgebnis.zeilen.map(function (z) {
          return z.label + " " + fmtEur0(z.eur);
        }).join(" · ");
        zeilen.push("Kalkulation: " + kalk);
        var bis = new Date(Date.now() + KONFIG.preisGueltigTage * 86400000);
        zeilen.push("Preisschätzung laut Rechner: " + fmtEur0(letztesErgebnis.spanne.von) +
                    " – " + fmtEur0(letztesErgebnis.spanne.bis) +
                    " (ca. " + Math.round(letztesErgebnis.streckeKm) + " km, gültig bis " +
                    bis.toLocaleDateString("de-DE") + ")");
      }
      return zeilen;
    }
  };

  // ══════════════════════════════════════════════════════════════════
  //  SELBSTTESTS (?test=1 an die Adresse anhängen, Konsole öffnen)
  // ══════════════════════════════════════════════════════════════════

  function runSelfTests() {
    var ergebnisse = [];
    // Die Tests rechnen bewusst ohne Gewinnaufschlag, damit sie unabhängig
    // davon gelten, welcher Prozentsatz gerade eingestellt ist.
    var margeVorher = KONFIG.gewinnaufschlagProzent;
    KONFIG.gewinnaufschlagProzent = 0;

    function check(name, ist, soll, toleranz) {
      var ok = Math.abs(ist - soll) <= (toleranz || 0.01);
      ergebnisse.push((ok ? "OK    " : "FEHLER") + "  " + name + "  (ist " + ist + ", soll " + soll + ")");
      return ok;
    }

    var S = { lat: 48.744, lon: 9.12 }, B = { lat: 52.532, lon: 13.385 };
    var eg = { etagen: 0, aufzug: false };
    var basis = { von: S, nach: B, volumenM3: 2, schwer: { s40: 0, s60: 0, s80: 0 },
                  abholung: eg, lieferung: eg, traeger: false, termin: "" };

    check("Kosten je km", kostenProKm(), 0.618, 0.001);
    check("Mengenrabatt 60+30", mitMengenrabatt([30, 60]), 75, 0.01);
    check("Etagen 2. OG, 10 m³, 1×60-80kg", etagenZuschlag(10, { s60: 1 }, [{ etagen: 2, aufzug: false }, eg]), 116, 0.01);
    check("Etagen mit Aufzug = 30 %", etagenZuschlag(10, {}, [{ etagen: 2, aufzug: true }, eg]), 27.6, 0.01);
    check("Übernachtungen bei 16,8 h", uebernachtungen(16.8), 1, 0);
    var bl = berechneBeiladung(basis);
    check("Beiladung 2 m³ S->B (ohne Marge)", bl.total, 213, 2);
    var sf = berechneSonderfahrt(basis);
    check("Sonderfahrt S->B inkl. Übernachtung (ohne Marge)", sf.total, 1523, 15);
    var minimal = berechneBeiladung({ von: S, nach: S, volumenM3: 1, schwer: {}, abholung: eg, lieferung: eg, traeger: false, termin: "" });
    check("Mindestpreis Beiladung", minimal.total, KONFIG.beiladungMinPreisEur, 0);

    KONFIG.gewinnaufschlagProzent = margeVorher;
    var fehler = ergebnisse.filter(function (z) { return z.indexOf("FEHLER") === 0; }).length;
    console.log("Gaus-Preisrechner Selbsttest:\n" + ergebnisse.join("\n") +
                "\n=> " + (ergebnisse.length - fehler) + "/" + ergebnisse.length + " OK");
    return fehler === 0;
  }

  document.addEventListener("DOMContentLoaded", function () {
    el = {
      leistung: document.getElementById("f-leistung"),
      von: document.getElementById("f-von"),
      nach: document.getElementById("f-nach"),
      termin: document.getElementById("f-termin"),
      menge: document.getElementById("f-menge"),
      m3: document.getElementById("f-m3"),
      vonEtage: document.getElementById("f-von-etage"),
      vonAufzug: document.getElementById("f-von-aufzug"),
      nachEtage: document.getElementById("f-nach-etage"),
      nachAufzug: document.getElementById("f-nach-aufzug"),
      s40: document.getElementById("f-s40"),
      s60: document.getElementById("f-s60"),
      s80: document.getElementById("f-s80"),
      schwer100: document.getElementById("f-s100"),
      traeger: document.getElementById("f-traeger"),
      traegerLabel: document.getElementById("f-traeger-label"),
      gewicht: document.getElementById("f-gewicht"),
      halteverbot: document.getElementById("f-halteverbot"),
      montage: document.getElementById("f-montage"),
      verpackung: document.getElementById("f-verpackung"),
      blockMenge: document.getElementById("block-menge"),
      blockEtagen: document.getElementById("block-etagen"),
      blockSchwer: document.getElementById("block-schwer"),
      blockTraeger: document.getElementById("block-traeger"),
      blockGewicht: document.getElementById("block-gewicht"),
      blockExtras: document.getElementById("block-extras"),
      feldMontage: document.getElementById("feld-montage"),
      box: document.getElementById("preis-box")
    };
    if (!el.leistung || !el.box) return;

    el.menge.addEventListener("change", function () {
      el.m3.parentElement.hidden = el.menge.value !== "eigene";
      rechne();
    });
    el.traeger.addEventListener("change", function () {
      el.traeger.dataset.angefasst = "1";
      rechne();
    });
    el.leistung.addEventListener("change", function () { passeFelderAn(); rechne(); });

    ["input", "change"].forEach(function (evt) {
      [el.von, el.nach, el.termin, el.m3, el.vonEtage, el.vonAufzug, el.nachEtage,
       el.nachAufzug, el.s40, el.s60, el.s80, el.schwer100, el.gewicht,
       el.halteverbot, el.montage, el.verpackung].forEach(function (feld) {
        feld.addEventListener(evt, rechne);
      });
    });

    passeFelderAn();
    rechne();
    if (/[?&]test=1/.test(location.search)) runSelfTests();
  });
})();
