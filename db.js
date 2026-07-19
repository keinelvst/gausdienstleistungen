/* ════════════════════════════════════════════════════════════════════
   Gaus Dienstleistungen – Datenbank-Anbindung (Supabase)
   ────────────────────────────────────────────────────────────────────
   Schlanker Zugriff über die normale Web-Schnittstelle von Supabase –
   ohne zusätzliche Bibliothek, damit die Seite überall läuft.

   Solange in CONFIG kein supabaseUrl/supabaseAnonKey eingetragen ist,
   läuft alles im ÜBUNGSMODUS: Die Daten werden nur im Browser des
   jeweiligen Geräts gespeichert (localStorage). So lässt sich der
   Adminbereich schon vor der Einrichtung der Datenbank ausprobieren.

   Einrichtung: siehe SUPABASE-EINRICHTUNG.md
   ════════════════════════════════════════════════════════════════════ */

window.GausDB = (function () {
  "use strict";

  var SESSION_KEY = "gaus_admin_session";
  var DEMO_ANFRAGEN = "gaus_demo_anfragen";
  var DEMO_TOUREN = "gaus_demo_touren";

  function cfg(name) {
    return (window.CONFIG && window.CONFIG[name]) || "";
  }
  function url() { return String(cfg("supabaseUrl")).replace(/\/+$/, ""); }
  function anonKey() { return String(cfg("supabaseAnonKey")); }

  // Ist eine echte Datenbank hinterlegt?
  function configured() {
    return /^https:\/\/.+\.supabase\.co$/.test(url()) && anonKey().length > 20;
  }

  // ── Sitzung (Admin-Login) ───────────────────────────────────────────
  var session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { session = null; }

  function storeSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* privater Modus: Sitzung gilt dann nur für diesen Tab */ }
  }

  function loggedIn() {
    return !configured() ? true : !!(session && session.access_token);
  }
  function userEmail() {
    return session && session.user ? session.user.email : "Übungsmodus";
  }

  function authFetch(path, options) {
    return fetch(url() + path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var msg = body.error_description || body.msg || body.message || body.error ||
                    ("Fehler " + res.status);
          throw new Error(msg);
        }
        return body;
      });
    });
  }

  function signIn(email, password) {
    if (!configured()) return Promise.resolve({ demo: true });
    return authFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: anonKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (body) {
      storeSession(body);
      return body;
    }).catch(function (err) {
      // Supabase antwortet auf falsche Zugangsdaten mit einer englischen Meldung
      if (/invalid login|invalid grant/i.test(err.message)) {
        throw new Error("E-Mail oder Passwort ist falsch.");
      }
      if (/email not confirmed/i.test(err.message)) {
        throw new Error("Der Benutzer ist noch nicht bestätigt. In Supabase unter " +
                        "Authentication → Users den Haken „Auto Confirm User“ setzen.");
      }
      throw err;
    });
  }

  function refresh() {
    if (!session || !session.refresh_token) return Promise.reject(new Error("Keine Sitzung"));
    return authFetch("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: anonKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }).then(function (body) { storeSession(body); return body; });
  }

  function signOut() {
    storeSession(null);
    return Promise.resolve();
  }

  // ── Datenzugriff (PostgREST) ────────────────────────────────────────
  // token: "anon" für das Anlegen von Anfragen durch Kunden,
  //        sonst das Login-Token des Admins.
  function rest(path, options, useAnon) {
    var o = options || {};
    var token = useAnon ? anonKey() : (session && session.access_token) || anonKey();
    var headers = {
      apikey: anonKey(),
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    };
    if (o.prefer) headers.Prefer = o.prefer;

    return fetch(url() + "/rest/v1" + path, {
      method: o.method || "GET",
      headers: headers,
      body: o.body ? JSON.stringify(o.body) : undefined,
      keepalive: !!o.keepalive
    }).then(function (res) {
      if (res.status === 401 && !useAnon && session && session.refresh_token) {
        // Token abgelaufen – einmal erneuern und wiederholen
        return refresh().then(function () { return rest(path, o, useAnon); });
      }
      return res.text().then(function (text) {
        var body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
        if (!res.ok) {
          var msg = (body && (body.message || body.hint || body.error)) || ("Fehler " + res.status);
          if (res.status === 401 || res.status === 403) {
            msg = "Kein Zugriff – bitte neu anmelden.";
          }
          throw new Error(msg);
        }
        return body;
      });
    });
  }

  // ── Übungsmodus: Speicher im Browser ────────────────────────────────
  function demoRead(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; }
  }
  function demoWrite(key, rows) {
    try { localStorage.setItem(key, JSON.stringify(rows)); } catch (e) { /* voll */ }
  }
  function demoId() {
    return "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ── Öffentliche Funktionen ──────────────────────────────────────────

  // Wird von der Website aufgerufen, wenn ein Kunde anfragt.
  // Läuft absichtlich „still“: Ein Fehler darf den Kunden nie stören.
  function anfrageAnlegen(row) {
    if (!configured()) {
      var rows = demoRead(DEMO_ANFRAGEN);
      row.id = demoId();
      row.erstellt_am = new Date().toISOString();
      row.status = row.status || "neu";
      rows.push(row);
      demoWrite(DEMO_ANFRAGEN, rows);
      return Promise.resolve(row);
    }
    return rest("/anfragen", {
      method: "POST",
      body: row,
      prefer: "return=minimal",
      keepalive: true          // Anfrage läuft weiter, auch wenn WhatsApp öffnet
    }, true);
  }

  function anfragenLaden() {
    if (!configured()) {
      var rows = demoRead(DEMO_ANFRAGEN);
      rows.sort(function (a, b) { return (b.erstellt_am || "").localeCompare(a.erstellt_am || ""); });
      return Promise.resolve(rows);
    }
    return rest("/anfragen?select=*&order=erstellt_am.desc&limit=500");
  }

  function anfrageAendern(id, patch) {
    if (!configured()) {
      var rows = demoRead(DEMO_ANFRAGEN);
      rows.forEach(function (r) { if (r.id === id) Object.assign(r, patch); });
      demoWrite(DEMO_ANFRAGEN, rows);
      return Promise.resolve();
    }
    return rest("/anfragen?id=eq." + encodeURIComponent(id),
                { method: "PATCH", body: patch, prefer: "return=minimal" });
  }

  function anfrageLoeschen(id) {
    if (!configured()) {
      demoWrite(DEMO_ANFRAGEN, demoRead(DEMO_ANFRAGEN).filter(function (r) { return r.id !== id; }));
      return Promise.resolve();
    }
    return rest("/anfragen?id=eq." + encodeURIComponent(id),
                { method: "DELETE", prefer: "return=minimal" });
  }

  function tourenLaden() {
    if (!configured()) {
      var rows = demoRead(DEMO_TOUREN);
      rows.sort(function (a, b) { return (b.erstellt_am || "").localeCompare(a.erstellt_am || ""); });
      return Promise.resolve(rows);
    }
    return rest("/touren?select=*&order=erstellt_am.desc&limit=200");
  }

  function tourSpeichern(tour) {
    if (!configured()) {
      var rows = demoRead(DEMO_TOUREN);
      if (tour.id) {
        rows.forEach(function (r) { if (r.id === tour.id) Object.assign(r, tour); });
      } else {
        tour.id = demoId();
        tour.erstellt_am = new Date().toISOString();
        rows.push(tour);
      }
      demoWrite(DEMO_TOUREN, rows);
      return Promise.resolve(tour);
    }
    if (tour.id) {
      var id = tour.id;
      var patch = Object.assign({}, tour);
      delete patch.id; delete patch.erstellt_am;
      return rest("/touren?id=eq." + encodeURIComponent(id),
                  { method: "PATCH", body: patch, prefer: "return=minimal" })
             .then(function () { return tour; });
    }
    return rest("/touren", { method: "POST", body: tour, prefer: "return=representation" })
           .then(function (r) { return (r && r[0]) || tour; });
  }

  function tourLoeschen(id) {
    if (!configured()) {
      demoWrite(DEMO_TOUREN, demoRead(DEMO_TOUREN).filter(function (r) { return r.id !== id; }));
      return Promise.resolve();
    }
    return rest("/touren?id=eq." + encodeURIComponent(id),
                { method: "DELETE", prefer: "return=minimal" });
  }

  return {
    configured: configured,
    loggedIn: loggedIn,
    userEmail: userEmail,
    signIn: signIn,
    signOut: signOut,
    anfrageAnlegen: anfrageAnlegen,
    anfragenLaden: anfragenLaden,
    anfrageAendern: anfrageAendern,
    anfrageLoeschen: anfrageLoeschen,
    tourenLaden: tourenLaden,
    tourSpeichern: tourSpeichern,
    tourLoeschen: tourLoeschen
  };
})();
