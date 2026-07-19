/* ════════════════════════════════════════════════════════════════════
   Gaus Dienstleistungen – Interner Bereich
   ────────────────────────────────────────────────────────────────────
   Zeigt alle eingegangenen Anfragen und stellt daraus Touren zusammen.

   Die Routenoptimierung läuft bewusst im Browser (nicht über einen
   fremden Optimierungsdienst): So funktioniert sie auch dann noch,
   wenn das API-Kontingent aufgebraucht oder der Dienst gestört ist,
   und jedes Umsortieren von Hand rechnet sofort neu – ohne neue
   Anfrage ans Netz.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var H = window.GausPreis.hilfen;
  var esc = H.esc, fmtEur0 = H.fmtEur0, fmtKm = H.fmtKm, fmtNum = H.fmtNum;
  var DB = window.GausDB;

  var BEREICH_NAME = {
    beiladung_hin: "Beiladung → Berlin",
    beiladung_rueck: "Beiladung → Stuttgart",
    sonderfahrt: "Sonderfahrt",
    putzservice: "Putzservice"
  };
  var STATUS_NAME = {
    neu: "Neu", angenommen: "Angenommen", erledigt: "Erledigt", abgelehnt: "Abgelehnt"
  };

  var alleAnfragen = [];
  var aktuelleTour = null;

  // ── Kleine Helfer ───────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function ladeStatus(btn, an) {
    btn.disabled = an;
    var label = btn.querySelector(".btn-label");
    var spinner = btn.querySelector(".btn-spinner");
    if (spinner) spinner.hidden = !an;
    if (label) label.style.opacity = an ? "0.6" : "";
  }

  function zeigeFehler(id, text) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
  }

  function stunden(sekunden) {
    var h = Math.floor(sekunden / 3600);
    var m = Math.round((sekunden % 3600) / 60);
    if (m === 60) { h += 1; m = 0; }
    return h + " Std. " + (m < 10 ? "0" : "") + m + " Min.";
  }

  function uhrzeit(startText, offsetSek) {
    var teile = String(startText || "07:00").split(":");
    var basis = (parseInt(teile[0], 10) || 0) * 3600 + (parseInt(teile[1], 10) || 0) * 60;
    var t = basis + offsetSek;
    var tag = Math.floor(t / 86400);
    t = t % 86400;
    var hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60);
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm +
           (tag > 0 ? " (+" + tag + " Tag)" : "");
  }

  function datumDe(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." +
           d.getFullYear() + ", " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  function heuteIso() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  // ══════════════════════════════════════════════════════════════════
  //  ANMELDUNG
  // ══════════════════════════════════════════════════════════════════

  function zeigeAdmin() {
    $("login-screen").hidden = true;
    $("admin-screen").hidden = false;
    $("admin-user").textContent = DB.configured()
      ? DB.userEmail()
      : "Übungsmodus – Daten nur auf diesem Gerät";
    ladeAnfragen();
    ladeTouren();
  }

  function zeigeLogin() {
    $("admin-screen").hidden = true;
    $("login-screen").hidden = false;
    $("login-demo-hint").hidden = DB.configured();
  }

  function initLogin() {
    $("login-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      zeigeFehler("login-error", "");
      var btn = $("login-submit");
      ladeStatus(btn, true);
      DB.signIn($("login-email").value.trim(), $("login-password").value)
        .then(zeigeAdmin)
        .catch(function (err) { zeigeFehler("login-error", err.message || "Anmeldung fehlgeschlagen."); })
        .then(function () { ladeStatus(btn, false); });
    });

    $("logout-btn").addEventListener("click", function () {
      DB.signOut().then(function () {
        $("login-password").value = "";
        zeigeLogin();
      });
    });

    if (DB.loggedIn()) zeigeAdmin(); else zeigeLogin();
  }

  // ══════════════════════════════════════════════════════════════════
  //  ANFRAGEN
  // ══════════════════════════════════════════════════════════════════

  function ladeAnfragen() {
    var liste = $("anfragen-liste");
    liste.innerHTML = '<p class="admin-leer">Wird geladen …</p>';
    DB.anfragenLaden().then(function (rows) {
      alleAnfragen = rows || [];
      zeichneAnfragen();
      zeichneAuswahl();
    }).catch(function (err) {
      liste.innerHTML = '<p class="admin-leer admin-fehler">Konnte nicht geladen werden: ' +
                        esc(err.message || "Unbekannter Fehler") + '</p>';
    });
  }

  function gefilterteAnfragen() {
    var status = $("f-status").value;
    var bereich = $("f-bereich").value;
    var suche = $("f-suche").value.trim().toLowerCase();

    return alleAnfragen.filter(function (a) {
      if (status === "offen") { if (a.status !== "neu" && a.status !== "angenommen") return false; }
      else if (status !== "alle" && a.status !== status) return false;
      if (bereich !== "alle" && a.bereich !== bereich) return false;
      if (suche) {
        var text = [a.name, a.telefon, a.abhol_label, a.liefer_label, a.notiz].join(" ").toLowerCase();
        if (text.indexOf(suche) === -1) return false;
      }
      return true;
    });
  }

  function zeichneAnfragen() {
    var rows = gefilterteAnfragen();
    var liste = $("anfragen-liste");

    var offen = alleAnfragen.filter(function (a) { return a.status === "neu"; }).length;
    $("anfragen-summary").textContent =
      rows.length + " von " + alleAnfragen.length + " Anfragen" +
      (offen ? " · " + offen + " noch unbearbeitet" : "");

    if (!rows.length) {
      liste.innerHTML = '<p class="admin-leer">Keine Anfragen gefunden.' +
        (alleAnfragen.length ? " Filter ändern?" : " Sobald ein Kunde auf der Website auf " +
         "„Per WhatsApp anfragen“ klickt, erscheint die Anfrage hier.") + '</p>';
      return;
    }

    liste.innerHTML = rows.map(anfrageKarte).join("");
  }

  function anfrageKarte(a) {
    var d = a.daten || {};
    var titel = BEREICH_NAME[a.bereich] || a.bereich;
    var preis = (a.preis_eur === null || a.preis_eur === undefined)
      ? '<span class="preis-offen">Preis auf Anfrage</span>'
      : fmtEur0(Number(a.preis_eur));

    var zeilen = [];
    if (a.abhol_label) {
      zeilen.push(["Abholung", esc(a.abhol_label) + adressZusatz(a.abhol_etage, a.abhol_aufzug)]);
    }
    if (a.liefer_label) {
      zeilen.push(["Lieferung", esc(a.liefer_label) + adressZusatz(a.liefer_etage, a.liefer_aufzug)]);
    }
    if (a.volumen_m3) zeilen.push(["Ladung", fmtNum(Number(a.volumen_m3), 2) + " m³, " +
                                             fmtNum(Number(a.gewicht_kg || 0), 0) + " kg"]);
    if (a.wunschtermin) zeilen.push(["Wunschtermin", esc(a.wunschtermin)]);
    if (a.telefon) zeilen.push(["Telefon", '<a href="tel:' + esc(a.telefon) + '">' + esc(a.telefon) + "</a>"]);
    if (d.leistung) zeilen.push(["Leistung", esc(d.leistung) + " · " + esc(String(d.stunden)) +
                                             " Std. · " + esc(String(d.kraefte)) + " Kraft/Kräfte"]);
    if (d.ladung) zeilen.push(["Ladung", esc(d.ladung)]);
    if (d.uhrzeit) zeilen.push(["Uhrzeit", esc(d.uhrzeit)]);
    if (d.traegerGewuenscht) {
      zeilen.push(["Träger", d.kundeHilftMit ? "gewünscht, Kunde hilft mit" : "gewünscht"]);
    }
    if (d.modell) zeilen.push(["Streckenmodell", d.modell === "abholfahrt" ? "Abholfahrt" : "Umweg (auf der Route)"]);
    if (d.hinweis) zeilen.push(["Hinweis", esc(d.hinweis)]);

    var stuecke = "";
    if (d.gegenstaende && d.gegenstaende.length) {
      stuecke = '<ul class="stueck-liste">' + d.gegenstaende.map(function (g) {
        return "<li>" + esc(String(g.qty)) + "× " + esc(String(g.lengthCm)) + "×" +
               esc(String(g.widthCm)) + "×" + esc(String(g.heightCm)) + " cm, " +
               esc(String(g.weightKg)) + " kg</li>";
      }).join("") + "</ul>";
    }

    return '' +
      '<article class="anfrage-karte status-' + esc(a.status) + '" data-id="' + esc(a.id) + '">' +
        '<div class="ak-kopf">' +
          '<div>' +
            '<p class="ak-titel">' + esc(titel) + (a.name ? " · " + esc(a.name) : "") + '</p>' +
            '<p class="ak-zeit">' + esc(datumDe(a.erstellt_am)) + '</p>' +
          '</div>' +
          '<div class="ak-rechts">' +
            '<span class="ak-preis">' + preis + '</span>' +
            '<span class="badge badge-' + esc(a.status) + '">' + esc(STATUS_NAME[a.status] || a.status) + '</span>' +
          '</div>' +
        '</div>' +
        '<dl class="ak-daten">' + zeilen.map(function (z) {
          return "<dt>" + z[0] + "</dt><dd>" + z[1] + "</dd>";
        }).join("") + '</dl>' +
        stuecke +
        '<div class="ak-notiz">' +
          '<label for="notiz-' + esc(a.id) + '">Notiz</label>' +
          '<textarea id="notiz-' + esc(a.id) + '" rows="1" data-notiz="' + esc(a.id) + '" ' +
            'placeholder="Interne Notiz …">' + esc(a.notiz || "") + '</textarea>' +
        '</div>' +
        '<div class="ak-aktionen">' +
          statusKnopf(a, "angenommen", "Annehmen") +
          statusKnopf(a, "erledigt", "Erledigt") +
          statusKnopf(a, "abgelehnt", "Ablehnen") +
          (a.telefon ? '<a class="btn-ghost" href="https://wa.me/' +
             esc(String(a.telefon).replace(/[^0-9]/g, "")) + '" target="_blank" rel="noopener">WhatsApp</a>' : "") +
          '<button type="button" class="btn-ghost btn-loeschen" data-loeschen="' + esc(a.id) + '">Löschen</button>' +
        '</div>' +
      '</article>';
  }

  function adressZusatz(etage, aufzug) {
    if (etage === null || etage === undefined) return "";
    return ' <span class="ak-klein">(' + (etage === 0 ? "EG" : etage + ". Etage") +
           (aufzug ? ", Aufzug" : "") + ")</span>";
  }

  function statusKnopf(a, status, text) {
    if (a.status === status) return "";
    return '<button type="button" class="btn-ghost" data-status="' + esc(status) +
           '" data-id="' + esc(a.id) + '">' + text + "</button>";
  }

  function initAnfragen() {
    ["f-status", "f-bereich"].forEach(function (id) {
      $(id).addEventListener("change", function () { zeichneAnfragen(); zeichneAuswahl(); });
    });
    $("f-suche").addEventListener("input", zeichneAnfragen);
    $("anfragen-reload").addEventListener("click", ladeAnfragen);

    var liste = $("anfragen-liste");

    liste.addEventListener("click", function (ev) {
      var el = ev.target;
      if (el.hasAttribute && el.hasAttribute("data-status")) {
        var id = el.getAttribute("data-id");
        var neu = el.getAttribute("data-status");
        el.disabled = true;
        DB.anfrageAendern(id, { status: neu }).then(function () {
          alleAnfragen.forEach(function (a) { if (a.id === id) a.status = neu; });
          zeichneAnfragen();
          zeichneAuswahl();
        }).catch(function (err) {
          el.disabled = false;
          alert("Konnte nicht gespeichert werden: " + (err.message || ""));
        });
      }
      if (el.hasAttribute && el.hasAttribute("data-loeschen")) {
        var lid = el.getAttribute("data-loeschen");
        if (!confirm("Diese Anfrage endgültig löschen? Das lässt sich nicht rückgängig machen.")) return;
        el.disabled = true;
        DB.anfrageLoeschen(lid).then(function () {
          alleAnfragen = alleAnfragen.filter(function (a) { return a.id !== lid; });
          zeichneAnfragen();
          zeichneAuswahl();
        }).catch(function (err) {
          el.disabled = false;
          alert("Konnte nicht gelöscht werden: " + (err.message || ""));
        });
      }
    });

    // Notiz beim Verlassen des Feldes speichern
    liste.addEventListener("focusout", function (ev) {
      var el = ev.target;
      if (!el.hasAttribute || !el.hasAttribute("data-notiz")) return;
      var id = el.getAttribute("data-notiz");
      var wert = el.value;
      var vorher = null;
      alleAnfragen.forEach(function (a) { if (a.id === id) vorher = a.notiz || ""; });
      if (wert === vorher) return;
      DB.anfrageAendern(id, { notiz: wert }).then(function () {
        alleAnfragen.forEach(function (a) { if (a.id === id) a.notiz = wert; });
      }).catch(function (err) {
        alert("Notiz konnte nicht gespeichert werden: " + (err.message || ""));
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  ENTFERNUNGSMATRIX
  // ══════════════════════════════════════════════════════════════════

  // Liefert dur[i][j] in Sekunden und dist[i][j] in Kilometern für alle
  // Punktpaare. Eine einzige Netzanfrage – danach ist jedes Umsortieren
  // der Stopps sofort und ohne Internet neu berechenbar.
  function ladeMatrix(punkte) {
    var n = punkte.length;
    var schaetzung = luftlinienMatrix(punkte);
    if (!window.CONFIG.orsApiKey || n < 2 || n > 50) return Promise.resolve(schaetzung);

    return fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
      method: "POST",
      headers: {
        Authorization: window.CONFIG.orsApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        locations: punkte.map(function (p) { return [p.lon, p.lat]; }),
        metrics: ["duration", "distance"],
        units: "km"
      })
    }).then(function (r) {
      if (!r.ok) throw new Error("matrix " + r.status);
      return r.json();
    }).then(function (d) {
      if (!d.durations || !d.distances) throw new Error("matrix leer");
      // Unerreichbare Paare (null) mit der Schätzung auffüllen
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          if (typeof d.durations[i][j] !== "number") d.durations[i][j] = schaetzung.dur[i][j];
          if (typeof d.distances[i][j] !== "number") d.distances[i][j] = schaetzung.dist[i][j];
        }
      }
      return { dur: d.durations, dist: d.distances, geschaetzt: false };
    }).catch(function () {
      // Fehlerantworten von OpenRouteService kommen ohne CORS-Header und
      // landen hier als allgemeiner Fehler – bewusst still auf Schätzung ausweichen.
      return schaetzung;
    });
  }

  function luftlinienMatrix(punkte) {
    var n = punkte.length, dur = [], dist = [];
    for (var i = 0; i < n; i++) {
      dur.push([]); dist.push([]);
      for (var j = 0; j < n; j++) {
        var km = window.GausPreis.luftlinie(punkte[i], punkte[j]) * window.CONFIG.roadFactor;
        dist[i].push(km);
        dur[i].push(km / window.CONFIG.durchschnittstempoKmh * 3600);
      }
    }
    return { dur: dur, dist: dist, geschaetzt: true };
  }

  // ══════════════════════════════════════════════════════════════════
  //  ROUTENOPTIMIERUNG
  // ══════════════════════════════════════════════════════════════════

  // Bewertet eine Reihenfolge: Gesamtdauer, Fahrzeit, Strecke, Auslastung.
  // Gibt zusätzlich zurück, ob Kapazität oder Zeitgrenze verletzt sind.
  function bewerte(reihenfolge, ctx) {
    var fahrSek = 0, km = 0, dienstSek = 0;
    var last = ctx.startIdx;
    var ladung = 0, maxLadung = 0;
    var kapazitaetOk = true;
    var etappen = [];

    for (var i = 0; i < reihenfolge.length; i++) {
      var s = reihenfolge[i];
      var d = ctx.matrix.dur[last][s.pIdx];
      var k = ctx.matrix.dist[last][s.pIdx];
      fahrSek += d; km += k;
      dienstSek += s.dauerMin * 60;
      etappen.push({ dauer: d, km: k });
      last = s.pIdx;

      if (s.art === "abholung") ladung += s.volumen || 0;
      else if (s.art === "lieferung") ladung -= s.volumen || 0;
      if (ladung > maxLadung) maxLadung = ladung;
      if (ladung > ctx.kapazitaet + 1e-9) kapazitaetOk = false;
    }

    if (ctx.zielIdx !== null && ctx.zielIdx !== undefined) {
      var dz = ctx.matrix.dur[last][ctx.zielIdx];
      fahrSek += dz; km += ctx.matrix.dist[last][ctx.zielIdx];
      etappen.push({ dauer: dz, km: ctx.matrix.dist[last][ctx.zielIdx] });
    }

    // Gesetzliche Pause: nach je 4,5 Std. reiner Lenkzeit 45 Minuten
    var pausen = Math.floor(fahrSek / (window.CONFIG.pauseNachStunden * 3600));
    var pauseSek = pausen * window.CONFIG.pauseMinuten * 60;

    var gesamt = fahrSek + dienstSek + pauseSek;
    return {
      fahrSek: fahrSek, dienstSek: dienstSek, pauseSek: pauseSek, pausen: pausen,
      gesamtSek: gesamt, km: km, maxLadung: maxLadung, etappen: etappen,
      kapazitaetOk: kapazitaetOk,
      // Die Obergrenze gilt für die reine Fahrzeit am Steuer – Be- und
      // Entladen sowie die Pause kommen obendrauf und werden getrennt angezeigt.
      zeitOk: fahrSek <= ctx.maxSek + 1e-9
    };
  }

  function gueltig(reihenfolge, ctx) {
    var b = bewerte(reihenfolge, ctx);
    return b.kapazitaetOk && b.zeitOk;
  }

  // Günstigste Einfügung: Jede Sendung wird an der Stelle eingeplant, an
  // der sie am wenigsten Umweg verursacht – Abholung immer vor Lieferung.
  function planeRoute(sendungen, ctx) {
    var reihenfolge = [];
    var nichtEingeplant = [];

    // Große Sendungen zuerst – sie sind am schwersten unterzubringen.
    var sortiert = sendungen.slice().sort(function (a, b) {
      return (b.abholung.volumen || 0) - (a.abholung.volumen || 0);
    });

    sortiert.forEach(function (s) {
      var beste = null;
      for (var i = 0; i <= reihenfolge.length; i++) {
        for (var j = i; j <= reihenfolge.length; j++) {
          var kandidat = reihenfolge.slice();
          kandidat.splice(i, 0, s.abholung);
          kandidat.splice(j + 1, 0, s.lieferung);
          var b = bewerte(kandidat, ctx);
          if (!b.kapazitaetOk || !b.zeitOk) continue;
          if (!beste || b.gesamtSek < beste.wert) beste = { folge: kandidat, wert: b.gesamtSek };
        }
      }
      if (beste) reihenfolge = beste.folge;
      else nichtEingeplant.push(s);
    });

    return { reihenfolge: verbessere(reihenfolge, ctx), nichtEingeplant: nichtEingeplant };
  }

  // Nachbesserung: einzelne Stopps verschieben, solange es kürzer wird.
  function verbessere(reihenfolge, ctx) {
    var beste = reihenfolge.slice();
    var besterWert = bewerte(beste, ctx).gesamtSek;
    var verbessert = true;
    var runden = 0;

    while (verbessert && runden < 40) {
      verbessert = false;
      runden++;
      for (var i = 0; i < beste.length; i++) {
        for (var j = 0; j < beste.length; j++) {
          if (i === j) continue;
          var kandidat = beste.slice();
          var stopp = kandidat.splice(i, 1)[0];
          kandidat.splice(j, 0, stopp);
          if (!reihenfolgeErlaubt(kandidat)) continue;
          var b = bewerte(kandidat, ctx);
          if (!b.kapazitaetOk || !b.zeitOk) continue;
          if (b.gesamtSek < besterWert - 1) {
            beste = kandidat; besterWert = b.gesamtSek; verbessert = true;
          }
        }
      }
    }
    return beste;
  }

  // Abholung muss immer vor der zugehörigen Lieferung stehen.
  function reihenfolgeErlaubt(reihenfolge) {
    var gesehen = {};
    for (var i = 0; i < reihenfolge.length; i++) {
      var s = reihenfolge[i];
      if (s.art === "abholung") gesehen[s.paar] = true;
      else if (s.art === "lieferung" && !gesehen[s.paar]) return false;
    }
    return true;
  }

  // ══════════════════════════════════════════════════════════════════
  //  TOURENPLANER – AUSWAHL
  // ══════════════════════════════════════════════════════════════════

  function planbareAnfragen() {
    var richtung = $("planer-richtung").value;
    return alleAnfragen.filter(function (a) {
      if (a.bereich !== richtung) return false;
      if (a.status === "erledigt" || a.status === "abgelehnt") return false;
      return a.abhol_lat !== null && a.abhol_lat !== undefined &&
             a.liefer_lat !== null && a.liefer_lat !== undefined;
    });
  }

  function zeichneAuswahl() {
    var box = $("planer-auswahl");
    if (!box) return;
    var rows = planbareAnfragen();
    if (!rows.length) {
      box.innerHTML = '<p class="admin-leer">Keine offenen Anfragen in dieser Richtung.</p>';
      return;
    }
    // Bereits gesetzte Haken merken
    var gewaehlt = {};
    box.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
      gewaehlt[c.value] = true;
    });

    box.innerHTML = rows.map(function (a) {
      var vol = a.volumen_m3 ? fmtNum(Number(a.volumen_m3), 2) + " m³" : "–";
      return '<label class="auswahl-zeile">' +
        '<input type="checkbox" value="' + esc(a.id) + '"' + (gewaehlt[a.id] ? " checked" : "") + '>' +
        '<span class="az-text">' +
          '<strong>' + esc(a.name || "Ohne Namen") + '</strong> · ' + vol +
          (a.wunschtermin ? ' · Wunsch: ' + esc(a.wunschtermin) : "") +
          '<br><span class="ak-klein">' + esc(a.abhol_label || "") + ' → ' + esc(a.liefer_label || "") + '</span>' +
        '</span>' +
        '<span class="az-preis">' + (a.preis_eur ? fmtEur0(Number(a.preis_eur)) : "–") + '</span>' +
      '</label>';
    }).join("");
  }

  function gewaehlteAnfragen() {
    var ids = [];
    $("planer-auswahl").querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
      ids.push(c.value);
    });
    return alleAnfragen.filter(function (a) { return ids.indexOf(a.id) !== -1; });
  }

  // ══════════════════════════════════════════════════════════════════
  //  TOURENPLANER – BERECHNUNG
  // ══════════════════════════════════════════════════════════════════

  function ladezeitMin() {
    return window.CONFIG.ladezeitProStoppMin;
  }

  // Zusätzliche Zeit fürs Tragen über Etagen (grobe Schätzung: 3 Min. je
  // Etage, mit Aufzug ein Drittel).
  function etagenMin(etage, aufzug) {
    if (!etage) return 0;
    return Math.round(etage * 3 * (aufzug ? 0.33 : 1));
  }

  function berechneTour() {
    var btn = $("planer-berechnen");
    zeigeFehler("planer-error", "");
    var anfragen = gewaehlteAnfragen();
    if (!anfragen.length) {
      zeigeFehler("planer-error", "Bitte mindestens eine Anfrage auswählen.");
      return;
    }

    var richtung = $("planer-richtung").value;
    var start, ziel = null;
    if (richtung === "beiladung_rueck") {
      start = window.CONFIG.destination;          // Berlin
    } else {
      start = window.CONFIG.depot;                // Stuttgart
    }
    if (richtung === "sonderfahrt") ziel = window.CONFIG.depot;   // zurück zum Standort

    // Punkte und Stopps aufbauen
    var punkte = [{ lat: start.lat, lon: start.lon }];
    var startIdx = 0;
    var sendungen = anfragen.map(function (a, n) {
      var pi = punkte.push({ lat: a.abhol_lat, lon: a.abhol_lon }) - 1;
      var li = punkte.push({ lat: a.liefer_lat, lon: a.liefer_lon }) - 1;
      var vol = Number(a.volumen_m3) || 0;
      return {
        abholung: {
          art: "abholung", paar: n, pIdx: pi, anfrageId: a.id,
          label: a.abhol_label, lat: a.abhol_lat, lon: a.abhol_lon,
          etage: a.abhol_etage, aufzug: a.abhol_aufzug,
          name: a.name, telefon: a.telefon, volumen: vol,
          dauerMin: ladezeitMin() + etagenMin(a.abhol_etage, a.abhol_aufzug)
        },
        lieferung: {
          art: "lieferung", paar: n, pIdx: li, anfrageId: a.id,
          label: a.liefer_label, lat: a.liefer_lat, lon: a.liefer_lon,
          etage: a.liefer_etage, aufzug: a.liefer_aufzug,
          name: a.name, telefon: a.telefon, volumen: vol,
          dauerMin: ladezeitMin() + etagenMin(a.liefer_etage, a.liefer_aufzug)
        }
      };
    });

    var zielIdx = null;
    if (ziel) zielIdx = punkte.push({ lat: ziel.lat, lon: ziel.lon }) - 1;

    ladeStatus(btn, true);
    ladeMatrix(punkte).then(function (matrix) {
      var ctx = {
        matrix: matrix, startIdx: startIdx, zielIdx: zielIdx,
        kapazitaet: window.CONFIG.vanVolumeM3,
        maxSek: (parseFloat($("planer-maxstunden").value) || window.CONFIG.maxTourStunden) * 3600
      };
      var loesung = planeRoute(sendungen, ctx);

      aktuelleTour = {
        richtung: richtung,
        start: { art: "start", label: start.label, lat: start.lat, lon: start.lon, pIdx: startIdx, dauerMin: 0 },
        ziel: ziel ? { art: "ziel", label: ziel.label, lat: ziel.lat, lon: ziel.lon, pIdx: zielIdx, dauerMin: 0 } : null,
        stopps: loesung.reihenfolge,
        nichtEingeplant: loesung.nichtEingeplant,
        punkte: punkte,
        ctx: ctx,
        gespeichertId: null
      };

      if (!$("tour-name").value.trim()) {
        $("tour-name").value = (richtung === "beiladung_rueck" ? "Berlin → Stuttgart" :
                                richtung === "sonderfahrt" ? "Sonderfahrten" : "Stuttgart → Berlin") +
                               " " + ($("planer-datum").value || heuteIso());
      }
      $("tour-card").hidden = false;
      zeichneTour();
      $("tour-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (err) {
      zeigeFehler("planer-error", "Die Route konnte nicht berechnet werden: " + (err.message || ""));
    }).then(function () {
      ladeStatus(btn, false);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  TOURENPLANER – ANZEIGE UND BEARBEITUNG
  // ══════════════════════════════════════════════════════════════════

  function zeichneTour() {
    if (!aktuelleTour) return;
    var t = aktuelleTour;
    var b = bewerte(t.stopps, t.ctx);
    var startZeit = window.CONFIG.tourStartZeit;

    // ── Zusammenfassung ──
    var maxStd = (parseFloat($("planer-maxstunden").value) || window.CONFIG.maxTourStunden);
    $("tour-summary").innerHTML =
      '<div class="ts-kachel"><span class="ts-wert">' + fmtKm(b.km) + '</span><span class="ts-label">Strecke</span></div>' +
      '<div class="ts-kachel' + (b.fahrSek > maxStd * 3600 ? " ts-warn" : "") + '">' +
        '<span class="ts-wert">' + stunden(b.fahrSek) + '</span>' +
        '<span class="ts-label">Fahrzeit (Grenze ' + fmtNum(maxStd, 1) + ' Std.)</span></div>' +
      '<div class="ts-kachel"><span class="ts-wert">' + stunden(b.gesamtSek) + '</span>' +
        '<span class="ts-label">Gesamtdauer inkl. Laden + Pause</span></div>' +
      '<div class="ts-kachel' + (b.maxLadung > window.CONFIG.vanVolumeM3 ? " ts-warn" : "") + '">' +
        '<span class="ts-wert">' + fmtNum(b.maxLadung, 2) + ' m³</span>' +
        '<span class="ts-label">max. Auslastung von ' + fmtNum(window.CONFIG.vanVolumeM3, 1) + ' m³</span></div>';

    // ── Warnungen ──
    var warn = [];
    if (b.fahrSek > maxStd * 3600) {
      warn.push("Die Fahrzeit liegt mit " + stunden(b.fahrSek) + " über den eingestellten " +
                fmtNum(maxStd, 1) + " Stunden. Stopp entfernen oder auf zwei Tage aufteilen.");
    }
    if (!t.stopps.length) {
      warn.push("Es passt keine einzige Anfrage in diese Tour. Meist ist die Höchstfahrzeit zu " +
                "niedrig für die Strecke: Stuttgart–Berlin sind allein rund 6,5 Stunden am Steuer, " +
                "Abholungen und Zustellungen kommen obendrauf. Erhöhe die Höchstfahrzeit oder " +
                "plane die Tour auf zwei Tage.");
    }
    if (b.maxLadung > window.CONFIG.vanVolumeM3) {
      warn.push("Der Transporter ist an einer Stelle mit " + fmtNum(b.maxLadung, 2) +
                " m³ überladen (Kapazität " + fmtNum(window.CONFIG.vanVolumeM3, 1) + " m³).");
    }
    if (!reihenfolgeErlaubt(t.stopps)) {
      warn.push("Eine Lieferung steht vor der zugehörigen Abholung – bitte Reihenfolge korrigieren.");
    }
    if (t.ctx.matrix.geschaetzt) {
      warn.push("Entfernungen sind geschätzt (Luftlinie × " + window.CONFIG.roadFactor +
                "), weil die Routen-Schnittstelle nicht erreichbar war.");
    }
    if (t.nichtEingeplant && t.nichtEingeplant.length) {
      warn.push(t.nichtEingeplant.length + " Anfrage(n) passen nicht mehr in diese Tour: " +
                t.nichtEingeplant.map(function (s) {
                  return (s.abholung.name || "Ohne Namen") + " (" + fmtNum(s.abholung.volumen, 2) + " m³)";
                }).join(", ") + ". Sie bleiben offen und können in eine zweite Tour.");
    }
    $("tour-warnungen").innerHTML = warn.map(function (w) {
      return '<p class="tour-warnung">' + esc(w) + "</p>";
    }).join("");

    // ── Stoppliste ──
    var html = "";
    var offset = 0;
    var ladung = 0;

    html += stoppZeile({ art: "start", label: t.start.label }, null, {
      nummer: "Start", zeit: uhrzeit(startZeit, 0), ladung: 0, etappe: null, index: -1
    });

    for (var i = 0; i < t.stopps.length; i++) {
      var s = t.stopps[i];
      var etappe = b.etappen[i];
      offset += etappe.dauer;
      var ankunft = uhrzeit(startZeit, offset);
      offset += s.dauerMin * 60;
      if (s.art === "abholung") ladung += s.volumen || 0;
      else if (s.art === "lieferung") ladung -= s.volumen || 0;
      if (Math.abs(ladung) < 1e-9) ladung = 0;   // "-0,00 m³" vermeiden
      html += stoppZeile(s, etappe, {
        nummer: String(i + 1), zeit: ankunft, ladung: ladung, index: i, anzahl: t.stopps.length
      });
    }

    if (t.ziel) {
      var letzte = b.etappen[b.etappen.length - 1];
      offset += letzte.dauer;
      html += stoppZeile({ art: "ziel", label: t.ziel.label }, letzte, {
        nummer: "Ende", zeit: uhrzeit(startZeit, offset), ladung: ladung, index: -1
      });
    }

    $("tour-stopps").innerHTML = html;
  }

  var ART_NAME = {
    start: "Start", ziel: "Rückkehr", abholung: "Abholung", lieferung: "Lieferung", eigen: "Eigener Stopp"
  };

  function stoppZeile(s, etappe, meta) {
    var fest = meta.index < 0;
    var etappeText = etappe
      ? '<span class="st-etappe">+ ' + fmtKm(etappe.km) + " · " + stunden(etappe.dauer) + "</span>"
      : "";

    var details = [];
    if (s.etage !== null && s.etage !== undefined && s.art !== "start" && s.art !== "ziel") {
      details.push(s.etage === 0 ? "Erdgeschoss" : s.etage + ". Etage" + (s.aufzug ? " (Aufzug)" : " ohne Aufzug"));
    }
    if (s.volumen) details.push(fmtNum(s.volumen, 2) + " m³");
    if (s.dauerMin) details.push("ca. " + Math.round(s.dauerMin) + " Min. vor Ort");
    if (s.telefon) details.push('<a href="tel:' + esc(s.telefon) + '">' + esc(s.telefon) + "</a>");

    var knoepfe = fest ? "" :
      '<div class="st-knoepfe">' +
        '<button type="button" class="btn-mini" data-hoch="' + meta.index + '"' +
          (meta.index === 0 ? " disabled" : "") + ' aria-label="Nach oben">▲</button>' +
        '<button type="button" class="btn-mini" data-runter="' + meta.index + '"' +
          (meta.index === meta.anzahl - 1 ? " disabled" : "") + ' aria-label="Nach unten">▼</button>' +
        '<button type="button" class="btn-mini btn-mini-weg" data-weg="' + meta.index + '" ' +
          'aria-label="Stopp entfernen">✕</button>' +
      '</div>';

    return '<li class="stopp art-' + esc(s.art) + (fest ? " stopp-fest" : "") + '">' +
      '<span class="st-nummer">' + esc(meta.nummer) + "</span>" +
      '<div class="st-inhalt">' +
        '<p class="st-kopf"><span class="st-art">' + esc(ART_NAME[s.art] || s.art) + "</span>" +
          (s.name ? ' <span class="st-kunde">' + esc(s.name) + "</span>" : "") +
          '<span class="st-zeit">' + esc(meta.zeit) + "</span></p>" +
        '<p class="st-adresse">' + esc(s.label || "") + "</p>" +
        (details.length ? '<p class="st-details">' + details.join(" · ") + "</p>" : "") +
        '<p class="st-fuss">' + etappeText +
          (s.art !== "start" ? '<span class="st-ladung">an Bord: ' + fmtNum(meta.ladung, 2) + " m³</span>" : "") +
        "</p>" +
      "</div>" + knoepfe +
    "</li>";
  }

  function initTourBearbeitung() {
    $("tour-stopps").addEventListener("click", function (ev) {
      var el = ev.target;
      if (!el.hasAttribute || !aktuelleTour) return;
      var stopps = aktuelleTour.stopps;

      if (el.hasAttribute("data-hoch")) {
        var i = parseInt(el.getAttribute("data-hoch"), 10);
        if (i > 0) { var tmp = stopps[i - 1]; stopps[i - 1] = stopps[i]; stopps[i] = tmp; }
        zeichneTour();
      } else if (el.hasAttribute("data-runter")) {
        var j = parseInt(el.getAttribute("data-runter"), 10);
        if (j < stopps.length - 1) { var t2 = stopps[j + 1]; stopps[j + 1] = stopps[j]; stopps[j] = t2; }
        zeichneTour();
      } else if (el.hasAttribute("data-weg")) {
        var k = parseInt(el.getAttribute("data-weg"), 10);
        var weg = stopps[k];
        if (weg.art === "abholung" || weg.art === "lieferung") {
          if (!confirm("Diese Anfrage komplett aus der Tour nehmen? Abholung und Lieferung " +
                       "werden zusammen entfernt.")) return;
          aktuelleTour.stopps = stopps.filter(function (s) { return s.paar !== weg.paar; });
        } else {
          aktuelleTour.stopps = stopps.filter(function (s, idx) { return idx !== k; });
        }
        zeichneTour();
      }
    });

    $("tour-neu-optimieren").addEventListener("click", function () {
      if (!aktuelleTour) return;
      // Aus den aktuell enthaltenen Stopps wieder Sendungspaare bilden
      var paare = {};
      var eigene = [];
      aktuelleTour.stopps.forEach(function (s) {
        if (s.art === "abholung" || s.art === "lieferung") {
          paare[s.paar] = paare[s.paar] || {};
          paare[s.paar][s.art] = s;
        } else {
          eigene.push(s);
        }
      });
      var sendungen = Object.keys(paare).map(function (k) { return paare[k]; })
        .filter(function (p) { return p.abholung && p.lieferung; });

      aktuelleTour.ctx.maxSek =
        (parseFloat($("planer-maxstunden").value) || window.CONFIG.maxTourStunden) * 3600;
      var loesung = planeRoute(sendungen, aktuelleTour.ctx);
      // Eigene Stopps hinten anhängen – ihre Position bestimmt der Nutzer selbst
      aktuelleTour.stopps = loesung.reihenfolge.concat(eigene);
      aktuelleTour.nichtEingeplant = loesung.nichtEingeplant;
      zeichneTour();
    });

    // Eigenen Stopp einfügen
    var adresseInput = $("stopp-adresse");
    H.autocomplete(adresseInput, window.CONFIG.depot);

    $("stopp-add-btn").addEventListener("click", function () {
      zeigeFehler("stopp-error", "");
      if (!aktuelleTour) return;
      var text = adresseInput.value.trim();
      if (!text) { zeigeFehler("stopp-error", "Bitte eine Adresse eingeben."); return; }

      H.geocode(text, window.CONFIG.depot).then(function (ort) {
        if (!ort) { zeigeFehler("stopp-error", "Adresse nicht gefunden."); return; }
        // Punkt anhängen und Matrix um eine Zeile/Spalte erweitern
        aktuelleTour.punkte.push({ lat: ort.lat, lon: ort.lon });
        return ladeMatrix(aktuelleTour.punkte).then(function (matrix) {
          aktuelleTour.ctx.matrix = matrix;
          var neuerStopp = {
            art: "eigen",
            paar: "eigen-" + Date.now(),
            pIdx: aktuelleTour.punkte.length - 1,
            label: ($("stopp-name").value.trim() ? $("stopp-name").value.trim() + " – " : "") + ort.label,
            lat: ort.lat, lon: ort.lon,
            volumen: 0,
            dauerMin: parseInt($("stopp-dauer").value, 10) || 0
          };
          // An der Stelle einfügen, die den geringsten Umweg verursacht –
          // eine Tankpause landet so von selbst mitten auf der langen Strecke.
          var beste = null;
          for (var i = 0; i <= aktuelleTour.stopps.length; i++) {
            var kandidat = aktuelleTour.stopps.slice();
            kandidat.splice(i, 0, neuerStopp);
            var wert = bewerte(kandidat, aktuelleTour.ctx).gesamtSek;
            if (!beste || wert < beste.wert) beste = { folge: kandidat, wert: wert };
          }
          aktuelleTour.stopps = beste ? beste.folge : aktuelleTour.stopps.concat([neuerStopp]);
          adresseInput.value = "";
          $("stopp-name").value = "";
          zeichneTour();
        });
      }).catch(function (err) {
        zeigeFehler("stopp-error", "Adresse konnte nicht gesucht werden: " + (err.message || ""));
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  TOUREN SPEICHERN UND ANZEIGEN
  // ══════════════════════════════════════════════════════════════════

  function initTourSpeichern() {
    $("tour-speichern").addEventListener("click", function () {
      if (!aktuelleTour) return;
      var btn = $("tour-speichern");
      var b = bewerte(aktuelleTour.stopps, aktuelleTour.ctx);

      var tour = {
        name: $("tour-name").value.trim() || "Tour",
        datum: $("planer-datum").value || null,
        richtung: aktuelleTour.richtung === "beiladung_rueck" ? "rueck" : "hin",
        dauer_sek: Math.round(b.gesamtSek),
        distanz_km: Math.round(b.km * 10) / 10,
        notiz: $("tour-notiz").value.trim() || null,
        stopps: [aktuelleTour.start].concat(aktuelleTour.stopps)
                  .concat(aktuelleTour.ziel ? [aktuelleTour.ziel] : [])
                  .map(function (s) {
                    return {
                      art: s.art, label: s.label, lat: s.lat, lon: s.lon,
                      etage: s.etage === undefined ? null : s.etage,
                      aufzug: !!s.aufzug, name: s.name || null, telefon: s.telefon || null,
                      volumen: s.volumen || 0, dauerMin: s.dauerMin || 0,
                      anfrageId: s.anfrageId || null
                    };
                  })
      };
      if (aktuelleTour.gespeichertId) tour.id = aktuelleTour.gespeichertId;

      ladeStatus(btn, true);
      DB.tourSpeichern(tour).then(function (gespeichert) {
        aktuelleTour.gespeichertId = gespeichert.id || aktuelleTour.gespeichertId;
        $("tour-save-info").textContent = "Tour gespeichert.";
        // Enthaltene Anfragen auf "angenommen" setzen
        var ids = {};
        aktuelleTour.stopps.forEach(function (s) { if (s.anfrageId) ids[s.anfrageId] = true; });
        return Promise.all(Object.keys(ids).map(function (id) {
          return DB.anfrageAendern(id, { status: "angenommen" }).catch(function () {});
        }));
      }).then(function () {
        ladeAnfragen();
        ladeTouren();
      }).catch(function (err) {
        $("tour-save-info").textContent = "Konnte nicht gespeichert werden: " + (err.message || "");
      }).then(function () {
        ladeStatus(btn, false);
      });
    });
  }

  function ladeTouren() {
    var box = $("touren-liste");
    box.innerHTML = '<p class="admin-leer">Wird geladen …</p>';
    DB.tourenLaden().then(function (rows) {
      if (!rows || !rows.length) {
        box.innerHTML = '<p class="admin-leer">Noch keine Touren gespeichert.</p>';
        return;
      }
      box.innerHTML = rows.map(function (t) {
        var stopps = t.stopps || [];
        return '<article class="anfrage-karte">' +
          '<div class="ak-kopf"><div>' +
            '<p class="ak-titel">' + esc(t.name || "Tour") + "</p>" +
            '<p class="ak-zeit">' + esc(t.datum || datumDe(t.erstellt_am)) + " · " +
              stopps.length + " Stopps</p>" +
          "</div><div class=\"ak-rechts\">" +
            '<span class="ak-preis">' + fmtKm(Number(t.distanz_km) || 0) + "</span>" +
            '<span class="badge">' + esc(stunden(t.dauer_sek || 0)) + "</span>" +
          "</div></div>" +
          '<ol class="tour-kurz">' + stopps.map(function (s) {
            return "<li><strong>" + esc(ART_NAME[s.art] || s.art) + "</strong> " +
                   esc(s.label || "") + (s.name ? " · " + esc(s.name) : "") + "</li>";
          }).join("") + "</ol>" +
          (t.notiz ? '<p class="ak-klein">' + esc(t.notiz) + "</p>" : "") +
          '<div class="ak-aktionen">' +
            '<button type="button" class="btn-ghost btn-loeschen" data-tour-weg="' + esc(t.id) + '">Löschen</button>' +
          "</div>" +
        "</article>";
      }).join("");
    }).catch(function (err) {
      box.innerHTML = '<p class="admin-leer admin-fehler">Konnte nicht geladen werden: ' +
                      esc(err.message || "") + "</p>";
    });

    box.onclick = function (ev) {
      var el = ev.target;
      if (!el.hasAttribute || !el.hasAttribute("data-tour-weg")) return;
      if (!confirm("Diese Tour löschen?")) return;
      DB.tourLoeschen(el.getAttribute("data-tour-weg")).then(ladeTouren).catch(function (err) {
        alert("Konnte nicht gelöscht werden: " + (err.message || ""));
      });
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════════════

  document.addEventListener("DOMContentLoaded", function () {
    $("planer-maxstunden").value = window.CONFIG.maxTourStunden;
    $("planer-datum").value = heuteIso();

    initLogin();
    initAnfragen();
    initTourBearbeitung();
    initTourSpeichern();

    $("planer-richtung").addEventListener("change", zeichneAuswahl);
    $("planer-berechnen").addEventListener("click", berechneTour);
    $("touren-reload").addEventListener("click", ladeTouren);
    $("planer-alle").addEventListener("click", function () {
      $("planer-auswahl").querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = true; });
    });
    $("planer-keine").addEventListener("click", function () {
      $("planer-auswahl").querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    });

    if (/[?&]test=1/.test(location.search)) selbsttests();
  });

  // ══════════════════════════════════════════════════════════════════
  //  SELBSTTESTS  (admin.html?test=1)
  // ══════════════════════════════════════════════════════════════════

  function selbsttests() {
    var ergebnisse = [];
    function pruefe(name, bedingung) { ergebnisse.push({ name: name, ok: !!bedingung }); }

    // Testaufbau: Depot, zwei Sendungen auf einer Linie
    var punkte = [
      { lat: 48.0, lon: 9.0 },   // 0 Start
      { lat: 48.1, lon: 9.0 },   // 1 Abholung A
      { lat: 48.5, lon: 9.0 },   // 2 Lieferung A
      { lat: 48.2, lon: 9.0 },   // 3 Abholung B
      { lat: 48.4, lon: 9.0 }    // 4 Lieferung B
    ];
    var m = luftlinienMatrix(punkte);
    var ctx = { matrix: m, startIdx: 0, zielIdx: null, kapazitaet: 10, maxSek: 24 * 3600 };

    function stopp(art, paar, pIdx, vol) {
      return { art: art, paar: paar, pIdx: pIdx, volumen: vol, dauerMin: 0, label: art + paar };
    }
    var sendungen = [
      { abholung: stopp("abholung", 0, 1, 2), lieferung: stopp("lieferung", 0, 2, 2) },
      { abholung: stopp("abholung", 1, 3, 3), lieferung: stopp("lieferung", 1, 4, 3) }
    ];

    var loesung = planeRoute(sendungen, ctx);
    var folge = loesung.reihenfolge;

    pruefe("Alle vier Stopps sind eingeplant", folge.length === 4);
    pruefe("Keine Sendung bleibt liegen", loesung.nichtEingeplant.length === 0);
    pruefe("Abholung steht vor Lieferung", reihenfolgeErlaubt(folge));
    pruefe("Optimale Reihenfolge gefunden (A1,B1,B2,A2)",
      folge.map(function (s) { return s.pIdx; }).join(",") === "1,3,4,2");

    // Kapazität: zwei Sendungen à 6 m³ dürfen nicht gleichzeitig an Bord sein
    var gross = [
      { abholung: stopp("abholung", 0, 1, 6), lieferung: stopp("lieferung", 0, 2, 6) },
      { abholung: stopp("abholung", 1, 3, 6), lieferung: stopp("lieferung", 1, 4, 6) }
    ];
    var l2 = planeRoute(gross, ctx);
    var b2 = bewerte(l2.reihenfolge, ctx);
    pruefe("Kapazität 10 m³ wird nie überschritten", b2.maxLadung <= 10 + 1e-9);
    pruefe("Beide großen Sendungen passen nacheinander", l2.reihenfolge.length === 4);

    // Zeitgrenze: mit sehr knapper Grenze bleibt etwas liegen
    var engCtx = { matrix: m, startIdx: 0, zielIdx: null, kapazitaet: 10, maxSek: 60 };
    var l3 = planeRoute(sendungen, engCtx);
    pruefe("Zeitgrenze wird eingehalten", l3.nichtEingeplant.length > 0);

    // Reihenfolge-Prüfung erkennt Fehler
    pruefe("Falsche Reihenfolge wird erkannt",
      !reihenfolgeErlaubt([stopp("lieferung", 0, 2, 1), stopp("abholung", 0, 1, 1)]));

    // Pausenregel
    var lang = luftlinienMatrix([{ lat: 48.0, lon: 9.0 }, { lat: 52.5, lon: 13.4 }]);
    var langCtx = { matrix: lang, startIdx: 0, zielIdx: null, kapazitaet: 10, maxSek: 24 * 3600 };
    var bLang = bewerte([{ art: "lieferung", paar: 0, pIdx: 1, volumen: 0, dauerMin: 0 }], langCtx);
    pruefe("Pflichtpause wird eingerechnet", bLang.pausen >= 1 && bLang.pauseSek > 0);
    pruefe("Gesamtdauer = Fahrzeit + Dienst + Pause",
      Math.abs(bLang.gesamtSek - (bLang.fahrSek + bLang.dienstSek + bLang.pauseSek)) < 1e-6);

    // Zeitanzeige
    pruefe("Uhrzeit 07:00 + 90 Min. = 08:30", uhrzeit("07:00", 90 * 60) === "08:30");
    pruefe("Tagwechsel wird angezeigt", uhrzeit("07:00", 20 * 3600).indexOf("+1 Tag") !== -1);

    var fehler = ergebnisse.filter(function (r) { return !r.ok; });
    var box = document.createElement("div");
    box.className = "selbsttest " + (fehler.length ? "selbsttest-fehler" : "selbsttest-ok");
    box.innerHTML = "<strong>" + (fehler.length ? fehler.length + " von " + ergebnisse.length +
      " Tests fehlgeschlagen" : ergebnisse.length + "/" + ergebnisse.length + " Tests bestanden") +
      "</strong><ul>" + ergebnisse.map(function (r) {
        return "<li>" + (r.ok ? "✓" : "✗") + " " + esc(r.name) + "</li>";
      }).join("") + "</ul>";
    document.body.insertBefore(box, document.body.firstChild);
  }

})();
