/* Gausdienstleistungen – Anfrageformular
   Baut aus den Formularfeldern eine fertige WhatsApp-Nachricht und öffnet wa.me.
   Es werden keine Daten an diese Website oder Dritte übertragen – die Nachricht
   entsteht ausschließlich lokal im Browser und wird erst gesendet, wenn die
   Besucherin oder der Besucher sie selbst in WhatsApp abschickt. */

(function () {
  "use strict";

  var WHATSAPP_NUMMER = "491626806273";

  // ── Streckenhinweis ──────────────────────────────────────────────
  // Fahrten, bei denen Start UND Ziel in der Region Stuttgart liegen
  // (rund 50 km Umkreis), werden häufig gefahren. Liegt eine Seite
  // weiter weg, erscheint unter dem Formular der Hinweis, dass die
  // Strecke selten gefahren wird. Sonderfahrten sind davon ausgenommen –
  // die fahren wir jederzeit.
  //
  // Die Erkennung läuft komplett lokal im Browser: zuerst über die
  // Postleitzahl (Anfangsziffern der PLZ-Gebiete rund um Stuttgart),
  // ersatzweise über bekannte Ortsnamen der Region. Beide Listen können
  // hier einfach erweitert werden.
  var REGION_PLZ_PRAEFIXE = [
    "70", "71",                                      // Stuttgart, Ludwigsburg, Böblingen, Waiblingen, Backnang
    "720", "721", "722", "724", "725", "726", "727", // Tübingen, Nagold, Metzingen, Nürtingen, Reutlingen
    "730", "731", "732", "735", "736", "737",        // Göppingen, Kirchheim, Schwäbisch Gmünd, Schorndorf, Esslingen
    "740", "741", "742", "743",                      // Heilbronn, Neckarsulm, Bietigheim-Bissingen
    "750", "751", "752", "753", "754"                // Bretten, Pforzheim, Calw, Mühlacker
  ];
  var REGION_ORTE = [
    "stuttgart", "ludwigsburg", "boeblingen", "sindelfingen", "esslingen",
    "waiblingen", "fellbach", "leonberg", "kornwestheim", "ditzingen",
    "gerlingen", "leinfelden", "echterdingen", "filderstadt", "ostfildern",
    "plochingen", "wendlingen", "nuertingen", "kirchheim", "tuebingen",
    "reutlingen", "metzingen", "pfullingen", "herrenberg", "goeppingen",
    "schwaebisch gmuend", "schorndorf", "backnang", "winnenden", "weinstadt",
    "bietigheim", "vaihingen", "muehlacker", "pforzheim", "calw", "nagold",
    "heilbronn", "neckarsulm", "marbach", "remseck", "korb", "gaertringen",
    "nufringen", "holzgerlingen", "waldenbuch", "steinenbronn", "renningen"
  ];

  function normalisiereOrt(text) {
    return String(text).toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  }

  // Liefert "region", "fern" oder "leer".
  // Bevorzugt die genaue Prüfung über die PLZ-Koordinaten des Preisrechners
  // (Umkreis KONFIG.regionRadiusKm um das Depot); die Listen oben dienen als
  // Reserve, falls der Ort dort nicht gefunden wird.
  function stufeOrtEin(text) {
    var t = String(text).trim();
    if (t.length < 2) return "leer";

    if (window.GausRechner && typeof KONFIG !== "undefined") {
      var koordinaten = window.GausRechner.intern.findeOrt(t);
      if (koordinaten) {
        var km = window.GausRechner.intern.luftlinieKm(KONFIG.depot, koordinaten);
        return km <= KONFIG.regionRadiusKm ? "region" : "fern";
      }
    }

    var plz = t.match(/\b(\d{5})\b/);
    if (plz) {
      var inRegion = REGION_PLZ_PRAEFIXE.some(function (p) {
        return plz[1].indexOf(p) === 0;
      });
      return inRegion ? "region" : "fern";
    }
    var norm = normalisiereOrt(t);
    var bekannt = REGION_ORTE.some(function (ort) {
      return new RegExp("\\b" + ort + "\\b").test(norm);
    });
    return bekannt ? "region" : "fern";
  }

  function initStreckenHinweis() {
    var hinweis = document.getElementById("strecken-hinweis");
    var leistung = document.getElementById("f-leistung");
    var von = document.getElementById("f-von");
    var nach = document.getElementById("f-nach");
    if (!hinweis || !leistung || !von || !nach) return;

    function aktualisiere() {
      var vonStufe = stufeOrtEin(von.value);
      var nachStufe = stufeOrtEin(nach.value);
      var zeigen = leistung.value !== "Sonderfahrt" &&
                   vonStufe !== "leer" && nachStufe !== "leer" &&
                   (vonStufe === "fern" || nachStufe === "fern");
      hinweis.hidden = !zeigen;
    }

    leistung.addEventListener("change", aktualisiere);
    von.addEventListener("input", aktualisiere);
    nach.addEventListener("input", aktualisiere);
  }

  function fmtDatumDe(iso) {
    var teile = String(iso).split("-");
    if (teile.length !== 3) return iso;
    return teile[2] + "." + teile[1] + "." + teile[0];
  }

  function baueNachricht(felder) {
    var zeilen = ["Hallo Julian, ich habe eine Transportanfrage:", ""];
    zeilen.push("Leistung: " + felder.leistung);
    zeilen.push("Von: " + felder.von);
    zeilen.push("Nach: " + felder.nach);
    if (felder.termin) zeilen.push("Wunschtermin: " + fmtDatumDe(felder.termin));
    if (felder.name) zeilen.push("Name: " + felder.name);
    // Angaben und Preisschätzung aus dem Preisrechner (rechner.js) anhängen.
    if (window.GausRechner) {
      var extra = window.GausRechner.whatsappZeilen();
      if (extra.length) {
        zeilen.push("");
        extra.forEach(function (z) { zeilen.push(z); });
      }
    }
    if (felder.nachricht) {
      zeilen.push("");
      zeilen.push("Details: " + felder.nachricht);
    }
    return zeilen.join("\n");
  }

  function initFormular() {
    var form = document.getElementById("anfrage-form");
    if (!form) return;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;

      var text = baueNachricht({
        leistung: document.getElementById("f-leistung").value.trim(),
        von: document.getElementById("f-von").value.trim(),
        nach: document.getElementById("f-nach").value.trim(),
        termin: document.getElementById("f-termin").value,
        name: document.getElementById("f-name").value.trim(),
        nachricht: document.getElementById("f-nachricht").value.trim()
      });

      var url = "https://wa.me/" + WHATSAPP_NUMMER + "?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
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

  document.addEventListener("DOMContentLoaded", function () {
    initFormular();
    initStreckenHinweis();
    initDatumsgrenzen();
  });
})();
