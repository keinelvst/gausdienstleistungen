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
  // Branchenüblich sind 10–15 % (Kalkulations-Empfehlung: 12).
  gewinnaufschlagProzent: 0,

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
  ladezeitProStoppMin: 30,       // Grundzeit Be-/Entladen je Stopp (Kurier-Branchenstandard)
  minutenJeEtageJeBlock: 3,      // Tragezeit je Etage je angefangene 50 kg (Minuten)
  minutenJeSchwerBlock: 5,       // Zusatzzeit je weitere angefangene 50 kg über den ersten Block

  // ── Transport nach Berlin (Beiladung) ──────────────────────────────
  pickupRadiusKm: 30,            // Abholung ≤ dieser Umkreis um das Depot => Abholfahrt-Modell
  deliveryMaxKmFromBerlin: 50,   // Lieferadresse weiter von Berlin entfernt => "bitte anfragen"
  vanVolumeM3: 10,               // Ladevolumen des Transporters in m³ ("volles Auto")
  itemMarginCm: 3,               // Sicherheitsmarge je Maß (Länge, Breite, Höhe) in cm
  maxItemDimCm: { l: 300, w: 160, h: 170 }, // größtes Einzelteil (inkl. Marge) => sonst "anfragen"
  weightBlockKg: 50,             // Blockgröße für alle gewichtsabhängigen Tragezeiten
  elevatorFactor: 0.05,          // Aufzug vorhanden (und passt) => nur 5 % der Etagen-Tragezeit
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

  // Modellwahl: Abholfahrt oder Umweg (deterministisch über Luftlinie).
  function chooseKmModel(pickup) {
    var withinRadius = haversineKm(CONFIG.depot, pickup) <= CONFIG.pickupRadiusKm;
    var isSouth = pickup.lat < CONFIG.depot.lat;
    return (withinRadius || isSouth) ? "abholfahrt" : "umweg";
  }

  // Fahrzeugkosten je Kilometer (ohne Fahrerlohn):
  // Diesel × Verbrauch + Verschleiß + Abschreibung + Fixkosten-Umlage + Maut.
  function vehicleCostPerKm(dieselPricePerL) {
    return dieselPricePerL * CONFIG.verbrauchLper100km / 100 +
           CONFIG.verschleissEurProKm + CONFIG.abschreibungEurProKm +
           CONFIG.fixkostenEurProKm + CONFIG.mautEurProKm +
           CONFIG.werbekostenProJahrEur / CONFIG.jahresKilometer;
  }

  // Gewinnaufschlag auf die Selbstkosten.
  function applyMargin(n) {
    return n * (1 + CONFIG.gewinnaufschlagProzent / 100);
  }

  // Geschätzte Be-/Entlade- und Tragezeit in Stunden (beide Stopps).
  function handlingHoursFor(weightKg, pickup, delivery) {
    var blocks = Math.max(1, Math.ceil(weightKg / CONFIG.weightBlockKg));
    var effFloors = pickup.floors * (pickup.elevator ? CONFIG.elevatorFactor : 1) +
                    delivery.floors * (delivery.elevator ? CONFIG.elevatorFactor : 1);
    var minutes = 2 * CONFIG.ladezeitProStoppMin +
                  effFloors * blocks * CONFIG.minutenJeEtageJeBlock +
                  (blocks - 1) * CONFIG.minutenJeSchwerBlock;
    return minutes / 60;
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

    var share = Math.min(totals.volumeM3 / CONFIG.vanVolumeM3, 1);
    var model = chooseKmModel(input.pickup);
    var l = input.legs;
    var km, hours;
    if (model === "abholfahrt") {
      km = 2 * l.depotToPickup.km + l.depotToDelivery.km;
      hours = 2 * l.depotToPickup.hours + l.depotToDelivery.hours;
    } else {
      km = Math.max(0, l.depotToPickup.km + l.pickupToDelivery.km - l.depotToDelivery.km);
      hours = Math.max(0, l.depotToPickup.hours + l.pickupToDelivery.hours - l.depotToDelivery.hours);
    }

    var vehicleCost = km * vehicleCostPerKm(input.dieselPricePerL) * share;
    var driverDriveCost = hours * CONFIG.fahrerStundensatzEur * share;

    var handlingHours = handlingHoursFor(totals.weightKg, input.pickup, input.delivery);
    var handlingSelfCost = handlingHours * CONFIG.fahrerStundensatzEur;

    var helperSelfCost = (input.helperNeeded && !input.customerHelps)
      ? handlingHours * CONFIG.beifahrerStundensatzEur
      : 0;

    var selbstkosten = vehicleCost + driverDriveCost + handlingSelfCost + helperSelfCost;
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
      // Kundensicht: Zeilen inkl. anteiligem Gewinnaufschlag
      fahrtCost: applyMargin(vehicleCost + driverDriveCost),
      handlingCost: applyMargin(handlingSelfCost),
      helperCost: applyMargin(helperSelfCost),
      handlingMinutes: handlingHours * 60,
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
      depotToDelivery:  { km: 630, hours: 9.0 }
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

    // Be-/Entlade-/Tragezeit (Grundzeit 2×30 Min.)
    check("Handling 10 kg EG→EG => 60 Min.",
      handlingHoursFor(10, { floors: 0, elevator: false }, { floors: 0, elevator: false }) * 60, 60);
    check("Handling 80 kg, 3. OG ohne Aufzug => 83 Min. (60 + 3×2×3 + 5)",
      handlingHoursFor(80, { floors: 3, elevator: false }, { floors: 0, elevator: false }) * 60, 83);
    check("Handling 80 kg, 3. OG mit Aufzug => 65,9 Min. (5 %-Faktor)",
      handlingHoursFor(80, { floors: 3, elevator: true }, { floors: 0, elevator: false }) * 60, 65.9);

    // Modellwahl
    checkTrue("Ludwigsburg (18 km, nördlich) => Abholfahrt", chooseKmModel({ lat: 48.90, lon: 9.19 }) === "abholfahrt");
    checkTrue("Tübingen (südlich) => Abholfahrt", chooseKmModel({ lat: 48.52, lon: 9.05 }) === "abholfahrt");
    checkTrue("Ulm (75 km, südlich) => Abholfahrt", chooseKmModel({ lat: 48.40, lon: 9.99 }) === "abholfahrt");
    checkTrue("Nürnberg => Umweg", chooseKmModel(north) === "umweg");
    checkTrue("Karlsruhe => Umweg", chooseKmModel({ lat: 49.01, lon: 8.40 }) === "umweg");

    // km- und Zeit-Formeln
    var abhol = calculateBerlinPrice(berlinInput({}));
    check("Abholfahrt-km = 2×10 + 630", abhol.chargeableKm, 650);
    check("Abholfahrt-Stunden = 2×0,2 + 9", abhol.chargeableHours, 9.4);
    var umweg = calculateBerlinPrice(berlinInput({ pickup: { lat: north.lat, lon: north.lon, floors: 0, elevator: false } }));
    check("Umweg-km = 10 + 620 − 630", umweg.chargeableKm, 0);

    // Beiladung Berlin, komplettes Beispiel (1,0927 m³ => 10,93 % Anteil):
    // Fahrzeug 650×0,541×Anteil = 38,43 € | Fahrer 9,4×30×Anteil = 30,81 €
    // Handling 60 Min. × 30 € = 30 € => 99,24 € Selbstkosten => 100 € (aufgerundet)
    check("Beispiel: Volumen 1,0927 m³", abhol.volumeM3, 1.092727);
    check("Beispiel: Selbstkosten 99,24 €", abhol.subtotal, 99.24065);
    check("Beispiel: Gesamtpreis 100 €", abhol.total, 100);

    // Beifahrer: Handling-Zeit × 30 € zusätzlich
    var helper = calculateBerlinPrice(berlinInput({ helperNeeded: true, customerHelps: false }));
    check("Beifahrer => +30 € (60 Min. × 30 €), gesamt 130 €", helper.total, 130);
    var helperSelf = calculateBerlinPrice(berlinInput({ helperNeeded: true, customerHelps: true }));
    check("Kunde hilft selbst => Beifahrer 0 €", helperSelf.helperCost, 0);

    // Gewinnaufschlag: 25 % auf 99,24 € Selbstkosten => 124,05 => 125 €
    var savedMargin = CONFIG.gewinnaufschlagProzent;
    CONFIG.gewinnaufschlagProzent = 25;
    check("Gewinnaufschlag 25 % => 125 €", calculateBerlinPrice(berlinInput({})).total, 125);
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

    // Sonderfahrt: 90 km, 1,5 h Fahrt + 60 Min. Ladezeit = 2,5 h
    // Fahrzeug 90×0,541 = 48,69 € | Fahrer 2,5×30 = 75,00 € => 123,69 => 124 €
    var sfLegs = {
      depotToPickup: { km: 30, hours: 0.5 },
      pickupToDest:  { km: 30, hours: 0.5 },
      destToDepot:   { km: 30, hours: 0.5 }
    };
    var sf = calculateSonderfahrtPrice({ legs: sfLegs, helperNeeded: false, dieselPricePerL: 1.65 });
    check("Sonderfahrt 90 km => 124 €", sf.total, 124);
    var sfHelper = calculateSonderfahrtPrice({ legs: sfLegs, helperNeeded: true, dieselPricePerL: 1.65 });
    check("Sonderfahrt mit Beifahrer => +75 € => 199 €", sfHelper.total, 199);
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

    var failed = results.filter(function (r) { return !r.OK; });
    if (window.console && console.table) console.table(results);
    var banner = document.createElement("div");
    banner.className = "test-banner " + (failed.length ? "fail" : "pass");
    banner.textContent = failed.length
      ? "Selbsttests: " + failed.length + " von " + results.length + " FEHLGESCHLAGEN – Details in der Konsole"
      : "Selbsttests: " + results.length + "/" + results.length + " bestanden ✓";
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
  function geocodeQuery(query, bias) {
    return photonSearch(query, bias, undefined).then(function (places) {
      if (places.length) return places[0];
      throw new Error("photon leer");
    }).catch(function () {
      if (!CONFIG.orsApiKey) return null;
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
      }).catch(function () { return null; });
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
      if (place && state) state.resolved = place;
      return place;
    });
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

  function whatsappBlock(message) {
    var number = CONFIG.whatsappNumber || "";
    if (!number || number.indexOf("X") !== -1) {
      return '<span class="btn-whatsapp is-disabled">' + WA_ICON + ' Per WhatsApp anfragen</span>' +
             '<p class="wa-hint">WhatsApp ist noch nicht eingerichtet – Nummer in app.js (CONFIG.whatsappNumber) eintragen.</p>';
    }
    var href = "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
    return '<a class="btn-whatsapp" href="' + esc(href) + '" target="_blank" rel="noopener">' +
           WA_ICON + ' Per WhatsApp anfragen</a>' +
           '<p class="wa-hint">Öffnet WhatsApp mit Ihrer fertigen Anfrage – Sie können sie vor dem Senden noch prüfen.</p>';
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

  function addItemRow() {
    itemCounter++;
    var n = itemCounter;
    var container = document.getElementById("t-items");
    var row = document.createElement("div");
    row.className = "item-row";
    function itemField(key, labelText, min, max, step, mode, value) {
      var id = "t-item-" + n + "-" + key;
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
      renumberItems();
    });
    container.appendChild(row);
    renumberItems();
  }

  function renumberItems() {
    var rows = document.querySelectorAll("#t-items .item-row");
    rows.forEach(function (row, i) {
      row.querySelector(".item-title").textContent = "Gegenstand " + (i + 1);
      row.querySelector(".item-remove").style.display = rows.length > 1 ? "" : "none";
    });
  }

  function collectItems() {
    var rows = document.querySelectorAll("#t-items .item-row");
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

  function transportWaMessage(data, result, flags) {
    var lines = [];
    lines.push("Anfrage Beiladung Stuttgart → Berlin");
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
    lines.push("Zweiter Träger: " + (data.helperNeeded
      ? (data.customerHelps ? "Ja – ich helfe selbst mit" : "Ja") : "Nein"));
    if (data.date) lines.push("Wunschtermin: " + fmtDateDe(data.date));
    lines.push("──────────────");
    if (result && result.ok) {
      lines.push("Strecke: " + fmtKm(result.chargeableKm) + " (" +
                 (result.model === "abholfahrt" ? "Abholfahrt" : "Umweg") + ")");
      lines.push("Fahrt: " + fmtEur(result.fahrtCost) +
                 " | Verladen/Tragen: " + fmtEur(result.handlingCost) +
                 " | Beifahrer: " + fmtEur(result.helperCost));
      lines.push("GESAMT: " + fmtEur0(result.total));
      lines.push("(Diesel " + fmtNum(result.dieselPricePerL, 2) + " €/l, Stand " +
                 new Date().toLocaleDateString("de-DE") + ", gültig " + CONFIG.priceValidityDays +
                 " Tage" + (flags.estimated ? ", Entfernung geschätzt" : "") + ")");
    } else if (result && result.reason === "volume") {
      lines.push("Über " + CONFIG.vanVolumeM3 + " m³ – bitte um individuelles Angebot.");
    } else if (result && result.reason === "oversize") {
      lines.push("Übergröße – bitte um individuelles Angebot.");
    } else if (flags.farDelivery) {
      lines.push("Lieferadresse außerhalb Berlin – bitte um individuelles Angebot.");
    }
    return lines.join("\n");
  }

  function initTransport() {
    var form = document.getElementById("form-transport");
    var resultEl = document.getElementById("t-result");
    var pickupInput = document.getElementById("t-pickup-address");
    var deliveryInput = document.getElementById("t-delivery-address");

    attachAutocomplete(pickupInput, CONFIG.depot);
    attachAutocomplete(deliveryInput, CONFIG.destination);

    addItemRow();
    document.getElementById("t-add-item").addEventListener("click", addItemRow);

    // "Ich helfe selbst mit" nur zeigen, wenn ein Träger benötigt wird.
    // Auch initial und bei pageshow synchronisieren – Browser wie Firefox
    // stellen Formularwerte nach einem Reload ohne change-Event wieder her.
    var selfHelpWrap = document.getElementById("t-self-help-wrap");
    function syncSelfHelp() {
      var checked = form.querySelector('input[name="t-helper"]:checked');
      selfHelpWrap.hidden = !checked || checked.value !== "ja";
    }
    form.querySelectorAll('input[name="t-helper"]').forEach(function (r) {
      r.addEventListener("change", syncSelfHelp);
    });
    syncSelfHelp();
    window.addEventListener("pageshow", syncSelfHelp);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearFormErrors(form);
      resultEl.hidden = true;

      var pickupFloor = validateInt(document.getElementById("t-pickup-floor"), 0, 10, "Bitte Etage 0–10 angeben.");
      var deliveryFloor = validateInt(document.getElementById("t-delivery-floor"), 0, 10, "Bitte Etage 0–10 angeben.");
      var items = collectItems();
      if (items !== null && items.length === 0) {
        showFormError("t-items-error", "Bitte mindestens einen Gegenstand angeben.");
        items = null;
      }

      var dateInput = document.getElementById("t-date");
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

      if (pickupFloor === null || deliveryFloor === null || items === null || date === null ||
          !pickupInput.value.trim() || !deliveryInput.value.trim()) {
        showFormError("t-form-error", "Bitte prüfen Sie die rot markierten Felder.");
        return;
      }

      var btn = document.getElementById("t-submit");
      setLoading(btn, true);

      Promise.all([
        resolveAddress(pickupInput, CONFIG.depot),
        resolveAddress(deliveryInput, CONFIG.destination)
      ]).then(function (places) {
        var pickup = places[0], delivery = places[1];
        if (!pickup) { setFieldError(pickupInput, "Adresse nicht gefunden – bitte Straße, PLZ und Ort angeben."); }
        if (!delivery) { setFieldError(deliveryInput, "Adresse nicht gefunden – bitte Straße, PLZ und Ort angeben."); }
        if (!pickup || !delivery) throw { handled: true };

        var data = {
          pickup: { lat: pickup.lat, lon: pickup.lon, label: pickup.label,
                    floors: pickupFloor, elevator: document.getElementById("t-pickup-elevator").checked },
          delivery: { lat: delivery.lat, lon: delivery.lon, label: delivery.label,
                      floors: deliveryFloor, elevator: document.getElementById("t-delivery-elevator").checked },
          items: items,
          helperNeeded: form.querySelector('input[name="t-helper"]:checked').value === "ja",
          customerHelps: document.getElementById("t-self-help").checked,
          date: date,
          name: document.getElementById("t-name").value.trim()
        };

        // Lieferziel-Plausibilität: nur Berlin + Umkreis bekommt einen Sofort-Preis
        if (haversineKm(data.delivery, CONFIG.destination) > CONFIG.deliveryMaxKmFromBerlin) {
          var waFar = transportWaMessage(data, null, { farDelivery: true, estimated: false });
          showResult(resultEl,
            '<h3 class="result-title">Bitte individuell anfragen</h3>' +
            '<p class="result-error-msg">Diese Lieferadresse liegt außerhalb von Berlin und Umgebung. ' +
            'Unser Sofort-Preis gilt für Lieferungen nach Berlin (+' + CONFIG.deliveryMaxKmFromBerlin +
            ' km). Gerne machen wir Ihnen ein individuelles Angebot!</p>' +
            whatsappBlock(waFar), true);
          return;
        }

        return Promise.all([
          routeKm(CONFIG.depot, data.pickup),
          routeKm(data.pickup, data.delivery),
          routeKm(CONFIG.depot, data.delivery),
          getDieselPrice()
        ]).then(function (r) {
          var estimated = r[0].estimated || r[1].estimated || r[2].estimated;
          var fuel = r[3];
          var result = calculateBerlinPrice({
            items: data.items,
            legs: { depotToPickup: r[0], pickupToDelivery: r[1], depotToDelivery: r[2] },
            pickup: data.pickup,
            delivery: data.delivery,
            helperNeeded: data.helperNeeded,
            customerHelps: data.customerHelps,
            dieselPricePerL: fuel.price
          });

          if (!result.ok) {
            var msg = result.reason === "volume"
              ? "Ihre Sendung ist größer als " + CONFIG.vanVolumeM3 + " m³ und passt leider nicht als Beiladung " +
                "in unseren Transporter. Gerne machen wir Ihnen ein individuelles Angebot!"
              : "Ein Gegenstand überschreitet unsere maximalen Einzelmaße (" +
                CONFIG.maxItemDimCm.l + " × " + CONFIG.maxItemDimCm.w + " × " + CONFIG.maxItemDimCm.h +
                " cm). Gerne prüfen wir das individuell!";
            var waBig = transportWaMessage(data, result, { estimated: estimated });
            showResult(resultEl,
              '<h3 class="result-title">Bitte individuell anfragen</h3>' +
              '<p class="result-error-msg">' + esc(msg) + '</p>' + whatsappBlock(waBig), true);
            return;
          }

          var lines = [
            { label: "Fahrt (" + fmtKm(result.chargeableKm) + ", anteilig " +
                     fmtNum(result.volumeShare * 100, 1) + " % Ladevolumen)",
              amount: fmtEur(result.fahrtCost) },
            { label: "Be- & Entladen, Tragen (ca. " + Math.round(result.handlingMinutes) + " Min., " +
                     fmtNum(result.weightKg, 0) + " kg)",
              amount: fmtEur(result.handlingCost) },
            { label: "Beifahrer / zweiter Träger", amount: fmtEur(result.helperCost) }
          ];
          if (result.minApplied) {
            lines.push({ label: "Mindestauftragswert", amount: fmtEur(Math.max(0, CONFIG.minPriceEur - result.subtotal)) });
          }

          var badges = [
            { text: result.model === "abholfahrt" ? "Abholfahrt-Modell" : "Umweg-Modell (liegt auf unserer Route)" },
            { text: "Ladevolumen: " + fmtNum(result.volumeM3, 2) + " m³ von " + CONFIG.vanVolumeM3 + " m³" }
          ];
          badges.push(fuel.isFallback
            ? { text: "Diesel: Standardwert " + fmtNum(fuel.price, 2) + " €/l", warn: true }
            : { text: "Diesel: " + fmtNum(fuel.price, 2) + " €/l (aktuell)" });
          if (estimated) badges.push({ text: "Entfernung geschätzt (Luftlinie)", warn: true });

          var wa = transportWaMessage(data, result, { estimated: estimated });
          showResult(resultEl,
            '<h3 class="result-title">Ihr Preis: ' + fmtEur0(result.total) + '</h3>' +
            '<p class="result-sub">Beiladung ' + esc(pickup.label) + ' → ' + esc(delivery.label) + '</p>' +
            badgesHtml(badges) +
            breakdownHtml(lines, fmtEur0(result.total)) +
            whatsappBlock(wa) +
            legalNote(), false);
        });
      }).catch(function (err) {
        if (!err || !err.handled) {
          showFormError("t-form-error", "Die Berechnung ist fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
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
    lines.push("GESAMT: " + fmtEur0(result.total) +
               (result.minApplied ? " (Mindestpreis)" : ""));
    if (flags.estimated) lines.push("(Entfernung geschätzt)");
    return lines.join("\n");
  }

  function initSonderfahrt() {
    var form = document.getElementById("form-sonderfahrt");
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
        return;
      }

      var btn = document.getElementById("s-submit");
      setLoading(btn, true);

      Promise.all([
        resolveAddress(pickupInput, CONFIG.depot),
        resolveAddress(destInput, CONFIG.depot)
      ]).then(function (places) {
        var pickup = places[0], dest = places[1];
        if (!pickup) setFieldError(pickupInput, "Adresse nicht gefunden – bitte Straße, PLZ und Ort angeben.");
        if (!dest) setFieldError(destInput, "Adresse nicht gefunden – bitte Straße, PLZ und Ort angeben.");
        if (!pickup || !dest) throw { handled: true };

        var data = {
          pickup: pickup,
          dest: dest,
          date: dateInput.value,
          time: timeInput.value,
          desc: descInput.value.trim(),
          helperNeeded: document.getElementById("s-helper").checked,
          pickupFloor: intValue(document.getElementById("s-pickup-floor")),
          destFloor: intValue(document.getElementById("s-dest-floor")),
          name: document.getElementById("s-name").value.trim()
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
          showResult(resultEl,
            '<h3 class="result-title">Ihr Preis: ' + fmtEur0(result.total) + '</h3>' +
            '<p class="result-sub">Sonderfahrt ' + esc(pickup.label) + ' → ' + esc(dest.label) + '</p>' +
            badgesHtml(badges) +
            breakdownHtml(lines, fmtEur0(result.total)) +
            whatsappBlock(wa) +
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
      lines.push("GESAMT: " + fmtEur0(result.total));
    }
    return lines.join("\n");
  }

  function initPutzservice() {
    var form = document.getElementById("form-putzservice");
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
        return;
      }

      var btn = document.getElementById("p-submit");
      setLoading(btn, true);

      resolveAddress(addressInput, CONFIG.cleaningAreaCenter).then(function (place) {
        if (!place) {
          setFieldError(addressInput, "Adresse nicht gefunden – bitte Straße, PLZ und Ort angeben.");
          throw { handled: true };
        }

        var data = {
          service: serviceSelect.value,
          address: place,
          hours: hours,
          staff: staff,
          date: date,
          name: document.getElementById("p-name").value.trim()
        };

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
            whatsappBlock(waOut), true);
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
          whatsappBlock(wa) +
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

  document.addEventListener("DOMContentLoaded", function () {
    fillConfigPlaceholders();
    initTabs();
    initTransport();
    initSonderfahrt();
    initPutzservice();
    initImpressum();
    if (/[?&]test=1/.test(location.search)) runSelfTests();
  });

})();
