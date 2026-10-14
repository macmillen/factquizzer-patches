# YouTube FactQuizzer AI – Geopolitik & Wirtschaft

Eine leistungsstarke Google Chrome Extension (Manifest V3), die nach dem Anschauen von YouTube-Videos (insbesondere aus den Bereichen **Geopolitik, Wirtschaft, Geschichte und Weltgeschehen**) automatisch ein interaktives Quiz generiert.

So vergisst du Fakten, Zahlen, Handelsrouten und strategische Zusammenhänge nie wieder!

---

## 🌟 Hauptfunktionen

1. **Automatisches Quizfenster nach Videoende**:
   - Sobald das YouTube-Video zu Ende läuft (oder bei 99% Playback), pausiert die Extension das Video und öffnet automatisch das Quiz-Overlay, damit YouTube Autoplay nicht zum nächsten Video weiterspringt.
   - Alternativ kann das Quiz jederzeit über den **🧠 Fakten-Quiz**-Button direkt im YouTube-Player oder unter dem Video gestartet werden.

2. **Zwei durchdachte Quiz-Modi**:
   - **Modus 1: Multiple Choice (Schnelltest)**:
     - 4 Antwortoptionen pro Frage.
     - Sofortiges visuelles Feedback (Grün/Rot).
     - Zu jeder Frage eine didaktische Erklärung sowie ein prägnanter **Kernfakt zum Merken**.
   - **Modus 2: Stichwörter & Freitext (Vertiefung)**:
     - Anspruchsvollere Fragen, bei denen man genauer antworten muss.
     - Du gibst eigene Stichworte, Prozentzahlen oder Sätze ein.
     - **Automatische Stichwort-Prüfung** + **Semantische KI-Prüfung via Gemini** mit Score (0–100%) und Feedback.
     - Vollständige Musterlösung zum Vergleichen.

3. **Intelligente Faktengewichtung nach Wichtigkeit & Detailgrad**:
   - **🔥 Kernfakten (Wichtigste zuerst)**: Primäre geopolitische Konfliktursachen, zentrale Handelsdaten, Hauptakteure.
   - **📈 Vertiefung**: Erweiterte Mechanismen, sekundäre Ursachen und historische Hintergründe.
   - **🔍 Experten-Details & Zahlen**: Genaue Quoten, Verträge, Tonnen/Barrel-Zahlen und tiefergehende Fachdetails für intensives Lernen.
   - Filter-Pills im Quiz ermöglichen es, jederzeit zwischen Kernwissen und Experten-Details zu wechseln.

4. **Umfassendes Fakten-Dossier**:
   - Neben den Fragen extrahiert die Gemini KI ein komplettes Faktenblatt mit Kategorisierung (*Geopolitik*, *Wirtschaft*, *Strategie*, *Historie*), das du nach dem Quiz oder jederzeit zum Wiederholen studieren kannst.

5. **Lernfortschritt & Statistiken**:
   - Speicherung deiner gelösten Quizzes, deiner durchschnittlichen Erfolgsquote und deiner Historie direkt in der Erweiterung.

6. **Gemini AI Integration**:
   - Nutzt die moderne **Gemini 3 Flash** API für blitzschnelle Generierung (unter 3 Sekunden).
   - Dein API-Key ist bereits hinterlegt und kann in den Optionen angepasst oder getestet werden.

---

## 🚀 Installation in Google Chrome (Schritt-für-Schritt)

1. Öffne Google Chrome und gib in die Adresszeile ein:
   ```
   chrome://extensions/
   ```
2. Aktiviere oben rechts den Schalter **Entwicklermodus** (Developer mode).
3. Klicke oben links auf den Button **Entpackte Erweiterung laden** (Load unpacked).
4. Wähle den Projektordner aus:
   ```
   /home/milan/Projects/youtube-quizzer
   ```
5. Die Erweiterung **YouTube FactQuizzer AI – Geopolitik & Wirtschaft** erscheint nun in deiner Erweiterungsliste!
6. Pinne das Icon 🧠 oben an die Chrome-Symbolleiste für schnellen Zugriff.

---

## ⚙️ Einstellungen & API-Key

- Klicke auf das FactQuizzer-Icon in der Chrome-Symbolleiste und wähle **Einstellungen** (oder gehe über `chrome://extensions` ➔ Details ➔ Erweiterungsoptionen).
- **Gemini API Key**: Dein Schlüssel ist bereits vorinstalliert:
  `DEIN_GEMINI_API_KEY`
- Klicke auf **⚡ API-Verbindung testen**, um die Funktionsfähigkeit zu verifizieren.
- Hier kannst du auch das automatische Öffnen anpassen oder den Cache leeren.

---

## 🛠️ Technische Architektur (Manifest V3)

- **`manifest.json`**: Manifest V3 Spezifikation mit `storage`, `activeTab` und YouTube Host-Berechtigungen.
- **`background.js`**: Service Worker zur Kommunikation mit der Gemini API (verhindert Content Security Policy Konflikte auf YouTube) und lokales Caching.
- **`page-bridge.js`**: Läuft in der YouTube `MAIN`-World und extrahiert Untertitelspuren (`captionTracks`) und Player-Zustände aus `ytInitialPlayerResponse`.
- **`content.js` & `content.css`**: Detektiert das Videoende, injiziert native YouTube-Buttons und rendert das moderne Dark-Glassmorphism Quiz-Overlay.
- **`popup.html` & `options.html`**: Benutzeroberflächen für Statistiken, Cache-Management und Konfiguration.

---

## 📱 Android & YouTube ReVanced Nutzung (Option A)

FactQuizzer unterstützt Android über eine moderne **PWA (Progressive Web App)** mit nativer **Web Share Target** Integration!

### So nutzt du FactQuizzer mit YouTube ReVanced:

1. **Server starten oder PWA aufrufen**:
   - Starte den lokalen Server auf deinem Rechner:
     ```bash
     python3 server.py
     ```
   - Die Konsole zeigt dir die lokale IP-Adresse deines PCs an (z.B. `http://192.168.1.100:8080/pwa/`).
   *(Alternativ kann der Ordner `pwa/` auf jedem kostenlosen Hosting wie GitHub Pages, Vercel oder Cloudflare Pages gehostet werden)*.

2. **Auf dem Android-Handy installieren**:
   - Öffne die URL auf deinem Android-Handy in Chrome oder Brave.
   - Tippe oben rechts auf das Dreipunkt-Menü ➔ **"App installieren"** oder **"Zum Startbildschirm hinzufügen"** (oder tippe direkt auf den Button *📲 Installieren* in der App).
   - Android registriert FactQuizzer damit im systemweiten Android-Teilen-Menü!

3. **In ReVanced nutzen**:
   - Schau wie gewohnt dein Video in der **YouTube ReVanced** App.
   - Wenn du fertig bist, tippe unter dem Video einfach auf **Teilen (Share)**.
   - Wähle **FactQuizzer** aus der Liste der Apps aus.
   - FactQuizzer öffnet sich sofort im Vollbild, extrahiert die Kernaussagen und startet dein Quiz mit Multiple Choice, Stichwort-Modus und Fakten-Dossier!

---

## 🔒 Datenschutz & Sicherheit
- Alle Daten und dein API-Schlüssel werden **ausschließlich lokal** in deiner Chrome-Instanz bzw. im Browser (`localStorage` / `chrome.storage.local`) gespeichert.
- Keine Weitergabe an Drittserver außer direkt an die offizielle Google Gemini API Schnittstelle.

