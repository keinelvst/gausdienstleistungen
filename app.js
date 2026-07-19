/* ════════════════════════════════════════════════════════════════════
   Gaus Dienstleistungen – Preisrechner
   ────────────────────────────────────────────────────────────────────
   ALLE Preise und Einstellungen stehen im CONFIG-Block direkt hier
   unten. Werte ändern, Datei speichern, Seite neu laden – fertig.
   ════════════════════════════════════════════════════════════════════ */

var CONFIG = {
  // ── Kontakt ────────────────────────────────────────────────────────
  // WhatsApp-Nummer im internationalen Format OHNE "+" und ohne
  // Leerzeichen, z. B. "4915112345678". Solange hier ein "X" steht,
  // ist der WhatsApp-Button deaktiviert.
  whatsappNumber: "491626806273",
  businessName: "Gaus Dienstleistungen",

  // ── Standorte ──────────────────────────────────────────────────────
  depot:       { lat: 48.7414, lon: 9.1344, label: "Engelboldstraße, 70569 Stuttgart" },
  destination: { lat: 52.5200, lon: 13.4050, label: "Berlin" },

  // ── KOSTENKALKULATION (Selbstkosten) ───────────────────────────────
  // Der Preis deckt zuerst ALLE Kosten, danach kommt der Gewinnaufschlag.
  //
  // >>> GEWINN EINSTELLEN: Prozent-Aufschlag auf die Selbstkosten. <<<
  // 0 = reine Kostendeckung (dein 30-€/h-Fahrerlohn ist dabei schon drin).
  // Branchenüblich sind 10–15 %. Wirkt auf Transporte, NICHT auf den Putzservice.
  gewinnaufschlagProzent: 20,

  fahrerStundensatzEur: 30,      // dein Lohn als Fahrer, je Stunde
  beifahrerStundensatzEur: 30,   // Lohn Beifahrer/zweiter Träger, je Stunde

  // Kostensätze laut Recherche 07/2026 (bfp-Fuhrparkdaten, ADAC, Marktdaten):
  verbrauchLper100km: 14,        // Diesel real (Angabe Inhaber)
  verschleissEurProKm: 0.065,    // Wartung + Verschleiß + Reifen (5–8 ct, bei altem Fahrzeug eher 0.08)
  abschreibungEurProKm: 0.09,    // Wertverlust Gebraucht-Transporter (6–12 ct je nach Kaufpreis)
  fixkostenEurProKm: 0.055,      // Versicherung ~1.500 €, Steuer 210 €, HU — bei 40.000 km/Jahr
  mautEurProKm: 0,               // Rechtsstand 2026: mautfrei BIS 3,5 t zGG (darüber: ~0.151 eintragen)
  werbekostenProJahrEur: 4000,   // Werbung/Marketing pro Jahr — wird je gefahrenem km umgelegt
  jahresKilometer: 40000,        // geplante Jahres-km (Umlagebasis für die Werbekosten)

  durchschnittstempoKmh: 80,     // Fahrzeit-Schätzung ohne Routen-API (Langstrecke inkl. Pausen ~85, Stadt real ~25)
  ladezeitProStoppMin: 22.5,     // Grundzeit Be-/Entladen je Stopp
                                 // => 45 Minuten je Auftrag (Abholung + Lieferung zusammen)

  // ── Zuschläge Etagen & Schwergut (feste Euro-Beträge) ──────────────
  // Etagenzuschlag je Etage und Adresse = Grundbetrag + Betrag je m³ (exakt, ohne Aufrundung)
  // + Aufschlag für schwere Stücke (siehe schwergutStaffel).
  // Beispiel bei 6 € + 4 €/m³:  5 Kartons 8,32 €/Etage · Sofa (1,8 m³) 13,30 € · volles Auto 43,74 €.
  etagenGrundEur: 6,             // € je Etage und Adresse
  etagenProM3Eur: 4,             // € zusätzlich je Etage, je m³ Ladung
  aufzugFaktor: 0.30,            // Aufzug vorhanden (und passt) => nur 30 % des Etagenzuschlags

  // Zuschlag je EINZELSTÜCK nach dessen Gewicht.
  // Reihenfolge: schwerste Stufe zuerst; die erste passende Stufe zählt.
  // Unter der leichtesten Stufe (hier 40 kg) gibt es keinen Aufpreis.
  //   eur         = einmaliger Zuschlag für das Stück
  //   proEtageEur = zusätzlich je Etage und Adresse (schwer tragen kostet mehr Kraft)
  schwergutStaffel: [
    { abKg: 80, eur: 80, proEtageEur: 20 },   // 80 bis unter 100 kg
    { abKg: 60, eur: 60, proEtageEur: 12 },   // 60 bis unter 80 kg
    { abKg: 40, eur: 30, proEtageEur: 6 }     // 40 bis unter 60 kg
  ],
  maxEinzelstueckKg: 100,        // ab hier kein Online-Preis mehr => "bitte anfragen"

  // Mengenrabatt auf die Schwergut-Zuschläge, wenn mehrere Stücke an derselben
  // Adresse getragen werden: das teuerste Stück zählt voll, jedes weitere nur
  // zu diesem Anteil (0,50 = halber Preis).
  weitereStueckeFaktor: 0.50,

  // ── Transport nach Berlin (Beiladung) ──────────────────────────────
  pickupRadiusKm: 30,            // Abholung ≤ dieser Umkreis um das Depot => Abholfahrt-Modell
  deliveryMaxKmFromBerlin: 50,   // Lieferadresse rund um das Fahrtziel => immer erlaubt

  // Lieferadressen dürfen auch UNTERWEGS liegen (z. B. Nürnberg, Leipzig).
  // Erlaubt, solange der Umweg gegenüber der direkten Strecke höchstens
  // so groß ist. Weiter abseits => "bitte individuell anfragen".
  korridorMaxUmwegKm: 50,

  // >>> STELLPLATZ-ZUSCHLAG <<<
  // Ladung, die nur einen Teil der Strecke mitfährt, blockiert den Platz
  // trotzdem: Was in Nürnberg aussteigt, kann nicht schon ab Stuttgart von
  // jemandem gebucht werden, der bis Berlin will. Dieser Anteil der
  // restlichen Strecke wird deshalb mitberechnet.
  //   0    = gar nicht (Teilstrecken sind dann sehr billig)
  //   0,35 = moderat  ← Vorgabe Inhaber "leicht mit einberechnet"
  //   1    = so teuer, als wäre die Ladung die ganze Strecke mitgefahren
  // Wer die volle Strecke mitfährt, zahlt hier automatisch 0 €.
  platzblockadeFaktor: 0.35,
  vanVolumeM3: 10,               // Ladevolumen des Transporters in m³ ("volles Auto") – mehr passt nicht rein
  maxZuladungKg: 1200,           // >>> ZULADUNG <<< Angabe Inhaber. Mehr Gesamtgewicht => kein
                                 // Onlinepreis. Im Fahrzeugschein: Feld F.1 minus G, davon
                                 // Fahrer, Beifahrer und vollen Tank abziehen.

  // >>> PREISSPANNE FÜR DIE ANFRAGE <<<
  // In der WhatsApp-Nachricht steht kein fester Betrag, sondern eine Spanne
  // um den berechneten Preis. So bleibt Luft für Dinge, die sich erst vor
  // Ort zeigen (enge Treppe, Halteverbot, mehr als angegeben).
  spanneUnten: -5,               // Prozent unter dem berechneten Preis
  spanneOben: 15,                // Prozent darüber
  vollpreisAbM3: 7.5,            // ab dieser Ladung zahlt der Kunde die Fahrt zu 100 %
                                 // (Rest geht für Packlücken, Sperriges und Gänge drauf)
  itemMarginCm: 3,               // Sicherheitsmarge je Maß (Länge, Breite, Höhe) in cm
  maxItemDimCm: { l: 300, w: 160, h: 170 }, // größtes Einzelteil (inkl. Marge) => sonst "anfragen"
  minPriceEur: 60,               // Mindestauftragswert Transport
  priceValidityDays: 7,          // Hinweis "Preis gültig X Tage"

  // ── Sonderfahrten ──────────────────────────────────────────────────
  sonderfahrtMinPriceEur: 60,    // Mindestpreis Sonderfahrt

  // ── Putzservice ────────────────────────────────────────────────────
  cleaningHourlyRateEur: 30,     // € je Reinigungskraft je Stunde
  cleaningMinHours: 2,           // Mindestbuchung in Stunden
  cleaningRadiusKm: 15,          // Einsatzgebiet: Umkreis um Stuttgart-Zentrum
  cleaningAreaCenter: { lat: 48.7758, lon: 9.1829, label: "Stuttgart-Zentrum" },
  cleaningBase: { lat: 48.6940, lon: 9.1600, label: "Leinfelden-Echterdingen" }, // Start der Anfahrt
  cleaningTravelTiers: [         // Anfahrtskosten nach Entfernung (Straßen-km geschätzt)
    { maxKm: 5,   feeEur: 5 },
    { maxKm: 10,  feeEur: 10 },
    { maxKm: 15,  feeEur: 15 },
    { maxKm: 999, feeEur: 20 }   // alles darüber (bis zur Einsatzgebiets-Grenze)
  ],
  cleaningServices: [
    "Wohnungsreinigung",
    "Büro-/Praxisreinigung",
    "Umzugs-/Endreinigung",
    "Fensterreinigung"
  ],

  // ── Adminbereich & Datenbank ───────────────────────────────────────
  // Speichert jede Anfrage automatisch, damit du sie unter admin.html
  // siehst und daraus Touren planen kannst.
  // Beide Werte bekommst du in Supabase unter Project Settings → API.
  // Anleitung: SUPABASE-EINRICHTUNG.md. Solange sie leer sind, läuft der
  // Adminbereich im Übungsmodus (Daten nur auf dem eigenen Gerät).
  supabaseUrl: "https://cnshxqkuvtkenrogbjti.supabase.co",
  // "Publishable key" aus Supabase – laut Supabase ausdrücklich dafür gemacht,
  // öffentlich in einer Website zu stehen. Er erlaubt NUR das Anlegen neuer
  // Anfragen; Lesen geht ausschließlich mit dem Admin-Login.
  // NIEMALS den "secret"-Schlüssel (sb_secret_…) hier eintragen!
  supabaseAnonKey: "sb_publishable_0HhpDBH5PNqoeQ3mZDXXoA_6shdmvBB",

  // ── Tourenplanung (nur Adminbereich) ───────────────────────────────
  maxTourStunden: 9,             // Obergrenze reine Fahrzeit je Tour/Tag (Vorgabe Inhaber)
  tourStartZeit: "07:00",        // geplanter Abfahrtszeitpunkt (nur für die Anzeige)
  pauseNachStunden: 4.5,         // Lenkzeit bis zur Pflichtpause (§ EU-Sozialvorschriften)
  pauseMinuten: 45,              // Länge der Pflichtpause – wird in der Tour eingeplant

  // ── APIs & Fallbacks ───────────────────────────────────────────────
  // OpenRouteService: kostenloser Key auf openrouteservice.org.
  // Leer lassen => Entfernungen werden über Luftlinie × roadFactor geschätzt.
  // Hinweis: Auf der Live-Seite wird der Key beim Veröffentlichen automatisch
  // aus dem GitHub-Secret "ORS_API_KEY" eingesetzt (.github/workflows/deploy.yml).
  orsApiKey: "",
  // Tankerkönig: kostenloser Key auf tankerkoenig.de.
  // Leer lassen => fallbackDieselPrice wird verwendet.
  tankerkoenigApiKey: "",
  fallbackDieselPrice: 2.20,     // €/l wenn kein Key oder API nicht erreichbar (Vorgabe Inhaber)
  fuelCacheMinutes: 60,          // Dieselpreis so lange zwischenspeichern
  fuelSearchRadiusKm: 5,         // Tankstellensuche im Umkreis um das Depot
  roadFactor: 1.3                // Luftlinie × Faktor ≈ Straßen-km (Fallback)
};

