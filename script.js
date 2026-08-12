/* Gausdienstleistungen – Anfrageformular
   Baut aus den Formularfeldern eine fertige WhatsApp-Nachricht und öffnet wa.me.
   Es werden keine Daten an diese Website oder Dritte übertragen – die Nachricht
   entsteht ausschließlich lokal im Browser und wird erst gesendet, wenn die
   Besucherin oder der Besucher sie selbst in WhatsApp abschickt. */

(function () {
  "use strict";

  var WHATSAPP_NUMMER = "491626806273";

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
    initDatumsgrenzen();
  });
})();