/* ════════════════════════════════════════════════════════════════════
   Ab hier: Programmlogik – hier muss normalerweise nichts geändert werden.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Helfer ──────────────────────────────────────────────────────────

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLon = (b.lon - a.lon) * Math.PI / 180;
    var la1 = a.lat * Math.PI / 180;
    var la2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function fmtEur(n) {
    return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  function fmtEur0(n) {
    return n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
  }

  function fmtKm(n) {
    return n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " km";
  }

  function fmtNum(n, digits) {
    return n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function fmtDateDe(isoDate) {
    if (!isoDate) return "";
    var p = isoDate.split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : isoDate;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function median(arr) {
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  PREIS-ENGINES (pure Funktionen – kein DOM, kein Netzwerk)
  // ══════════════════════════════════════════════════════════════════

  // Volumen (m³, inkl. Marge) + Gewicht (kg) über alle Gegenstände.
  function computeItemsTotals(items) {
    var margin = CONFIG.itemMarginCm;
    var maxDim = CONFIG.maxItemDimCm;
    var volume = 0, weight = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.weightKg >= CONFIG.maxEinzelstueckKg) {
        return { ok: false, reason: "heavy", itemIndex: i };
      }
      var dims = [it.lengthCm + margin, it.widthCm + margin, it.heightCm + margin];
      dims.sort(function (a, b) { return b - a; }); // größtes Maß zuerst
      var lims = [maxDim.l, maxDim.w, maxDim.h].sort(function (a, b) { return b - a; });
      if (dims[0] > lims[0] || dims[1] > lims[1] || dims[2] > lims[2]) {
        return { ok: false, reason: "oversize", itemIndex: i };
      }
      volume += (dims[0] / 100) * (dims[1] / 100) * (dims[2] / 100) * it.qty;
      weight += it.weightKg * it.qty;
    }
    return { ok: true, volumeM3: volume, weightKg: weight };
  }

  // Die beiden Fahrtrichtungen der Beiladung. Beide rechnen mit exakt derselben
  // Formel – nur Start und Ziel sind vertauscht. "abseitsWennNoerdlich" legt fest,
  // auf welcher Seite eine Abholung als eigene Anfahrt statt als Umweg zählt.
  var RICHTUNGEN = {
    hin: {
      id: "hin",
      start: CONFIG.depot,
      ziel: CONFIG.destination,
      zielName: "Berlin",
      abseitsWennNoerdlich: false   // südlich von Stuttgart = abseits der Route
    },
    rueck: {
      id: "rueck",
      start: CONFIG.destination,
      ziel: CONFIG.depot,
      zielName: "Stuttgart",
      abseitsWennNoerdlich: true    // nördlich von Berlin = abseits der Route
    }
  };

  // Modellwahl: Abholfahrt oder Umweg (deterministisch über Luftlinie).
  function chooseKmModel(pickup, richtung) {
    var r = richtung || RICHTUNGEN.hin;
    var imUmkreis = haversineKm(r.start, pickup) <= CONFIG.pickupRadiusKm;
    var abseits = r.abseitsWennNoerdlich ? (pickup.lat > r.start.lat) : (pickup.lat < r.start.lat);
    return (imUmkreis || abseits) ? "abholfahrt" : "umweg";
  }

  // Fahrzeugkosten je Kilometer (ohne Fahrerlohn):
  // Diesel × Verbrauch + Verschleiß + Abschreibung + Fixkosten-Umlage + Maut.
  // Darf diese Lieferadresse einen Sofort-Preis bekommen? Ja, wenn sie
  // entweder im Zielgebiet liegt ODER unterwegs auf der Route – dort steigt
  // die Ladung dann einfach früher aus.
  function lieferzielErlaubt(delivery, richtung) {
    var r = richtung || RICHTUNGEN.hin;
    if (haversineKm(delivery, r.ziel) <= CONFIG.deliveryMaxKmFromBerlin) return true;
    var umweg = haversineKm(r.start, delivery) + haversineKm(delivery, r.ziel) -
                haversineKm(r.start, r.ziel);
    return umweg <= CONFIG.korridorMaxUmwegKm;
  }

  function vehicleCostPerKm(dieselPricePerL) {
    return dieselPricePerL * CONFIG.verbrauchLper100km / 100 +
           CONFIG.verschleissEurProKm + CONFIG.abschreibungEurProKm +
           CONFIG.fixkostenEurProKm + CONFIG.mautEurProKm +
           CONFIG.werbekostenProJahrEur / CONFIG.jahresKilometer;
  }

  // Gewinnaufschlag auf die Selbstkosten.
  // Preisspanne für die Anfrage: kein fester Betrag, sondern ein Rahmen um
  // den berechneten Preis. Die Untergrenze wird abgerundet, die Obergrenze
  // aufgerundet – so ist die Spanne nie enger als eingestellt.
  function preisSpanne(total) {
    return {
      von: Math.floor(total * (1 + CONFIG.spanneUnten / 100)),
      bis: Math.ceil(total * (1 + CONFIG.spanneOben / 100))
    };
  }
  function spanneText(total) {
    var s = preisSpanne(total);
    return fmtEur0(s.von) + " – " + fmtEur0(s.bis);
  }

  function applyMargin(n) {
    return n * (1 + CONFIG.gewinnaufschlagProzent / 100);
  }

  // Be-/Entladezeit in Stunden (Grundzeit je Stopp; Etagen und Schwergut
  // werden separat als feste Euro-Zuschläge berechnet).
  function handlingHours() {
    return 2 * CONFIG.ladezeitProStoppMin / 60;
  }

  // Alle Einzelbeträge einer Staffel-Spalte, ein Eintrag je Stück.
  function schwergutBetraege(items, feld) {
    var liste = [];
    var staffel = CONFIG.schwergutStaffel;
    for (var i = 0; i < items.length; i++) {
      for (var s = 0; s < staffel.length; s++) {
        if (items[i].weightKg >= staffel[s].abKg) {
          var betrag = staffel[s][feld] || 0;
          for (var q = 0; q < items[i].qty; q++) liste.push(betrag);
          break;
        }
      }
    }
    return liste;
  }

  // Mengenrabatt: Beträge absteigend sortiert, das teuerste Stück zählt voll,
  // jedes weitere nur anteilig. Durch die Sortierung kann ein zusätzliches
  // Stück den Betrag nie senken – Mehrladung wird also nie billiger.
  function mitMengenrabatt(betraege) {
    betraege.sort(function (a, b) { return b - a; });
    var summe = 0;
    for (var i = 0; i < betraege.length; i++) {
      summe += betraege[i] * (i === 0 ? 1 : CONFIG.weitereStueckeFaktor);
    }
    return summe;
  }

  // Aufschlag je Etage für schwere Einzelstücke, inklusive Mengenrabatt.
  function heavyItemFloorEur(items) {
    return mitMengenrabatt(schwergutBetraege(items, "proEtageEur"));
  }

  // Etagenzuschlag in € über beide Adressen.
  // Je Etage: Grundbetrag + Betrag je m³ + Aufschlag für schwere Stücke;
  // mit Aufzug nur der Aufzug-Faktor.
  function floorSurchargeEur(volumeM3, items, pickup, delivery) {
    var proEtage = CONFIG.etagenGrundEur + CONFIG.etagenProM3Eur * volumeM3 +
                   heavyItemFloorEur(items);
    function fuerAdresse(a) {
      return a.floors * proEtage * (a.elevator ? CONFIG.aufzugFaktor : 1);
    }
    return fuerAdresse(pickup) + fuerAdresse(delivery);
  }

  // Schwergut-Zuschlag in €: je Einzelstück nach dessen Gewicht, inklusive Mengenrabatt.
  function heavyItemSurchargeEur(items) {
    return mitMengenrabatt(schwergutBetraege(items, "eur"));
  }

  // Bereich 1: Beiladung Stuttgart → Berlin.
  // Selbstkosten = Fahrzeug + Fahrerzeit (beides anteilig nach Ladevolumen)
  //              + Be-/Entladen/Tragen (voll) + ggf. Beifahrer (voll),
  // darauf der Gewinnaufschlag, dann Mindestpreis.
  function calculateBerlinPrice(input) {
    var totals = computeItemsTotals(input.items);
    if (!totals.ok) return totals;

    if (totals.volumeM3 > CONFIG.vanVolumeM3) {
      return { ok: false, reason: "volume", volumeM3: totals.volumeM3, weightKg: totals.weightKg };
    }

    // Zuladung: Der Transporter darf nur begrenzt Gewicht mitnehmen. Passt die
    // Ladung volumenmäßig, wiegt aber zu viel, gibt es keinen Onlinepreis –
    // sonst wäre ein Preis zugesagt, den man nur mit Überladung fahren könnte.
    if (totals.weightKg > CONFIG.maxZuladungKg) {
      return { ok: false, reason: "weight", volumeM3: totals.volumeM3, weightKg: totals.weightKg };
    }

    // Anteil an Fahrzeug und Fahrzeit: ab vollpreisAbM3 zahlt der Kunde die ganze Fahrt.
    var share = Math.min(totals.volumeM3 / CONFIG.vollpreisAbM3, 1);
    var model = chooseKmModel(input.pickup, input.richtung);
    var l = input.legs;
    var km, hours;
    if (model === "abholfahrt") {
      km = 2 * l.depotToPickup.km + l.depotToDelivery.km;
      hours = 2 * l.depotToPickup.hours + l.depotToDelivery.hours;
    } else {
      // Umweg-Modell: der Mehrweg für die Abholung PLUS die Strecke,
      // die die Ladung danach tatsächlich bis zum Ziel mitfährt.
      var umwegKm = Math.max(0, l.depotToPickup.km + l.pickupToDelivery.km - l.depotToDelivery.km);
      var umwegStd = Math.max(0, l.depotToPickup.hours + l.pickupToDelivery.hours - l.depotToDelivery.hours);
      km = umwegKm + l.pickupToDelivery.km;
      hours = umwegStd + l.pickupToDelivery.hours;
    }

    var kostenProKm = vehicleCostPerKm(input.dieselPricePerL);
    var vehicleCost = km * kostenProKm * share;
    var driverDriveCost = hours * CONFIG.fahrerStundensatzEur * share;

    // Stellplatz-Zuschlag: Die Ladung fährt nur einen Teil der Hauptstrecke
    // mit, belegt den Platz aber faktisch die ganze Fahrt über – umladen
    // unterwegs geht nicht. Für die Strecke, die der Platz ungenutzt
    // blockiert bleibt, wird ein Anteil berechnet.
    // Volle Strecke mitgefahren => blockierteKm = 0 => kein Zuschlag.
    var hauptlaufKm = (l.startToZiel && l.startToZiel.km) || 0;
    var mitfahrtKm = Math.min(l.pickupToDelivery.km, hauptlaufKm);
    var blockierteKm = Math.max(0, hauptlaufKm - mitfahrtKm);
    var platzCost = blockierteKm * kostenProKm * share * CONFIG.platzblockadeFaktor;

    var handlingH = handlingHours();
    var handlingSelfCost = handlingH * CONFIG.fahrerStundensatzEur;

    // Beifahrer: Ein Träger wird oft nur an EINER der beiden Adressen
    // gebraucht (z. B. oben im 3. Stock, unten aber nicht). Bezahlt wird
    // deshalb nur die Ladezeit der Stopps, an denen er wirklich anpackt.
    // Die Fahrzeit zählt weiter anteilig: Er sitzt die ganze Tour mit im
    // Auto, unterwegs aussteigen lassen geht nicht.
    // Ältere Anfragen (und Aufrufe von außen) kennen nur "helperNeeded"
    // ohne Angabe wo – dann gilt der Träger an beiden Adressen.
    var hatWoAngabe = (input.traegerAbholung !== undefined || input.traegerLieferung !== undefined);
    var trAb   = hatWoAngabe ? !!input.traegerAbholung  : !!input.helperNeeded;
    var trLief = hatWoAngabe ? !!input.traegerLieferung : !!input.helperNeeded;
    var traegerStopps = (trAb ? 1 : 0) + (trLief ? 1 : 0);
    var helperSelfCost = (traegerStopps > 0 && !input.customerHelps)
      ? (CONFIG.ladezeitProStoppMin / 60) * traegerStopps * CONFIG.beifahrerStundensatzEur +
        hours * CONFIG.beifahrerStundensatzEur * share
      : 0;

    // Der Mengenrabatt für mehrere Stücke steckt bereits in den beiden Funktionen.
    var floorEur = floorSurchargeEur(totals.volumeM3, input.items, input.pickup, input.delivery);
    var heavyEur = heavyItemSurchargeEur(input.items);

    var selbstkosten = vehicleCost + driverDriveCost + platzCost + handlingSelfCost +
                       helperSelfCost + floorEur + heavyEur;
    var subtotal = applyMargin(selbstkosten);
    var minApplied = subtotal < CONFIG.minPriceEur;
    var total = Math.ceil(Math.max(subtotal, CONFIG.minPriceEur));

    return {
      ok: true,
      model: model,
      chargeableKm: km,
      chargeableHours: hours,
      volumeM3: totals.volumeM3,
      volumeShare: share,
      weightKg: totals.weightKg,
      dieselPricePerL: input.dieselPricePerL,
      mitfahrtKm: mitfahrtKm,
      blockierteKm: blockierteKm,
      traegerStopps: traegerStopps,
      traegerAbholung: trAb,
      traegerLieferung: trLief,
      // Kundensicht: Zeilen inkl. anteiligem Gewinnaufschlag
      fahrtCost: applyMargin(vehicleCost + driverDriveCost),
      platzCost: applyMargin(platzCost),
      handlingCost: applyMargin(handlingSelfCost),
      helperCost: applyMargin(helperSelfCost),
      floorCost: applyMargin(floorEur),
      heavyCost: applyMargin(heavyEur),
      handlingMinutes: handlingH * 60,
      selbstkosten: selbstkosten,
      subtotal: subtotal,
      minApplied: minApplied,
      total: total
    };
  }

  // Bereich 2: Sonderfahrt (exklusiver Transporter).
  // Selbstkosten = Fahrzeug (alle km) + Fahrer (Fahrzeit + Ladezeit)
  //              + ggf. Beifahrer (gleiche Zeit), darauf Gewinnaufschlag.
  function calculateSonderfahrtPrice(input) {
    var l = input.legs;
    var km = l.depotToPickup.km + l.pickupToDest.km + l.destToDepot.km;
    var driveHours = l.depotToPickup.hours + l.pickupToDest.hours + l.destToDepot.hours;
    var loadHours = 2 * CONFIG.ladezeitProStoppMin / 60;
    var totalHours = driveHours + loadHours;

    var vehicleCost = km * vehicleCostPerKm(input.dieselPricePerL);
    var driverCost = totalHours * CONFIG.fahrerStundensatzEur;
    var helperCost = input.helperNeeded ? totalHours * CONFIG.beifahrerStundensatzEur : 0;

    var selbstkosten = vehicleCost + driverCost + helperCost;
    var subtotal = applyMargin(selbstkosten);
    var minApplied = subtotal < CONFIG.sonderfahrtMinPriceEur;
    var total = Math.ceil(Math.max(subtotal, CONFIG.sonderfahrtMinPriceEur));

    return {
      ok: true,
      totalKm: km,
      totalHours: totalHours,
      dieselPricePerL: input.dieselPricePerL,
      vehicleCost: applyMargin(vehicleCost),
      driverCost: applyMargin(driverCost),
      helperCost: applyMargin(helperCost),
      selbstkosten: selbstkosten,
      subtotal: subtotal,
      minApplied: minApplied,
      total: total
    };
  }

  // Anfahrtskosten-Stufe für den Putzservice.
  function travelFeeForKm(km) {
    var tiers = CONFIG.cleaningTravelTiers;
    for (var i = 0; i < tiers.length; i++) {
      if (km <= tiers[i].maxKm) return tiers[i].feeEur;
    }
    return tiers[tiers.length - 1].feeEur;
  }

  // Bereich 3: Putzservice (Stunden × Kräfte × Satz + Anfahrt).
  function calculateCleaningPrice(input) {
    if (input.areaKm > CONFIG.cleaningRadiusKm) {
      return { ok: false, reason: "area", areaKm: input.areaKm };
    }
    var billedHours = Math.max(input.hours, CONFIG.cleaningMinHours);
    var labor = billedHours * input.staff * CONFIG.cleaningHourlyRateEur;
    var travelFee = travelFeeForKm(input.travelKm);
    return {
      ok: true,
      billedHours: billedHours,
      hoursRaised: billedHours > input.hours,
      staff: input.staff,
      labor: labor,
      travelKm: input.travelKm,
      travelFee: travelFee,
      total: labor + travelFee
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  SELBSTTESTS (?test=1 an die URL anhängen)
  // ══════════════════════════════════════════════════════════════════

  function runSelfTests() {
    var results = [];
    // Die Tests rechnen bewusst ohne Gewinnaufschlag, damit sie unabhängig
    // davon gelten, welcher Prozentsatz gerade eingestellt ist.
    var margeVorTests = CONFIG.gewinnaufschlagProzent;
    CONFIG.gewinnaufschlagProzent = 0;

    function check(name, actual, expected) {
      var pass = Math.abs(actual - expected) < 0.001;
      results.push({ Test: name, Erwartet: expected, Erhalten: Math.round(actual * 10000) / 10000, OK: pass });
    }
    function checkTrue(name, cond) {
      results.push({ Test: name, Erwartet: true, Erhalten: !!cond, OK: !!cond });
    }

    var legs = {
      depotToPickup:    { km: 10,  hours: 0.2 },
      pickupToDelivery: { km: 620, hours: 8.8 },
      depotToDelivery:  { km: 630, hours: 9.0 },
      // Hauptlauf = Mitfahrstrecke: dieser Testkunde fährt die volle
      // Strecke mit, es entsteht also kein Stellplatz-Zuschlag.
      startToZiel:      { km: 620, hours: 8.8 }
    };
    var south = { lat: 48.5, lon: 9.0 };   // südlich vom Depot => Abholfahrt
    var north = { lat: 49.45, lon: 11.08 }; // Nürnberg-artig => Umweg

    function berlinInput(over) {
      var base = {
        items: [{ lengthCm: 100, widthCm: 100, heightCm: 100, weightKg: 10, qty: 1 }],
        legs: legs,
        pickup: { lat: south.lat, lon: south.lon, floors: 0, elevator: false },
        delivery: { floors: 0, elevator: false },
        helperNeeded: false, customerHelps: false,
        dieselPricePerL: 1.65
      };
      for (var k in over) base[k] = over[k];
      return base;
    }

    // Kostenbausteine: Verbrauch 14 l, 0,065+0,09+0,055 €/km, Maut 0, Werbung 4000/40000 = 0,10 €/km
    check("Fahrzeugkosten/km bei Diesel 1,65", vehicleCostPerKm(1.65), 0.541);
    check("Be-/Entladezeit => 45 Min.", handlingHours() * 60, 45);

    // Etagenzuschlag: je Etage 6 € + 4 € je m³ (exakt, keine Aufrundung)
    var eg = { floors: 0, elevator: false };
    var leicht = [{ weightKg: 20, qty: 1 }];
    check("Etagen: 0,35 m³ leicht, 3. OG => 22,20 € (3 × 7,40 €)",
      floorSurchargeEur(0.35, leicht, { floors: 3, elevator: false }, eg), 22.2);
    check("Etagen: 2 m³ leicht, 2. OG => 28 € (2 × 14 €)",
      floorSurchargeEur(2, leicht, { floors: 2, elevator: false }, eg), 28);
    check("Etagen: volle Ladung (10 m³) leicht, 1. OG => 46 €",
      floorSurchargeEur(10, leicht, { floors: 1, elevator: false }, eg), 46);
    check("Etagen: mit Aufzug nur 30 % => 6,66 €",
      floorSurchargeEur(0.35, leicht, { floors: 3, elevator: true }, eg), 6.66);
    check("Etagen: beide Adressen zählen => 56 €",
      floorSurchargeEur(2, leicht, { floors: 2, elevator: false }, { floors: 2, elevator: false }), 56);
    check("Etagen: Erdgeschoss => 0 €", floorSurchargeEur(2, leicht, eg, eg), 0);

    // Schweres Stück erhöht den Etagenpreis: ab 40 kg +6 €, ab 60 kg +12 €, ab 80 kg +20 €
    check("Etagen: 70-kg-Stück, 3. OG => 58,20 € (3 × 19,40 €)",
      floorSurchargeEur(0.35, [{ weightKg: 70, qty: 1 }], { floors: 3, elevator: false }, eg), 58.2);
    check("Etagen: 85-kg-Stück, 1. OG => 27,40 €",
      floorSurchargeEur(0.35, [{ weightKg: 85, qty: 1 }], { floors: 1, elevator: false }, eg), 27.4);
    check("Etagen: 2 Stück à 45 kg, 1. OG => 16,40 € (6 + 1,4 + 9)",
      floorSurchargeEur(0.35, [{ weightKg: 45, qty: 2 }], { floors: 1, elevator: false }, eg), 16.4);
    check("Etagen: 39-kg-Stück zählt nicht als schwer => 7,40 €",
      floorSurchargeEur(0.35, [{ weightKg: 39, qty: 1 }], { floors: 1, elevator: false }, eg), 7.4);

    // Schwergut-Staffel je Einzelstück: ab 40 kg 30 €, ab 60 kg 60 €, ab 80 kg 80 €
    check("Schwergut 30 kg => 0 €", heavyItemSurchargeEur([{ weightKg: 30, qty: 1 }]), 0);
    check("Schwergut 39,9 kg => 0 €", heavyItemSurchargeEur([{ weightKg: 39.9, qty: 1 }]), 0);
    check("Schwergut 40 kg => 30 €", heavyItemSurchargeEur([{ weightKg: 40, qty: 1 }]), 30);
    check("Schwergut 59,9 kg => 30 €", heavyItemSurchargeEur([{ weightKg: 59.9, qty: 1 }]), 30);
    check("Schwergut 60 kg => 60 €", heavyItemSurchargeEur([{ weightKg: 60, qty: 1 }]), 60);
    check("Schwergut 70 kg => 60 €", heavyItemSurchargeEur([{ weightKg: 70, qty: 1 }]), 60);
    check("Schwergut 80 kg => 80 €", heavyItemSurchargeEur([{ weightKg: 80, qty: 1 }]), 80);
    check("Schwergut 99 kg => 80 €", heavyItemSurchargeEur([{ weightKg: 99, qty: 1 }]), 80);
    // Mengenrabatt: teuerstes Stück voll, jedes weitere zum halben Preis
    check("Mengenrabatt: einzelnes Stück bleibt voll",
      heavyItemSurchargeEur([{ weightKg: 70, qty: 1 }]), 60);
    check("Mengenrabatt: 2 Stück à 70 kg => 60 + 30 = 90 €",
      heavyItemSurchargeEur([{ weightKg: 70, qty: 2 }]), 90);
    check("Mengenrabatt: 3 Stück à 70 kg => 60 + 2×30 = 120 €",
      heavyItemSurchargeEur([{ weightKg: 70, qty: 3 }]), 120);
    check("Mengenrabatt: 6 Stück à 70 kg => 60 + 5×30 = 210 €",
      heavyItemSurchargeEur([{ weightKg: 70, qty: 6 }]), 210);
    check("Mengenrabatt: teuerstes zählt voll (80 + 0,5×30) => 95 €",
      heavyItemSurchargeEur([{ weightKg: 45, qty: 1 }, { weightKg: 85, qty: 1 }]), 95);
    check("Mengenrabatt: leichtes Beistück ändert nichts",
      heavyItemSurchargeEur([{ weightKg: 70, qty: 1 }, { weightKg: 5, qty: 1 }]), 60);
    check("Mengenrabatt: 4×85 kg + 1×45 kg => 80 + 0,5×270 = 215 €",
      heavyItemSurchargeEur([{ weightKg: 85, qty: 4 }, { weightKg: 45, qty: 1 }]), 215);

    // Modellwahl
    checkTrue("Ludwigsburg (18 km, nördlich) => Abholfahrt", chooseKmModel({ lat: 48.90, lon: 9.19 }) === "abholfahrt");
    checkTrue("Tübingen (südlich) => Abholfahrt", chooseKmModel({ lat: 48.52, lon: 9.05 }) === "abholfahrt");
    checkTrue("Ulm (75 km, südlich) => Abholfahrt", chooseKmModel({ lat: 48.40, lon: 9.99 }) === "abholfahrt");
    checkTrue("Nürnberg => Umweg", chooseKmModel(north) === "umweg");
    checkTrue("Karlsruhe => Umweg", chooseKmModel({ lat: 49.01, lon: 8.40 }) === "umweg");

    // Rückrichtung Berlin → Stuttgart: gespiegelte Logik
    var rueck = RICHTUNGEN.rueck;
    checkTrue("Rückweg: Potsdam (Umkreis Berlin) => Abholfahrt",
      chooseKmModel({ lat: 52.40, lon: 13.06 }, rueck) === "abholfahrt");
    checkTrue("Rückweg: Rostock (nördlich von Berlin) => Abholfahrt",
      chooseKmModel({ lat: 54.09, lon: 12.13 }, rueck) === "abholfahrt");
    checkTrue("Rückweg: Leipzig (auf der Route) => Umweg",
      chooseKmModel({ lat: 51.34, lon: 12.37 }, rueck) === "umweg");
    checkTrue("Rückweg: Nürnberg (auf der Route) => Umweg",
      chooseKmModel(north, rueck) === "umweg");
    checkTrue("Rückweg: Start ist Berlin, Ziel Stuttgart",
      rueck.start === CONFIG.destination && rueck.ziel === CONFIG.depot);

    // km- und Zeit-Formeln
    var abhol = calculateBerlinPrice(berlinInput({}));
    check("Abholfahrt-km = 2×10 + 630", abhol.chargeableKm, 650);
    check("Abholfahrt-Stunden = 2×0,2 + 9", abhol.chargeableHours, 9.4);
    // Umweg-Modell: Mehrweg (10 + 620 − 630 = 0) + Transportstrecke (620)
    var umweg = calculateBerlinPrice(berlinInput({ pickup: { lat: north.lat, lon: north.lon, floors: 0, elevator: false } }));
    check("Umweg-km = Mehrweg 0 + Transport 620", umweg.chargeableKm, 620);
    check("Umweg-Stunden = 0 + 8,8", umweg.chargeableHours, 8.8);
    var umwegMitMehrweg = calculateBerlinPrice(berlinInput({
      pickup: { lat: north.lat, lon: north.lon, floors: 0, elevator: false },
      legs: { depotToPickup: { km: 200, hours: 2.5 }, pickupToDelivery: { km: 500, hours: 6 }, depotToDelivery: { km: 630, hours: 9 } }
    }));
    check("Umweg-km = Mehrweg 70 + Transport 500", umwegMitMehrweg.chargeableKm, 570);

    // ── Stellplatz-Zuschlag: Teilstrecken blockieren die Ladefläche ──
    function teilstrecke(mitfahrtKm) {
      return calculateBerlinPrice(berlinInput({
        pickup: { lat: north.lat, lon: north.lon, floors: 0, elevator: false },
        legs: {
          depotToPickup:    { km: 200, hours: 2.5 },
          pickupToDelivery: { km: mitfahrtKm, hours: mitfahrtKm / 70 },
          depotToDelivery:  { km: 200 + mitfahrtKm, hours: 2.5 + mitfahrtKm / 70 },
          startToZiel:      { km: 630, hours: 9 }
        }
      }));
    }
    var volleStrecke = teilstrecke(630);
    check("Volle Strecke => kein Stellplatz-Zuschlag", volleStrecke.platzCost, 0);
    check("Volle Strecke => 0 km blockiert", volleStrecke.blockierteKm, 0);

    var halbeStrecke = teilstrecke(300);
    check("300 von 630 km => 330 km blockiert", halbeStrecke.blockierteKm, 330);
    // 330 km × 0,541 €/km × 14,57 % Anteil × 0,35 = 9,10 €
    check("Stellplatz bei 330 km blockiert => 9,10 €", halbeStrecke.platzCost, 9.1040138);

    var kurzeStrecke = teilstrecke(50);
    check("50 von 630 km => 580 km blockiert", kurzeStrecke.blockierteKm, 580);
    checkTrue("Kurze Teilstrecke zahlt mehr Stellplatz als lange",
      kurzeStrecke.platzCost > halbeStrecke.platzCost);

    // Wichtig: Der Preis darf mit längerer Mitfahrt nie SINKEN.
    var monoton = true, vorher = -1;
    [50, 150, 300, 450, 630].forEach(function (km) {
      var t = teilstrecke(km).subtotal;
      if (t <= vorher) monoton = false;
      vorher = t;
    });
    checkTrue("Preis steigt durchgehend mit der Mitfahrstrecke", monoton);

    // Faktor 0 schaltet den Zuschlag komplett ab
    var faktorVorher = CONFIG.platzblockadeFaktor;
    CONFIG.platzblockadeFaktor = 0;
    check("Faktor 0 => kein Stellplatz-Zuschlag", teilstrecke(300).platzCost, 0);
    CONFIG.platzblockadeFaktor = faktorVorher;

    // ── Zuladungsgrenze (1200 kg) ──
    // Volumen passt, Gewicht nicht: 20 Kisten à 60 kg = 1200 kg sind noch ok,
    // 21 Kisten = 1260 kg nicht mehr.
    function kisten(anzahl, kg) {
      return calculateBerlinPrice(berlinInput({
        items: [{ lengthCm: 40, widthCm: 30, heightCm: 30, weightKg: kg, qty: anzahl }]
      }));
    }
    var genauGrenze = kisten(20, 60);      // exakt 1200 kg
    var drueber     = kisten(21, 60);      // 1260 kg
    checkTrue("Genau 1200 kg werden noch angenommen", genauGrenze.ok === true);
    checkTrue("1260 kg werden abgelehnt", drueber.ok === false);
    checkTrue("Ablehnungsgrund ist das Gewicht", drueber.reason === "weight");
    check("Abgelehnte Sendung meldet ihr Gewicht zurück", drueber.weightKg, 1260);
    // Die Volumenprüfung darf davon unberührt bleiben
    var leichtAberGross = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 100, widthCm: 100, heightCm: 100, weightKg: 1, qty: 12 }]
    }));
    checkTrue("Zu großes Volumen bleibt Grund 'volume'", leichtAberGross.reason === "volume");

    // ── Preisspanne für die Anfrage ──
    var sp = preisSpanne(400);
    check("Spanne unten bei 400 € => 380 €", sp.von, 380);
    check("Spanne oben bei 400 € => 460 €", sp.bis, 460);
    checkTrue("Untergrenze liegt unter dem Preis", preisSpanne(137).von < 137);
    checkTrue("Obergrenze liegt über dem Preis", preisSpanne(137).bis > 137);
    checkTrue("Auch beim Mindestpreis bleibt die Spanne sinnvoll",
      preisSpanne(60).von === 57 && preisSpanne(60).bis === 69);
    checkTrue("Spanne wird als Text mit Gedankenstrich ausgegeben",
      spanneText(400).indexOf("–") !== -1);

    // ── Träger nur an einer der beiden Adressen ──
    function mitTraeger(ab, lief, hilftSelbst) {
      return calculateBerlinPrice(berlinInput({
        helperNeeded: ab || lief, traegerAbholung: ab, traegerLieferung: lief,
        customerHelps: !!hilftSelbst
      }));
    }
    var ohneT  = mitTraeger(false, false);
    var beides = mitTraeger(true, true);
    var nurAb  = mitTraeger(true, false);
    var nurLf  = mitTraeger(false, true);

    check("Ohne Träger: 0 € Beifahrer", ohneT.helperCost, 0);
    checkTrue("Träger an beiden Adressen kostet am meisten",
      beides.helperCost > nurAb.helperCost && nurAb.helperCost > 0);
    check("Nur Abholen und nur Liefern kosten gleich viel", nurAb.helperCost - nurLf.helperCost, 0);
    // Unterschied = die eingesparte Ladezeit eines Stopps: 22,5 Min. × 30 €/h
    check("Ein Stopp weniger spart 11,25 €", beides.helperCost - nurAb.helperCost, 11.25);
    check("traegerStopps zählt richtig (beides)", beides.traegerStopps, 2);
    check("traegerStopps zählt richtig (nur einer)", nurLf.traegerStopps, 1);
    check("Kunde hilft selbst mit => 0 €", mitTraeger(true, true, true).helperCost, 0);
    checkTrue("Preis mit Träger liegt über dem ohne", beides.total > ohneT.total);

    // ── Lieferadressen unterwegs auf der Route ──
    checkTrue("Berlin selbst ist erlaubt",
      lieferzielErlaubt({ lat: 52.52, lon: 13.405 }, RICHTUNGEN.hin));
    checkTrue("Nürnberg liegt auf der Route => erlaubt",
      lieferzielErlaubt({ lat: 49.45, lon: 11.08 }, RICHTUNGEN.hin));
    checkTrue("Leipzig liegt auf der Route => erlaubt",
      lieferzielErlaubt({ lat: 51.34, lon: 12.37 }, RICHTUNGEN.hin));
    checkTrue("München liegt nicht auf der Route => abgelehnt",
      !lieferzielErlaubt({ lat: 48.14, lon: 11.58 }, RICHTUNGEN.hin));
    checkTrue("Hamburg liegt nicht auf der Route => abgelehnt",
      !lieferzielErlaubt({ lat: 53.55, lon: 9.99 }, RICHTUNGEN.hin));
    checkTrue("Rückrichtung: Nürnberg liegt auch dort auf der Route",
      lieferzielErlaubt({ lat: 49.45, lon: 11.08 }, RICHTUNGEN.rueck));
    checkTrue("Rückrichtung: Stuttgart selbst ist erlaubt",
      lieferzielErlaubt(CONFIG.depot, RICHTUNGEN.rueck));

    // Anteilsberechnung: voller Fahrtpreis ab 7,5 m³, gedeckelt bei 100 %
    check("Anteil bei 1,0927 m³ => 14,57 %", abhol.volumeShare * 100, 14.5696933);
    var grosseLadung = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 60, widthCm: 40, heightCm: 40, weightKg: 10, qty: 70 }]
    }));
    checkTrue("8,15 m³ => voller Fahrtpreis (Anteil 100 %)", grosseLadung.volumeShare === 1);

    // Beiladung Berlin, komplettes Beispiel (1,0927 m³ => 14,57 % Anteil):
    // Fahrzeug 650×0,541×Anteil = 51,23 € | Fahrer 9,4×30×Anteil = 41,09 €
    // Verladen 45 Min. × 30 € = 22,50 € => 114,82 € Selbstkosten => 115 € (aufgerundet)
    check("Beispiel: Volumen 1,0927 m³", abhol.volumeM3, 1.092727);
    check("Beispiel: Selbstkosten 114,82 €", abhol.subtotal, 114.82085);
    check("Beispiel: Gesamtpreis 115 €", abhol.total, 115);

    // Beifahrer: Ladezeit voll (22,50 €) + Fahrzeit anteilig (9,4×30×14,57 % = 41,09 €)
    var helper = calculateBerlinPrice(berlinInput({ helperNeeded: true, customerHelps: false }));
    check("Beifahrer => +63,59 €, gesamt 179 €", helper.total, 179);
    var helperSelf = calculateBerlinPrice(berlinInput({ helperNeeded: true, customerHelps: true }));
    check("Kunde hilft selbst => Beifahrer 0 €", helperSelf.helperCost, 0);

    // Zuschläge im Gesamtpreis (1,0927 m³ => 6 + 4,37 = 10,37 €/Etage)
    var mitEtagen = calculateBerlinPrice(berlinInput({
      pickup: { lat: south.lat, lon: south.lon, floors: 3, elevator: false }
    }));
    check("3. OG => +31,11 € Etagenzuschlag, gesamt 146 €", mitEtagen.total, 146);
    var mitSchwergut = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 100, widthCm: 100, heightCm: 100, weightKg: 70, qty: 1 }]
    }));
    check("70-kg-Stück => +60 € Schwergut, gesamt 175 €", mitSchwergut.total, 175);

    // Mehrladung darf den Preis nie senken: schweres Stück plus leichtes Beistück
    var nurSchwer = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 85, widthCm: 60, heightCm: 60, weightKg: 70, qty: 1 }],
      pickup: { lat: south.lat, lon: south.lon, floors: 3, elevator: false }
    }));
    var schwerPlusKarton = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 85, widthCm: 60, heightCm: 60, weightKg: 70, qty: 1 },
              { lengthCm: 30, widthCm: 20, heightCm: 15, weightKg: 2, qty: 1 }],
      pickup: { lat: south.lat, lon: south.lon, floors: 3, elevator: false }
    }));
    checkTrue("Beistück macht den Auftrag nicht billiger",
      schwerPlusKarton.total >= nurSchwer.total);
    var zweiSchwer = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 85, widthCm: 60, heightCm: 60, weightKg: 70, qty: 2 }],
      pickup: { lat: south.lat, lon: south.lon, floors: 3, elevator: false }
    }));
    checkTrue("Zweites schweres Stück erhöht den Preis", zweiSchwer.total > nurSchwer.total);
    var zuSchwer = calculateBerlinPrice(berlinInput({
      items: [{ lengthCm: 60, widthCm: 60, heightCm: 60, weightKg: 100, qty: 1 }]
    }));
    checkTrue("100-kg-Stück => reason 'heavy'", zuSchwer.ok === false && zuSchwer.reason === "heavy");

    // Gewinnaufschlag: 25 % auf 114,82 € Selbstkosten => 143,53 => 144 €
    var savedMargin = CONFIG.gewinnaufschlagProzent;
    CONFIG.gewinnaufschlagProzent = 25;
    check("Gewinnaufschlag 25 % => 144 €", calculateBerlinPrice(berlinInput({})).total, 144);
    CONFIG.gewinnaufschlagProzent = savedMargin;

    // Passt-nicht & Übergröße
    var tooBig = calculateBerlinPrice(berlinInput({ items: [{ lengthCm: 110, widthCm: 110, heightCm: 110, weightKg: 5, qty: 10 }] }));
    checkTrue("14,4 m³ => reason 'volume'", tooBig.ok === false && tooBig.reason === "volume");
    var oversize = calculateBerlinPrice(berlinInput({ items: [{ lengthCm: 320, widthCm: 40, heightCm: 40, weightKg: 5, qty: 1 }] }));
    checkTrue("320 cm Länge => reason 'oversize'", oversize.ok === false && oversize.reason === "oversize");

    // Mindestpreis
    var shoe = calculateBerlinPrice(berlinInput({ items: [{ lengthCm: 30, widthCm: 20, heightCm: 15, weightKg: 1, qty: 1 }] }));
    check("Schuhkarton => 60 € Mindestpreis", shoe.total, 60);
    checkTrue("Mindestpreis-Flag gesetzt", shoe.minApplied === true);

    // Sonderfahrt: 90 km, 1,5 h Fahrt + 45 Min. Ladezeit = 2,25 h
    // Fahrzeug 90×0,541 = 48,69 € | Fahrer 2,25×30 = 67,50 € => 116,19 => 117 €
    var sfLegs = {
      depotToPickup: { km: 30, hours: 0.5 },
      pickupToDest:  { km: 30, hours: 0.5 },
      destToDepot:   { km: 30, hours: 0.5 }
    };
    var sf = calculateSonderfahrtPrice({ legs: sfLegs, helperNeeded: false, dieselPricePerL: 1.65 });
    check("Sonderfahrt 90 km => 117 €", sf.total, 117);
    var sfHelper = calculateSonderfahrtPrice({ legs: sfLegs, helperNeeded: true, dieselPricePerL: 1.65 });
    check("Sonderfahrt mit Beifahrer => +67,50 € => 184 €", sfHelper.total, 184);
    var sfMin = calculateSonderfahrtPrice({
      legs: { depotToPickup: { km: 10, hours: 0.15 }, pickupToDest: { km: 10, hours: 0.15 }, destToDepot: { km: 10, hours: 0.15 } },
      helperNeeded: false, dieselPricePerL: 1.65
    });
    check("Sonderfahrt Kurzstrecke => 60 € Mindestpreis", sfMin.total, 60);
    checkTrue("Sonderfahrt-Mindestpreis-Flag", sfMin.minApplied === true);

    // Putzservice
    check("Anfahrt 5,0 km => 5 €", travelFeeForKm(5.0), 5);
    check("Anfahrt 5,1 km => 10 €", travelFeeForKm(5.1), 10);
    check("Anfahrt 12 km => 15 €", travelFeeForKm(12), 15);
    check("Anfahrt 17 km => 20 €", travelFeeForKm(17), 20);
    var cl1 = calculateCleaningPrice({ hours: 1, staff: 1, travelKm: 3, areaKm: 3 });
    check("Putz 1 h × 1 Kraft, 3 km => 65 €", cl1.total, 65);
    checkTrue("Stunden auf Mindestbuchung angehoben", cl1.hoursRaised === true);
    var cl2 = calculateCleaningPrice({ hours: 3, staff: 2, travelKm: 12, areaKm: 12 });
    check("Putz 3 h × 2 Kräfte, 12 km => 195 €", cl2.total, 195);
    var clOut = calculateCleaningPrice({ hours: 2, staff: 1, travelKm: 30, areaKm: 30 });
    checkTrue("30 km => außerhalb Einsatzgebiet", clOut.ok === false && clOut.reason === "area");

    CONFIG.gewinnaufschlagProzent = margeVorTests;

    var failed = results.filter(function (r) { return !r.OK; });
    if (window.console && console.table) console.table(results);
    var banner = document.createElement("div");
    banner.className = "test-banner " + (failed.length ? "fail" : "pass");
    if (!failed.length) {
      banner.textContent = "Selbsttests: " + results.length + "/" + results.length + " bestanden ✓";
    } else {
      // Die fehlgeschlagenen Tests direkt hier auflisten – ein Verweis auf
      // die Konsole hilft nicht, wenn man nur den Bildschirm sieht.
      banner.textContent = "Selbsttests: " + failed.length + " von " + results.length +
                           " FEHLGESCHLAGEN";
      var liste = document.createElement("ul");
      failed.forEach(function (r) {
        var li = document.createElement("li");
        li.textContent = r.Test + " — erwartet: " + r.Erwartet + ", erhalten: " + r.Erhalten;
        liste.appendChild(li);
      });
      banner.appendChild(liste);
    }
    document.body.appendChild(banner);
  }

  // ══════════════════════════════════════════════════════════════════
  //  API-SCHICHT
  // ══════════════════════════════════════════════════════════════════

  // Photon-Adresssuche (Autocomplete). bias = {lat, lon} für bessere Treffer.
  function photonSearch(query, bias, signal) {
    var url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(query) +
              "&lang=de&limit=5&lat=" + bias.lat + "&lon=" + bias.lon;
    return fetch(url, { signal: signal }).then(function (r) {
      if (!r.ok) throw new Error("photon " + r.status);
      return r.json();
    }).then(function (data) {
      return (data.features || []).map(photonFeatureToPlace).filter(Boolean);
    });
  }

  function photonFeatureToPlace(f) {
    if (!f || !f.geometry || !f.geometry.coordinates) return null;
    var p = f.properties || {};
    var main = p.name || [p.street, p.housenumber].filter(Boolean).join(" ");
    if (!main) return null;
    var secondary = [p.postcode, p.city || p.town || p.village, p.state]
      .filter(Boolean).join(", ");
    return {
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      main: main,
      secondary: secondary,
      label: secondary ? main + ", " + secondary : main
    };
  }

  // Einmalige Geokodierung beim Absenden (Photon, dann ORS als Fallback).
  // Wichtig: Es wird unterschieden zwischen "Adresse gibt es nicht" und
  // "Adressdienst gerade gestört". Sonst bekommt der Kunde bei einem
  // Ausfall die Schuld zugeschoben und korrigiert eine völlig richtige
  // Adresse so lange, bis er aufgibt.
  function geocodeQuery(query, bias) {
    var dienstGestoert = false;
    return photonSearch(query, bias, undefined).then(function (places) {
      if (places.length) return places[0];
      throw new Error("photon leer");
    }).catch(function (err) {
      // "photon leer" = Dienst lief, kannte die Adresse nur nicht.
      // Alles andere (Netzfehler, 4xx/5xx, Zeitüberschreitung) = Störung.
      dienstGestoert = !err || err.message !== "photon leer";
      if (!CONFIG.orsApiKey) return dienstGestoert ? { gestoert: true } : null;
      var url = "https://api.openrouteservice.org/geocode/search?api_key=" +
                encodeURIComponent(CONFIG.orsApiKey) +
                "&text=" + encodeURIComponent(query) +
                "&boundary.country=DE&size=1" +
                "&focus.point.lat=" + bias.lat + "&focus.point.lon=" + bias.lon;
      return fetch(url).then(function (r) { return r.json(); }).then(function (data) {
        var f = data.features && data.features[0];
        if (!f) return null;
        return {
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          main: f.properties.label,
          secondary: "",
          label: f.properties.label
        };
      }).catch(function () {
        // Auch der Ersatzdienst antwortet nicht – dann liegt es sicher nicht
        // am Kunden.
        return { gestoert: true };
      });
    });
  }

  // Straßen-km + Fahrzeit zwischen zwei Punkten: ORS, sonst Luftlinie × roadFactor
  // und Fahrzeit über das Durchschnittstempo geschätzt.
  var routeCache = {};
  function routeKm(from, to) {
    var fbKm = haversineKm(from, to) * CONFIG.roadFactor;
    var fallback = { km: fbKm, hours: fbKm / CONFIG.durchschnittstempoKmh, estimated: true };
    if (!CONFIG.orsApiKey) return Promise.resolve(fallback);

    var key = [from.lat.toFixed(4), from.lon.toFixed(4), to.lat.toFixed(4), to.lon.toFixed(4)].join("|");
    if (routeCache[key]) return Promise.resolve(routeCache[key]);

    var url = "https://api.openrouteservice.org/v2/directions/driving-car" +
              "?api_key=" + encodeURIComponent(CONFIG.orsApiKey) +
              "&start=" + from.lon + "," + from.lat +
              "&end=" + to.lon + "," + to.lat;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("ors " + r.status);
      return r.json();
    }).then(function (data) {
      var f = data.features && data.features[0];
      var summary = f && f.properties && f.properties.summary;
      var meters = summary && summary.distance;
      if (typeof meters !== "number") throw new Error("ors: keine Distanz");
      var km = meters / 1000;
      var hours = (summary && typeof summary.duration === "number")
        ? summary.duration / 3600
        : km / CONFIG.durchschnittstempoKmh;
      var result = { km: km, hours: hours, estimated: false };
      routeCache[key] = result;
      return result;
    }).catch(function () {
      // ORS-Fehlerantworten (z. B. 403) kommen ohne CORS-Header und landen
      // hier als generischer Fetch-Fehler – bewusst still auf Schätzung ausweichen.
      return fallback;
    });
  }

  // Aktueller Dieselpreis (Tankerkönig) mit localStorage-Cache.
  var FUEL_CACHE_KEY = "gaus_diesel_cache_v1";
  function getDieselPrice() {
    var fallback = { price: CONFIG.fallbackDieselPrice, isFallback: true, ts: Date.now() };
    if (!CONFIG.tankerkoenigApiKey) return Promise.resolve(fallback);

    try {
      var cached = JSON.parse(localStorage.getItem(FUEL_CACHE_KEY) || "null");
      if (cached && cached.price && (Date.now() - cached.ts) < CONFIG.fuelCacheMinutes * 60 * 1000) {
        return Promise.resolve({ price: cached.price, isFallback: false, ts: cached.ts });
      }
    } catch (e) { /* localStorage gesperrt – einfach frisch laden */ }

    var url = "https://creativecommons.tankerkoenig.de/json/list.php" +
              "?lat=" + CONFIG.depot.lat + "&lng=" + CONFIG.depot.lon +
              "&rad=" + CONFIG.fuelSearchRadiusKm + "&sort=price&type=diesel" +
              "&apikey=" + encodeURIComponent(CONFIG.tankerkoenigApiKey);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("tankerkoenig " + r.status);
      return r.json();
    }).then(function (data) {
      if (!data.ok || !data.stations) throw new Error("tankerkoenig: " + (data.message || "keine Daten"));
      var prices = data.stations.filter(function (s) { return s.isOpen && typeof s.price === "number"; })
                                .map(function (s) { return s.price; });
      if (!prices.length) throw new Error("tankerkoenig: keine offenen Tankstellen");
      var price = median(prices);
      try { localStorage.setItem(FUEL_CACHE_KEY, JSON.stringify({ price: price, ts: Date.now() })); } catch (e) {}
      return { price: price, isFallback: false, ts: Date.now() };
    }).catch(function () {
      return fallback;
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  AUTOCOMPLETE-KOMPONENTE
  // ══════════════════════════════════════════════════════════════════

  function attachAutocomplete(input, bias) {
    var state = { resolved: null, list: null, items: [], focusIndex: -1, abort: null };
    input._acState = state;

    function close() {
      if (state.abort) { state.abort.abort(); state.abort = null; }
      if (state.list) { state.list.remove(); state.list = null; }
      state.items = [];
      state.focusIndex = -1;
    }

    function select(place) {
      state.resolved = place;
      input.value = place.label;
      close();
      clearFieldError(input);
    }

    function render(places) {
      close();
      if (!places.length) return;
      var ul = document.createElement("ul");
      ul.className = "ac-list";
      places.forEach(function (place, i) {
        var li = document.createElement("li");
        li.className = "ac-item";
        var strong = document.createElement("span");
        strong.textContent = place.main;
        li.appendChild(strong);
        if (place.secondary) {
          var sec = document.createElement("span");
          sec.className = "ac-secondary";
          sec.textContent = place.secondary;
          li.appendChild(sec);
        }
        // mousedown statt click: feuert vor blur
        li.addEventListener("mousedown", function (ev) { ev.preventDefault(); select(place); });
        ul.appendChild(li);
      });
      input.parentElement.appendChild(ul);
      state.list = ul;
      state.items = places;
    }

    var search = debounce(function () {
      var q = input.value.trim();
      if (state.abort) { state.abort.abort(); state.abort = null; }
      // Nach einer Auswahl entspricht der Feldinhalt dem gewählten Label –
      // dann keine neue Suche, sonst öffnet sich das Dropdown gleich wieder.
      if (q.length < 3 || (state.resolved && state.resolved.label === q)) { close(); return; }
      state.abort = (typeof AbortController !== "undefined") ? new AbortController() : null;
      photonSearch(q, bias, state.abort ? state.abort.signal : undefined)
        .then(function (places) {
          // Verspätete Antwort verwerfen, wenn sich der Feldinhalt inzwischen geändert hat
          if (input.value.trim() !== q) return;
          render(places);
        })
        .catch(function () { /* Tippabbruch oder Netzfehler – kein Dropdown */ });
    }, 300);

    input.addEventListener("input", function () {
      state.resolved = null; // Nutzer hat weitergetippt => Auswahl verworfen
      search();
    });

    input.addEventListener("keydown", function (ev) {
      if (!state.list) return;
      var lis = state.list.children;
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        var dir = ev.key === "ArrowDown" ? 1 : -1;
        state.focusIndex = (state.focusIndex + dir + lis.length) % lis.length;
        for (var i = 0; i < lis.length; i++) lis[i].classList.toggle("is-focused", i === state.focusIndex);
      } else if (ev.key === "Enter") {
        if (state.focusIndex >= 0) {
          ev.preventDefault();
          select(state.items[state.focusIndex]);
        }
      } else if (ev.key === "Escape") {
        close();
      }
    });

    input.addEventListener("blur", function () {
      setTimeout(close, 150);
    });
  }

  // Adresse eines Feldes auflösen: gewählter Vorschlag oder Einmal-Geokodierung.
  function resolveAddress(input, bias) {
    var state = input._acState;
    if (state && state.resolved) return Promise.resolve(state.resolved);
    var q = input.value.trim();
    if (!q) return Promise.resolve(null);
    return geocodeQuery(q, bias).then(function (place) {
      // Störungsmarke ist keine Adresse – nicht merken, nicht zurückgeben.
      if (place && place.gestoert) return { gestoert: true };
      if (place && state) state.resolved = place;
      return place;
    });
  }

  // Ist das Ergebnis eine echte Adresse? Störungsmarken und "nicht gefunden"
  // müssen unterschiedlich behandelt werden.
  function istAdresse(p) { return !!(p && !p.gestoert && typeof p.lat === "number"); }
  function istStoerung(p) { return !!(p && p.gestoert); }

  // Einheitlicher Text für beide Fälle
  function adressFehlerText(p) {
    return istStoerung(p)
      ? "Die Adresssuche ist gerade gestört – das liegt nicht an Ihrer Eingabe. " +
        "Bitte in ein paar Minuten erneut versuchen oder uns direkt anschreiben."
      : "Adresse nicht gefunden – bitte Straße, PLZ und Ort angeben.";
  }

  // ══════════════════════════════════════════════════════════════════
  //  UI-HELFER
  // ══════════════════════════════════════════════════════════════════

  function fieldErrorEl(input) {
    var scope = input.closest(".field");
    return scope ? scope.querySelector(".field-error") : null;
  }

  var fieldErrorIdCounter = 0;

  function setFieldError(input, msg) {
    input.setAttribute("aria-invalid", "true");
    var el = fieldErrorEl(input);
    if (el) {
      if (!el.id) el.id = "field-error-" + (++fieldErrorIdCounter);
      input.setAttribute("aria-describedby", el.id);
      el.textContent = msg;
      el.hidden = false;
    }
  }

  function clearFieldError(input) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    var el = fieldErrorEl(input);
    if (el) { el.hidden = true; }
  }

  function clearFormErrors(form) {
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    form.querySelectorAll(".field-error, .form-error").forEach(function (el) { el.hidden = true; });
  }

  function showFormError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.hidden = false; }
  }

  // Nach einer fehlgeschlagenen Prüfung zum ersten beanstandeten Feld
  // springen. Ohne das steht die Sammelmeldung unten am Absendeknopf,
  // der Fehler aber möglicherweise mehrere Bildschirmhöhen weiter oben.
  function zumErstenFehler(form) {
    if (!form) return;
    var feld = form.querySelector('[aria-invalid="true"]');
    if (!feld) {
      var meldung = form.querySelector(".field-error:not([hidden])");
      feld = meldung ? meldung.previousElementSibling : null;
    }
    if (!feld) return;
    try { feld.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { feld.scrollIntoView(); }
    // Erst nach dem Scrollen fokussieren, sonst springt der Browser hart hin.
    setTimeout(function () { try { feld.focus({ preventScroll: true }); } catch (e) { feld.focus(); } }, 250);
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.querySelector(".btn-label").textContent = loading ? "Preis wird berechnet…" : "Preis berechnen";
    btn.querySelector(".btn-spinner").hidden = !loading;
  }

  function intValue(input) {
    var v = parseInt(input.value, 10);
    return isNaN(v) ? null : v;
  }

  function floatValue(input) {
    var v = parseFloat(String(input.value).replace(",", "."));
    return isNaN(v) ? null : v;
  }

  function validateInt(input, min, max, msg) {
    var v = intValue(input);
    if (v === null || v < min || v > max) { setFieldError(input, msg); return null; }
    clearFieldError(input);
    return v;
  }

  var WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4.1.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2 0-.1-.2-.2-.4-.3z"/></svg>';

  // Anfragen, die beim Klick auf den WhatsApp-Button gespeichert werden.
  // Zwischenlager, weil der Button als HTML-Text erzeugt wird.
  var offeneAnfragen = {};
  var anfrageZaehler = 0;

  // total (optional): Steht er drin, wird unter dem Knopf der Preisrahmen
  // genannt, mit dem die Anfrage rausgeht. Ohne diesen Hinweis würde der
  // Kunde auf dem Bildschirm eine andere Zahl sehen als in seiner Nachricht.
  function whatsappBlock(message, anfrage, total) {
    var number = CONFIG.whatsappNumber || "";
    if (!number || number.indexOf("X") !== -1) {
      return '<span class="btn-whatsapp is-disabled">' + WA_ICON + ' Per WhatsApp anfragen</span>' +
             '<p class="wa-hint">WhatsApp ist noch nicht eingerichtet – Nummer in app.js (CONFIG.whatsappNumber) eintragen.</p>';
    }
    var attr = "";
    if (anfrage) {
      var schluessel = "a" + (++anfrageZaehler);
      offeneAnfragen[schluessel] = anfrage;
      attr = ' data-anfrage="' + schluessel + '"';
    }
    var href = "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
    return '<a class="btn-whatsapp"' + attr + ' href="' + esc(href) + '" target="_blank" rel="noopener">' +
           WA_ICON + ' Per WhatsApp anfragen</a>' +
           '<p class="wa-hint">Öffnet WhatsApp mit Ihrer fertigen Anfrage – Sie können sie vor dem Senden noch prüfen.' +
           (typeof total === "number"
             ? ' Wir nennen darin einen <strong>Preisrahmen von ' + esc(spanneText(total)) + '</strong>: ' +
               'Der genaue Betrag steht fest, sobald wir kurz Rücksprache gehalten haben.'
             : '') +
           (anfrage ? ' Ihre Angaben werden dabei zur Bearbeitung der Anfrage gespeichert.' : '') +
           ' <a href="datenschutz.html">Datenschutz</a></p>';
  }

  // Beim Klick auf den WhatsApp-Button die Anfrage in der Datenbank ablegen,
  // damit sie im Adminbereich erscheint. Läuft absichtlich im Hintergrund:
  // Ein Fehler darf den Kunden niemals aufhalten oder eine Meldung erzeugen.
  function initAnfrageSpeicher() {
    document.addEventListener("click", function (ev) {
      var link = ev.target && ev.target.closest && ev.target.closest("a.btn-whatsapp[data-anfrage]");
      if (!link) return;
      var schluessel = link.getAttribute("data-anfrage");
      var row = offeneAnfragen[schluessel];
      link.removeAttribute("data-anfrage");   // nur ein einziges Mal speichern
      delete offeneAnfragen[schluessel];
      if (!row || !window.GausDB) return;
      try {
        window.GausDB.anfrageAnlegen(row).catch(function () { /* still */ });
      } catch (e) { /* still */ }
    });
  }

  // Baut den Datensatz für die Datenbank. "adresse2" ist bei Transporten die
  // Lieferadresse, beim Putzservice bleibt sie leer.
  function anfrageDatensatz(bereich, felder) {
    var a = felder.abholung || null;
    var b = felder.lieferung || null;
    return {
      bereich: bereich,
      status: "neu",
      name: felder.name || null,
      telefon: felder.telefon || null,
      wunschtermin: felder.termin || null,
      preis_eur: (typeof felder.preis === "number") ? felder.preis : null,
      abhol_label: a ? a.label : null,
      abhol_lat: a ? a.lat : null,
      abhol_lon: a ? a.lon : null,
      abhol_etage: a && typeof a.floors === "number" ? a.floors : null,
      abhol_aufzug: a ? !!a.elevator : null,
      liefer_label: b ? b.label : null,
      liefer_lat: b ? b.lat : null,
      liefer_lon: b ? b.lon : null,
      liefer_etage: b && typeof b.floors === "number" ? b.floors : null,
      liefer_aufzug: b ? !!b.elevator : null,
      volumen_m3: (typeof felder.volumen === "number") ? Math.round(felder.volumen * 1000) / 1000 : null,
      gewicht_kg: (typeof felder.gewicht === "number") ? Math.round(felder.gewicht * 10) / 10 : null,
      daten: felder.daten || {}
    };
  }

  function breakdownHtml(lines, total) {
    var html = '<ul class="breakdown">';
    lines.forEach(function (l) {
      html += '<li><span class="bd-label">' + esc(l.label) + '</span>' +
              '<span class="bd-amount">' + esc(l.amount) + '</span></li>';
    });
    html += '<li class="bd-total"><span class="bd-label">Gesamtpreis</span>' +
            '<span class="bd-amount">' + esc(total) + '</span></li></ul>';
    return html;
  }

  function badgesHtml(badges) {
    if (!badges.length) return "";
    return '<div class="badges">' + badges.map(function (b) {
      return '<span class="badge' + (b.warn ? " badge-warn" : "") + '">' + esc(b.text) + '</span>';
    }).join("") + '</div>';
  }

  function showResult(container, html, isError) {
    container.classList.toggle("result-error", !!isError);
    // Erst sichtbar machen, dann den Inhalt einsetzen – nur so kündigen
    // Screenreader die Live-Region (role="status") zuverlässig an.
    container.innerHTML = "";
    container.hidden = false;
    setTimeout(function () {
      container.innerHTML = html;
      container.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  }

  function legalNote() {
    return '<p class="result-note">Endpreis – gemäß § 19 UStG wird keine Umsatzsteuer berechnet. ' +
           'Preis gültig ' + CONFIG.priceValidityDays + ' Tage (Stand ' +
           new Date().toLocaleDateString("de-DE") + ').</p>';
  }

  // ══════════════════════════════════════════════════════════════════
  //  BEREICH 1: TRANSPORT NACH BERLIN
  // ══════════════════════════════════════════════════════════════════

  var itemCounter = 0;

  function addItemRow(prefix) {
    itemCounter++;
    var n = itemCounter;
    var container = document.getElementById(prefix + "-items");
    var row = document.createElement("div");
    row.className = "item-row";
    function itemField(key, labelText, min, max, step, mode, value) {
      var id = prefix + "-item-" + n + "-" + key;
      return '<div class="field"><label for="' + id + '">' + labelText + '</label>' +
             '<input type="number" id="' + id + '" inputmode="' + mode + '" min="' + min +
             '" max="' + max + '" step="' + step + '"' + (value ? ' value="' + value + '"' : '') +
             ' data-item="' + key + '"><p class="field-error" hidden></p></div>';
    }
    row.innerHTML =
      '<div class="item-head">' +
        '<span class="item-title"></span>' +
        '<button type="button" class="item-remove">Entfernen</button>' +
      '</div>' +
      '<div class="item-grid">' +
        itemField("length", "Länge (cm)", 1, 400, 1, "decimal", "") +
        itemField("width", "Breite (cm)", 1, 400, 1, "decimal", "") +
        itemField("height", "Höhe (cm)", 1, 400, 1, "decimal", "") +
        itemField("weight", "Gewicht (kg)", 0.1, 1000, 0.1, "decimal", "") +
        itemField("qty", "Anzahl", 1, 20, 1, "numeric", "1") +
      '</div>';
    row.querySelector(".item-remove").addEventListener("click", function () {
      row.remove();
      renumberItems(prefix);
    });
    container.appendChild(row);
    renumberItems(prefix);
  }

  function renumberItems(prefix) {
    var rows = document.querySelectorAll("#" + prefix + "-items .item-row");
    rows.forEach(function (row, i) {
      row.querySelector(".item-title").textContent = "Gegenstand " + (i + 1);
      row.querySelector(".item-remove").style.display = rows.length > 1 ? "" : "none";
    });
  }

  function collectItems(prefix) {
    var rows = document.querySelectorAll("#" + prefix + "-items .item-row");
    var items = [];
    var valid = true;
    rows.forEach(function (row) {
      var get = function (name) { return row.querySelector('[data-item="' + name + '"]'); };
      var fields = {
        length: { el: get("length"), min: 1, max: 400 },
        width:  { el: get("width"),  min: 1, max: 400 },
        height: { el: get("height"), min: 1, max: 400 },
        weight: { el: get("weight"), min: 0.1, max: 1000 },
        qty:    { el: get("qty"),    min: 1, max: 20 }
      };
      var vals = {};
      for (var name in fields) {
        var f = fields[name];
        var v = floatValue(f.el);
        if (v === null || v < f.min || v > f.max) {
          setFieldError(f.el, "Bitte Wert zwischen " + f.min + " und " + f.max + " angeben.");
          valid = false;
        } else if (name === "qty" && v % 1 !== 0) {
          setFieldError(f.el, "Bitte ganze Anzahl 1–20 angeben.");
          valid = false;
        } else {
          clearFieldError(f.el);
          vals[name] = v;
        }
      }
      if (valid && vals.length !== undefined) {
        items.push({
          lengthCm: vals.length, widthCm: vals.width, heightCm: vals.height,
          weightKg: vals.weight, qty: vals.qty
        });
      }
    });
    return valid ? items : null;
  }

  function transportWaMessage(data, result, flags, richtung) {
    var r = richtung || RICHTUNGEN.hin;
    var lines = [];
    lines.push("Anfrage Beiladung " + (r.id === "rueck" ? "Berlin → Stuttgart" : "Stuttgart → Berlin"));
    if (data.name) lines.push("Name: " + data.name);
    lines.push("──────────────");
    lines.push("Abholung: " + data.pickup.label + ", Etage " + data.pickup.floors +
               (data.pickup.elevator ? " (Aufzug)" : ""));
    lines.push("Lieferung: " + data.delivery.label + ", Etage " + data.delivery.floors +
               (data.delivery.elevator ? " (Aufzug)" : ""));
    lines.push("Gegenstände:");
    data.items.forEach(function (it) {
      lines.push("• " + it.qty + "× " + it.lengthCm + "×" + it.widthCm + "×" + it.heightCm +
                 " cm, " + fmtNum(it.weightKg, it.weightKg % 1 ? 1 : 0) + " kg");
    });
    if (result && result.ok) {
      lines.push("Gesamt: " + fmtNum(result.volumeM3, 2) + " m³ / " + fmtNum(result.weightKg, 0) + " kg");
    }
    var wo = [];
    if (data.traegerAbholung) wo.push("beim Abholen");
    if (data.traegerLieferung) wo.push("beim Liefern");
    lines.push("Zweiter Träger: " + (wo.length
      ? (data.customerHelps ? "Ja (" + wo.join(" und ") + ") – ich helfe selbst mit"
                            : "Ja – " + wo.join(" und "))
      : "Nein"));
    if (data.date) lines.push("Wunschtermin: " + fmtDateDe(data.date));
    lines.push("──────────────");
    if (result && result.ok) {
      lines.push("Strecke: " + fmtKm(result.chargeableKm) + " (" +
                 (result.model === "abholfahrt" ? "Abholfahrt" : "Umweg") + ")");
      lines.push("Fahrt: " + fmtEur(result.fahrtCost) +
                 " | Verladen: " + fmtEur(result.handlingCost) +
                 " | Etagen: " + fmtEur(result.floorCost) +
                 " | Schwergut: " + fmtEur(result.heavyCost) +
                 " | Beifahrer: " + fmtEur(result.helperCost));
      lines.push("PREISRAHMEN: " + spanneText(result.total));
      lines.push("(Diesel " + fmtNum(result.dieselPricePerL, 2) + " €/l, Stand " +
                 new Date().toLocaleDateString("de-DE") + ", gültig " + CONFIG.priceValidityDays +
                 " Tage" + (flags.estimated ? ", Entfernung geschätzt" : "") + ")");
    } else if (result && result.reason === "volume") {
      lines.push("Über " + CONFIG.vanVolumeM3 + " m³ – bitte um individuelles Angebot.");
    } else if (result && result.reason === "heavy") {
      lines.push("Einzelstück ab " + CONFIG.maxEinzelstueckKg + " kg – bitte um individuelles Angebot.");
    } else if (result && result.reason === "oversize") {
      lines.push("Übergröße – bitte um individuelles Angebot.");
    } else if (flags.farDelivery) {
      lines.push("Lieferadresse außerhalb Berlin – bitte um individuelles Angebot.");
    }
    return lines.join("\n");
  }

  // Baut einen Beiladungs-Rechner auf. prefix ist das Kürzel der Feld-IDs
  // ("t" für Stuttgart → Berlin, "r" für die Rückladung Berlin → Stuttgart),
  // richtung enthält Start und Ziel. Die Rechenformel ist für beide identisch.
  function initBeiladung(prefix, richtung) {
    var form = document.getElementById("form-" + prefix);
    if (!form) return;
    var resultEl = document.getElementById(prefix + "-result");
    var pickupInput = document.getElementById(prefix + "-pickup-address");
    var deliveryInput = document.getElementById(prefix + "-delivery-address");

    attachAutocomplete(pickupInput, richtung.start);
    attachAutocomplete(deliveryInput, richtung.ziel);

    addItemRow(prefix);
    document.getElementById(prefix + "-add-item").addEventListener("click", function () {
      addItemRow(prefix);
    });

    // Die Träger-Details ("wo wird getragen?" und "ich helfe selbst mit")
    // nur zeigen, wenn ein Träger benötigt wird. Auch initial und bei
    // pageshow synchronisieren – Browser wie Firefox stellen Formularwerte
    // nach einem Reload ohne change-Event wieder her.
    var helperDetails = document.getElementById(prefix + "-helper-details");
    function syncSelfHelp() {
      var checked = form.querySelector('input[name="' + prefix + '-helper"]:checked');
      helperDetails.hidden = !checked || checked.value !== "ja";
    }
    form.querySelectorAll('input[name="' + prefix + '-helper"]').forEach(function (r) {
      r.addEventListener("change", syncSelfHelp);
    });
    syncSelfHelp();
    window.addEventListener("pageshow", syncSelfHelp);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearFormErrors(form);
      resultEl.hidden = true;

      var pickupFloor = validateInt(document.getElementById(prefix + "-pickup-floor"), 0, 10, "Bitte Etage 0–10 angeben.");
      var deliveryFloor = validateInt(document.getElementById(prefix + "-delivery-floor"), 0, 10, "Bitte Etage 0–10 angeben.");
      var items = collectItems(prefix);
      if (items !== null && items.length === 0) {
        showFormError(prefix + "-items-error", "Bitte mindestens einen Gegenstand angeben.");
        items = null;
      }

      var dateInput = document.getElementById(prefix + "-date");
      var date = dateInput.value || "";
      if (date) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(date + "T00:00:00") < today) {
          setFieldError(dateInput, "Der Wunschtermin liegt in der Vergangenheit.");
          date = null;
        }
      }

      if (!pickupInput.value.trim()) setFieldError(pickupInput, "Bitte Abholadresse angeben.");
      if (!deliveryInput.value.trim()) setFieldError(deliveryInput, "Bitte Lieferadresse angeben.");

      // Wenn ein Träger gewünscht ist, muss auch stehen, wo er anpacken soll.
      var willTraeger = form.querySelector('input[name="' + prefix + '-helper"]:checked').value === "ja";
      var traegerAb = willTraeger && document.getElementById(prefix + "-helper-pickup").checked;
      var traegerLief = willTraeger && document.getElementById(prefix + "-helper-delivery").checked;
      var traegerFehlt = willTraeger && !traegerAb && !traegerLief;
      if (traegerFehlt) {
        showFormError(prefix + "-helper-error",
          "Bitte ankreuzen, wo ein Träger gebraucht wird – beim Abholen, beim Liefern oder bei beidem.");
      }

      if (pickupFloor === null || deliveryFloor === null || items === null || date === null ||
          traegerFehlt || !pickupInput.value.trim() || !deliveryInput.value.trim()) {
        showFormError(prefix + "-form-error", "Bitte prüfen Sie die rot markierten Felder.");
        zumErstenFehler(form);
        return;
      }

      var btn = document.getElementById(prefix + "-submit");
      setLoading(btn, true);

      Promise.all([
        resolveAddress(pickupInput, richtung.start),
        resolveAddress(deliveryInput, richtung.ziel)
      ]).then(function (places) {
        var pickup = places[0], delivery = places[1];
        if (!istAdresse(pickup)) setFieldError(pickupInput, adressFehlerText(pickup));
        if (!istAdresse(delivery)) setFieldError(deliveryInput, adressFehlerText(delivery));
        if (!istAdresse(pickup) || !istAdresse(delivery)) { zumErstenFehler(form); throw { handled: true }; }

        var data = {
          pickup: { lat: pickup.lat, lon: pickup.lon, label: pickup.label,
                    floors: pickupFloor, elevator: document.getElementById(prefix + "-pickup-elevator").checked },
          delivery: { lat: delivery.lat, lon: delivery.lon, label: delivery.label,
                      floors: deliveryFloor, elevator: document.getElementById(prefix + "-delivery-elevator").checked },
          items: items,
          helperNeeded: willTraeger,
          traegerAbholung: traegerAb,
          traegerLieferung: traegerLief,
          customerHelps: document.getElementById(prefix + "-self-help").checked,
          date: date,
          name: document.getElementById(prefix + "-name").value.trim(),
          phone: document.getElementById(prefix + "-phone").value.trim()
        };

        // Datensatz für den Adminbereich – "result" kommt später dazu.
        function anfrageFuer(result, hinweis) {
          return anfrageDatensatz(richtung.id === "rueck" ? "beiladung_rueck" : "beiladung_hin", {
            name: data.name, telefon: data.phone, termin: data.date,
            preis: result && result.ok ? result.total : null,
            abholung: data.pickup, lieferung: data.delivery,
            volumen: result ? result.volumeM3 : null,
            gewicht: result ? result.weightKg : null,
            daten: {
              richtung: richtung.id,
              gegenstaende: data.items,
              traegerGewuenscht: data.helperNeeded,
              traegerAbholung: data.traegerAbholung,
              traegerLieferung: data.traegerLieferung,
              kundeHilftMit: data.customerHelps,
              modell: result ? result.model : null,
              abrechnungKm: result ? result.chargeableKm : null,
              volumenAnteil: result ? result.volumeShare : null,
              mitfahrtKm: result ? result.mitfahrtKm : null,
              blockierteKm: result ? result.blockierteKm : null,
              hinweis: hinweis || null
            }
          });
        }

        // Lieferziel-Plausibilität: Sofort-Preis gibt es für das Zielgebiet
        // UND für alles, was unterwegs auf der Route liegt (z. B. Nürnberg,
        // Leipzig) – dort steigt die Ladung einfach früher aus.
        if (!lieferzielErlaubt(data.delivery, richtung)) {
          var waFar = transportWaMessage(data, null, { farDelivery: true, estimated: false }, richtung);
          showResult(resultEl,
            '<h3 class="result-title">Bitte individuell anfragen</h3>' +
            '<p class="result-error-msg">Diese Lieferadresse liegt weder in ' + richtung.zielName +
            ' und Umgebung noch auf unserer Route dorthin. Unser Sofort-Preis gilt für Lieferungen ' +
            'nach ' + richtung.zielName + ' (+' + CONFIG.deliveryMaxKmFromBerlin +
            ' km) und für alles, was unterwegs auf der Strecke liegt. ' +
            'Gerne machen wir Ihnen ein individuelles Angebot!</p>' +
            whatsappBlock(waFar, anfrageFuer(null, "Lieferadresse außerhalb von Ziel und Route")), true);
          return;
        }

        return Promise.all([
          routeKm(richtung.start, data.pickup),
          routeKm(data.pickup, data.delivery),
          routeKm(richtung.start, data.delivery),
          routeKm(richtung.start, richtung.ziel),   // Hauptlauf – für den Stellplatz-Zuschlag
          getDieselPrice()
        ]).then(function (r) {
          var estimated = r[0].estimated || r[1].estimated || r[2].estimated;
          var fuel = r[4];
          var result = calculateBerlinPrice({
            items: data.items,
            legs: { depotToPickup: r[0], pickupToDelivery: r[1], depotToDelivery: r[2],
                    startToZiel: r[3] },
            pickup: data.pickup,
            delivery: data.delivery,
            helperNeeded: data.helperNeeded,
            traegerAbholung: data.traegerAbholung,
            traegerLieferung: data.traegerLieferung,
            customerHelps: data.customerHelps,
            dieselPricePerL: fuel.price,
            richtung: richtung
          });

          if (!result.ok) {
            var msg;
            if (result.reason === "volume") {
              msg = "Ihre Sendung ist größer als " + CONFIG.vanVolumeM3 + " m³ und passt leider nicht als Beiladung " +
                    "in unseren Transporter. Gerne machen wir Ihnen ein individuelles Angebot!";
            } else if (result.reason === "weight") {
              msg = "Ihre Sendung wiegt zusammen " + fmtNum(result.weightKg, 0) + " kg und liegt damit " +
                    "über der Zuladung unseres Transporters (" + CONFIG.maxZuladungKg + " kg). " +
                    "Das lässt sich meist auf zwei Fahrten aufteilen – fragen Sie uns einfach an, " +
                    "wir finden eine Lösung!";
            } else if (result.reason === "heavy") {
              msg = "Ein Gegenstand wiegt " + CONFIG.maxEinzelstueckKg + " kg oder mehr. Solche Schwertransporte " +
                    "planen wir persönlich mit Ihnen – so stellen wir sicher, dass genug Helfer und die richtige " +
                    "Ausrüstung dabei sind. Fragen Sie uns einfach an!";
            } else {
              msg = "Ein Gegenstand überschreitet unsere maximalen Einzelmaße (" +
                    CONFIG.maxItemDimCm.l + " × " + CONFIG.maxItemDimCm.w + " × " + CONFIG.maxItemDimCm.h +
                    " cm). Gerne prüfen wir das individuell!";
            }
            var waBig = transportWaMessage(data, result, { estimated: estimated }, richtung);
            showResult(resultEl,
              '<h3 class="result-title">Bitte individuell anfragen</h3>' +
              '<p class="result-error-msg">' + esc(msg) + '</p>' +
              whatsappBlock(waBig, anfrageFuer(result, "Kein Online-Preis: " + result.reason)), true);
            return;
          }

          var lines = [
            { label: "Fahrt (" + fmtKm(result.chargeableKm) + ", Ihr Anteil " +
                     fmtNum(result.volumeShare * 100, 1) + " %)",
              amount: fmtEur(result.fahrtCost) },
            { label: "Be- & Entladen (ca. " + Math.round(result.handlingMinutes) + " Min.)",
              amount: fmtEur(result.handlingCost) }
          ];
          if (result.platzCost > 0.005) {
            lines.push({ label: "Stellplatz (Ladefläche bleibt für " + fmtKm(result.blockierteKm) +
                                " belegt)", amount: fmtEur(result.platzCost) });
          }
          lines = lines.concat([
            { label: "Etagenzuschlag (Tragen über Treppen)", amount: fmtEur(result.floorCost) },
            { label: "Schwere Gegenstände (" + fmtNum(result.weightKg, 0) + " kg gesamt)",
              amount: fmtEur(result.heavyCost) },
            { label: "Beifahrer / zweiter Träger" +
                     (result.traegerStopps === 1
                       ? " (nur " + (result.traegerAbholung ? "beim Abholen" : "beim Liefern") + ")"
                       : ""),
              amount: fmtEur(result.helperCost) }
          ]);
          if (result.minApplied) {
            lines.push({ label: "Mindestauftragswert", amount: fmtEur(Math.max(0, CONFIG.minPriceEur - result.subtotal)) });
          }

          var badges = [
            { text: result.model === "abholfahrt" ? "Abholfahrt-Modell" : "Umweg-Modell (liegt auf unserer Route)" }
          ];
          if (result.blockierteKm > 1) {
            badges.push({ text: "Teilstrecke: " + fmtKm(result.mitfahrtKm) + " von " +
                                fmtKm(result.mitfahrtKm + result.blockierteKm) });
          }
          badges = badges.concat([
            { text: result.volumeShare >= 1
                ? "Ladung: " + fmtNum(result.volumeM3, 2) + " m³ – voller Fahrtpreis"
                : "Ladung: " + fmtNum(result.volumeM3, 2) + " m³ (voller Fahrtpreis ab " +
                  fmtNum(CONFIG.vollpreisAbM3, 1) + " m³)" }
          ]);
          badges.push(fuel.isFallback
            ? { text: "Diesel: Standardwert " + fmtNum(fuel.price, 2) + " €/l", warn: true }
            : { text: "Diesel: " + fmtNum(fuel.price, 2) + " €/l (aktuell)" });
          if (estimated) badges.push({ text: "Entfernung geschätzt (Luftlinie)", warn: true });

          var wa = transportWaMessage(data, result, { estimated: estimated }, richtung);
          showResult(resultEl,
            '<h3 class="result-title">Ihr Preis: ' + fmtEur0(result.total) + '</h3>' +
            '<p class="result-sub">Beiladung ' + esc(pickup.label) + ' → ' + esc(delivery.label) + '</p>' +
            badgesHtml(badges) +
            breakdownHtml(lines, fmtEur0(result.total)) +
            whatsappBlock(wa, anfrageFuer(result, null), result.total) +
            legalNote(), false);
        });
      }).catch(function (err) {
        if (!err || !err.handled) {
          showFormError(prefix + "-form-error", "Die Berechnung ist fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
        }
      }).then(function () {
        setLoading(btn, false);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  BEREICH 2: SONDERFAHRT
  // ══════════════════════════════════════════════════════════════════

  function sonderfahrtWaMessage(data, result, flags) {
    var lines = [];
    lines.push("Anfrage Sonderfahrt ab Stuttgart");
    if (data.name) lines.push("Name: " + data.name);
    lines.push("──────────────");
    lines.push("Abholung: " + data.pickup.label +
               (data.pickupFloor !== null ? " (Etage " + data.pickupFloor + ")" : ""));
    lines.push("Ziel: " + data.dest.label +
               (data.destFloor !== null ? " (Etage " + data.destFloor + ")" : ""));
    lines.push("Termin: " + fmtDateDe(data.date) + ", " + data.time + " Uhr");
    lines.push("Ladung: " + data.desc);
    lines.push("Beifahrer benötigt: " + (data.helperNeeded ? "Ja" : "Nein"));
    lines.push("──────────────");
    lines.push("Strecke gesamt: " + fmtKm(result.totalKm) + " (inkl. Rückfahrt), ca. " +
               fmtNum(result.totalHours, 1) + " Std.");
    lines.push("Fahrzeug: " + fmtEur(result.vehicleCost) +
               " | Fahrer: " + fmtEur(result.driverCost) +
               (result.helperCost > 0 ? " | Beifahrer: " + fmtEur(result.helperCost) : ""));
    lines.push("PREISRAHMEN: " + spanneText(result.total) +
               (result.minApplied ? " (Mindestpreis)" : ""));
    if (flags.estimated) lines.push("(Entfernung geschätzt)");
    return lines.join("\n");
  }

  function initSonderfahrt() {
    var form = document.getElementById("form-sonderfahrt");
    if (!form) return;
    var resultEl = document.getElementById("s-result");
    var pickupInput = document.getElementById("s-pickup-address");
    var destInput = document.getElementById("s-dest-address");

    attachAutocomplete(pickupInput, CONFIG.depot);
    attachAutocomplete(destInput, CONFIG.depot);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearFormErrors(form);
      resultEl.hidden = true;

      var ok = true;
      if (!pickupInput.value.trim()) { setFieldError(pickupInput, "Bitte Abholadresse angeben."); ok = false; }
      if (!destInput.value.trim()) { setFieldError(destInput, "Bitte Zieladresse angeben."); ok = false; }

      var dateInput = document.getElementById("s-date");
      var timeInput = document.getElementById("s-time");
      var descInput = document.getElementById("s-desc");
      if (!dateInput.value) { setFieldError(dateInput, "Bitte Datum wählen."); ok = false; }
      else {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(dateInput.value + "T00:00:00") < today) {
          setFieldError(dateInput, "Das Datum liegt in der Vergangenheit."); ok = false;
        }
      }
      if (!timeInput.value) { setFieldError(timeInput, "Bitte Uhrzeit wählen."); ok = false; }
      if (!descInput.value.trim()) { setFieldError(descInput, "Bitte beschreiben Sie kurz die Ladung."); ok = false; }

      if (!ok) {
        showFormError("s-form-error", "Bitte prüfen Sie die rot markierten Felder.");
        zumErstenFehler(form);
        return;
      }

      var btn = document.getElementById("s-submit");
      setLoading(btn, true);

      Promise.all([
        resolveAddress(pickupInput, CONFIG.depot),
        resolveAddress(destInput, CONFIG.depot)
      ]).then(function (places) {
        var pickup = places[0], dest = places[1];
        if (!istAdresse(pickup)) setFieldError(pickupInput, adressFehlerText(pickup));
        if (!istAdresse(dest)) setFieldError(destInput, adressFehlerText(dest));
        if (!istAdresse(pickup) || !istAdresse(dest)) { zumErstenFehler(form); throw { handled: true }; }

        var data = {
          pickup: pickup,
          dest: dest,
          date: dateInput.value,
          time: timeInput.value,
          desc: descInput.value.trim(),
          helperNeeded: document.getElementById("s-helper").checked,
          pickupFloor: intValue(document.getElementById("s-pickup-floor")),
          destFloor: intValue(document.getElementById("s-dest-floor")),
          name: document.getElementById("s-name").value.trim(),
          phone: document.getElementById("s-phone").value.trim()
        };

        return Promise.all([
          routeKm(CONFIG.depot, pickup),
          routeKm(pickup, dest),
          routeKm(dest, CONFIG.depot),
          getDieselPrice()
        ]).then(function (r) {
          var estimated = r[0].estimated || r[1].estimated || r[2].estimated;
          var fuel = r[3];
          var result = calculateSonderfahrtPrice({
            legs: { depotToPickup: r[0], pickupToDest: r[1], destToDepot: r[2] },
            helperNeeded: data.helperNeeded,
            dieselPricePerL: fuel.price
          });

          var lines = [
            { label: "Fahrzeug (" + fmtKm(result.totalKm) + " inkl. Rückfahrt zum Standort)",
              amount: fmtEur(result.vehicleCost) },
            { label: "Fahrer (ca. " + fmtNum(result.totalHours, 1) + " Std. inkl. Be-/Entladen)",
              amount: fmtEur(result.driverCost) }
          ];
          if (result.helperCost > 0) {
            lines.push({ label: "Beifahrer (ca. " + fmtNum(result.totalHours, 1) + " Std.)",
                         amount: fmtEur(result.helperCost) });
          }
          if (result.minApplied) {
            lines.push({ label: "Mindestpreis Sonderfahrt", amount: fmtEur(Math.max(0, CONFIG.sonderfahrtMinPriceEur - result.subtotal)) });
          }

          var badges = [
            { text: "Exklusiver Transporter" },
            { text: "Preis nach Strecke und Zeit" }
          ];
          badges.push(fuel.isFallback
            ? { text: "Diesel: Standardwert " + fmtNum(fuel.price, 2) + " €/l", warn: true }
            : { text: "Diesel: " + fmtNum(fuel.price, 2) + " €/l (aktuell)" });
          if (estimated) badges.push({ text: "Entfernung geschätzt (Luftlinie)", warn: true });

          var wa = sonderfahrtWaMessage(data, result, { estimated: estimated });
          var anfrage = anfrageDatensatz("sonderfahrt", {
            name: data.name, telefon: data.phone, termin: data.date, preis: result.total,
            abholung: { label: pickup.label, lat: pickup.lat, lon: pickup.lon, floors: data.pickupFloor },
            lieferung: { label: dest.label, lat: dest.lat, lon: dest.lon, floors: data.destFloor },
            daten: {
              uhrzeit: data.time,
              ladung: data.desc,
              traegerGewuenscht: data.helperNeeded,
              gesamtKm: result.totalKm,
              gesamtStunden: result.totalHours
            }
          });
          showResult(resultEl,
            '<h3 class="result-title">Ihr Preis: ' + fmtEur0(result.total) + '</h3>' +
            '<p class="result-sub">Sonderfahrt ' + esc(pickup.label) + ' → ' + esc(dest.label) + '</p>' +
            badgesHtml(badges) +
            breakdownHtml(lines, fmtEur0(result.total)) +
            whatsappBlock(wa, anfrage, result.total) +
            legalNote(), false);
        });
      }).catch(function (err) {
        if (!err || !err.handled) {
          showFormError("s-form-error", "Die Berechnung ist fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
        }
      }).then(function () {
        setLoading(btn, false);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  BEREICH 3: PUTZSERVICE
  // ══════════════════════════════════════════════════════════════════

  function cleaningWaMessage(data, result, outOfArea) {
    var lines = [];
    lines.push("Anfrage Putzservice Stuttgart");
    if (data.name) lines.push("Name: " + data.name);
    lines.push("──────────────");
    lines.push("Leistung: " + data.service);
    lines.push("Adresse: " + data.address.label);
    lines.push("Umfang: " + data.hours + " Std. × " + data.staff + " Kraft/Kräfte");
    if (data.date) lines.push("Wunschtermin: " + fmtDateDe(data.date));
    lines.push("──────────────");
    if (outOfArea) {
      lines.push("Adresse außerhalb des Einsatzgebiets – bitte um individuelles Angebot.");
    } else {
      lines.push("Arbeitszeit: " + result.billedHours + " Std. × " + result.staff + " × " +
                 fmtEur0(CONFIG.cleaningHourlyRateEur) + " = " + fmtEur(result.labor));
      lines.push("Anfahrt: " + fmtEur(result.travelFee));
      lines.push("PREISRAHMEN: " + spanneText(result.total));
    }
    return lines.join("\n");
  }

  function initPutzservice() {
    var form = document.getElementById("form-putzservice");
    if (!form) return;
    var resultEl = document.getElementById("p-result");
    var addressInput = document.getElementById("p-address");
    var serviceSelect = document.getElementById("p-service");

    CONFIG.cleaningServices.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      serviceSelect.appendChild(opt);
    });

    attachAutocomplete(addressInput, CONFIG.cleaningAreaCenter);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearFormErrors(form);
      resultEl.hidden = true;

      var hours = validateInt(document.getElementById("p-hours"), 1, 12, "Bitte 1–12 Stunden angeben.");
      var staff = validateInt(document.getElementById("p-staff"), 1, 4, "Bitte 1–4 Kräfte angeben.");
      var ok = hours !== null && staff !== null;

      if (!addressInput.value.trim()) { setFieldError(addressInput, "Bitte Adresse oder PLZ/Ort angeben."); ok = false; }

      var dateInput = document.getElementById("p-date");
      var date = dateInput.value || "";
      if (date) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(date + "T00:00:00") < today) {
          setFieldError(dateInput, "Der Wunschtermin liegt in der Vergangenheit."); ok = false;
        }
      }

      if (!ok) {
        showFormError("p-form-error", "Bitte prüfen Sie die rot markierten Felder.");
        zumErstenFehler(form);
        return;
      }

      var btn = document.getElementById("p-submit");
      setLoading(btn, true);

      resolveAddress(addressInput, CONFIG.cleaningAreaCenter).then(function (place) {
        if (!istAdresse(place)) {
          setFieldError(addressInput, adressFehlerText(place));
          zumErstenFehler(form);
          throw { handled: true };
        }

        var data = {
          service: serviceSelect.value,
          address: place,
          hours: hours,
          staff: staff,
          date: date,
          name: document.getElementById("p-name").value.trim(),
          phone: document.getElementById("p-phone").value.trim()
        };

        function putzAnfrage(result, hinweis) {
          return anfrageDatensatz("putzservice", {
            name: data.name, telefon: data.phone, termin: data.date,
            preis: result && result.ok ? result.total : null,
            abholung: { label: place.label, lat: place.lat, lon: place.lon },
            daten: {
              leistung: data.service,
              stunden: data.hours,
              kraefte: data.staff,
              anfahrtEur: result ? result.travelFee : null,
              hinweis: hinweis || null
            }
          });
        }

        var areaKm = haversineKm(place, CONFIG.cleaningAreaCenter);
        var travelKm = haversineKm(CONFIG.cleaningBase, place) * CONFIG.roadFactor;
        var result = calculateCleaningPrice({ hours: hours, staff: staff, travelKm: travelKm, areaKm: areaKm });

        if (!result.ok) {
          var waOut = cleaningWaMessage(data, null, true);
          showResult(resultEl,
            '<h3 class="result-title">Bitte individuell anfragen</h3>' +
            '<p class="result-error-msg">Diese Adresse liegt außerhalb unseres Einsatzgebiets ' +
            '(Stuttgart + ' + CONFIG.cleaningRadiusKm + ' km). Fragen Sie gerne trotzdem an – ' +
            'vielleicht finden wir eine Lösung!</p>' +
            whatsappBlock(waOut, putzAnfrage(null, "Außerhalb des Einsatzgebiets")), true);
          return;
        }

        var lines = [
          { label: "Arbeitszeit (" + result.billedHours + " Std. × " + result.staff +
                   (result.staff > 1 ? " Kräfte" : " Kraft") + " × " + fmtEur0(CONFIG.cleaningHourlyRateEur) + ")",
            amount: fmtEur(result.labor) },
          { label: "Anfahrt (ab " + CONFIG.cleaningBase.label + ")", amount: fmtEur(result.travelFee) }
        ];

        var badges = [{ text: data.service }];
        if (result.hoursRaised) {
          badges.push({ text: "Auf Mindestbuchung " + CONFIG.cleaningMinHours + " Std. angehoben", warn: true });
        }

        var wa = cleaningWaMessage(data, result, false);
        showResult(resultEl,
          '<h3 class="result-title">Ihr Preis: ' + fmtEur0(result.total) + '</h3>' +
          '<p class="result-sub">' + esc(data.service) + ' – ' + esc(place.label) + '</p>' +
          badgesHtml(badges) +
          breakdownHtml(lines, fmtEur0(result.total)) +
          whatsappBlock(wa, putzAnfrage(result, null), result.total) +
          legalNote(), false);
      }).catch(function (err) {
        if (!err || !err.handled) {
          showFormError("p-form-error", "Die Berechnung ist fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
        }
      }).then(function () {
        setLoading(btn, false);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  NAVIGATION, KONFIG-PLATZHALTER, START
  // ══════════════════════════════════════════════════════════════════

  function initTabs() {
    var tabs = document.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var id = tab.getAttribute("data-tab");
        tabs.forEach(function (t) { t.classList.toggle("is-active", t === tab); });
        document.querySelectorAll(".panel").forEach(function (p) {
          p.classList.toggle("is-active", p.id === id);
        });
        if (history.replaceState) history.replaceState(null, "", "#" + id);
      });
    });
    var hash = location.hash.replace("#", "");
    if (hash) {
      var target = document.querySelector('.tab[data-tab="' + hash + '"]');
      if (target) target.click();
    }
  }

  function fillConfigPlaceholders() {
    var tiers = CONFIG.cleaningTravelTiers;
    var fees = tiers.map(function (t) { return t.feeEur; });
    var values = {
      cleaningRate: String(CONFIG.cleaningHourlyRateEur),
      cleaningMinHours: String(CONFIG.cleaningMinHours),
      cleaningTravelRange: Math.min.apply(null, fees) + "–" + Math.max.apply(null, fees),
      priceValidityDays: String(CONFIG.priceValidityDays)
    };
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var key = el.getAttribute("data-config");
      if (values[key] !== undefined) el.textContent = values[key];
    });
  }

  // Vergangene Tage schon im Auswahldialog sperren, statt sie erst beim
  // Absenden zu beanstanden.
  function initDatumsgrenzen() {
    var d = new Date();
    var heute = d.getFullYear() + "-" +
                ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
                ("0" + d.getDate()).slice(-2);
    document.querySelectorAll('input[type="date"]').forEach(function (el) {
      if (!el.getAttribute("min")) el.setAttribute("min", heute);
    });
  }

  // Telefonnummer aus der WhatsApp-Nummer ableiten, damit sie nur an einer
  // Stelle gepflegt werden muss (CONFIG.whatsappNumber).
  function initTelefon() {
    var nummer = String(CONFIG.whatsappNumber || "");
    if (!nummer || nummer.indexOf("X") !== -1) return;
    var lesbar = nummer.replace(/^49/, "+49 ").replace(/^(\+49 )(\d{3})(\d+)$/, "$1$2 $3");
    document.querySelectorAll("[data-telefon]").forEach(function (el) {
      el.setAttribute("href", "tel:+" + nummer);
      if (el.hasAttribute("data-telefon-text")) el.textContent = lesbar;
    });
  }

  function initImpressum() {
    var link = document.getElementById("impressum-link");
    var box = document.getElementById("impressum");
    if (link && box) {
      link.addEventListener("click", function (ev) {
        ev.preventDefault();
        box.hidden = !box.hidden;
      });
    }
  }

  // Rechenkern nach außen sichtbar machen – für eigene Auswertungen und
  // Preisbeispiele (z. B. in der Browser-Konsole). Ändert nichts an der Seite.
  window.GausPreis = {
    berlin: calculateBerlinPrice,
    sonderfahrt: calculateSonderfahrtPrice,
    putzservice: calculateCleaningPrice,
    strecke: routeKm,
    dieselpreis: getDieselPrice,
    kostenProKm: vehicleCostPerKm,
    etagenzuschlag: floorSurchargeEur,
    schwergutzuschlag: heavyItemSurchargeEur,
    modellwahl: chooseKmModel,
    lieferzielErlaubt: lieferzielErlaubt,
    mengenrabatt: mitMengenrabatt,
    luftlinie: haversineKm,
    // Bausteine, die der Adminbereich (admin.js) mitbenutzt
    hilfen: {
      esc: esc,
      fmtEur: fmtEur,
      fmtEur0: fmtEur0,
      fmtKm: fmtKm,
      fmtNum: fmtNum,
      fmtDateDe: fmtDateDe,
      autocomplete: attachAutocomplete,
      geocode: geocodeQuery,
      ladezeitStunden: handlingHours
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    fillConfigPlaceholders();
    initTabs();
    initAnfrageSpeicher();
    initBeiladung("t", RICHTUNGEN.hin);
    initBeiladung("r", RICHTUNGEN.rueck);
    initSonderfahrt();
    initPutzservice();
    initImpressum();
    initDatumsgrenzen();
    initTelefon();
    if (/[?&]test=1/.test(location.search)) runSelfTests();
  });

})();
