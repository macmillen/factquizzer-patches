// background.js - Service Worker for YouTube FactQuizzer AI
const DEFAULT_API_KEY = "";
const DEFAULT_MODEL = "gemini-3-flash-preview";

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get(['apiKey', 'model', 'autoOpenOnEnd', 'defaultMode']);
  const updates = {};
  if (!current.apiKey) updates.apiKey = DEFAULT_API_KEY;
  if (!current.model) updates.model = DEFAULT_MODEL;
  if (current.autoOpenOnEnd === undefined) updates.autoOpenOnEnd = true;
  if (!current.defaultMode) updates.defaultMode = 'multiple_choice';
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
});

// Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_TRANSCRIPT') {
    fetchTranscript(message.url)
      .then(text => sendResponse({ success: true, text }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GENERATE_QUIZ') {
    generateQuizWithGemini(message.payload)
      .then(quiz => sendResponse({ success: true, quiz }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'EVALUATE_OPEN_ANSWER') {
    evaluateOpenAnswerWithGemini(message.payload)
      .then(evalResult => sendResponse({ success: true, result: evalResult }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    getSettings().then(settings => sendResponse({ success: true, settings }));
    return true;
  }

  if (message.type === 'SAVE_QUIZ_RESULT') {
    saveQuizResult(message.result)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
});

async function getSettings() {
  const data = await chrome.storage.local.get([
    'apiKey', 'model', 'autoOpenOnEnd', 'defaultMode'
  ]);
  return {
    apiKey: data.apiKey || DEFAULT_API_KEY,
    model: data.model || DEFAULT_MODEL,
    autoOpenOnEnd: data.autoOpenOnEnd !== undefined ? data.autoOpenOnEnd : true,
    defaultMode: data.defaultMode || 'multiple_choice'
  };
}

// Fetch and decode captions from YouTube timedtext endpoint
async function fetchTranscript(captionUrl) {
  if (!captionUrl) throw new Error("Keine Untertitel-URL vorhanden.");

  // Request json3 format first, fall back to xml
  let url = captionUrl;
  if (!url.includes('fmt=')) {
    url += '&fmt=json3';
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fehler beim Laden der Untertitel (Status ${response.status})`);
  }

  const text = await response.text();

  // Try parsing as JSON3
  try {
    const json = JSON.parse(text);
    if (json.events && Array.isArray(json.events)) {
      const parts = [];
      for (const ev of json.events) {
        if (ev.segs && Array.isArray(ev.segs)) {
          const segText = ev.segs.map(s => s.utf8 || '').join('').trim();
          if (segText && segText !== '\n') {
            parts.push(segText);
          }
        }
      }
      if (parts.length > 0) {
        return parts.join(' ').replace(/\s+/g, ' ');
      }
    }
  } catch (e) {
    // Not json, parse as XML
  }

  // XML regex extraction
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let match;
  const xmlParts = [];
  while ((match = regex.exec(text)) !== null) {
    let clean = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (clean) xmlParts.push(clean);
  }

  if (xmlParts.length > 0) {
    return xmlParts.join(' ').replace(/\s+/g, ' ');
  }

  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Generate Quiz using Gemini
async function generateQuizWithGemini({ videoId, title, author, transcript, description, forceRefresh }) {
  const cacheKey = `quiz_${videoId}`;

  if (!forceRefresh) {
    const cached = await chrome.storage.local.get([cacheKey]);
    if (cached[cacheKey]) {
      console.log(`[FactQuizzer] Returning cached quiz for video ${videoId}`);
      return cached[cacheKey];
    }
  }

  const settings = await getSettings();
  const apiKey = settings.apiKey;
  const model = settings.model;

  if (!apiKey) {
    throw new Error("Kein Gemini API-Schlüssel hinterlegt. Bitte in den Einstellungen eintragen.");
  }

  // Prepare input content
  const prompt = `Du bist ein hochkarätiger geopolitischer und wirtschaftlicher Analyst, Quiz-Master und Dozent.
Der Nutzer schaut Videos über Geopolitik, Wirtschaft, Weltgeschehen, Geschichte und strategische Entwicklungen.
Er möchte Fakten, Zahlen, Ursachen, Akteure und Zusammenhänge aus dem Video lernen und behalten.

Analysiere das folgende Video und erstelle ein strukturiertes, anspruchsvolles und lehrreiches Quiz.

VIDEO-TITEL: ${title}
KANAL / AUTOR: ${author}
BESCHREIBUNG / BESCHREIBUNGSTEXT:
${(description || '').slice(0, 1500)}

TRANSKRIPT / INHALT:
${(transcript || '').slice(0, 80000)}

ANFORDERUNGEN AN DAS QUIZ:
1. Extrahiere so viele handfeste Fakten wie möglich (Akteure, Daten, wirtschaftliche Kennzahlen, Verträge, geopolitische Brennpunkte, Handelsrouten, strategische Ursachen und Folgen).
2. Gewichte alle Fragen nach WICHTIGKEIT und DETAILGRAD:
   - "high" / "core": Die wichtigsten Kernfakten & Kernaussagen des Videos (z.B. primäre Konfliktursachen, zentrale Handelsdaten, Hauptakteure).
   - "medium" / "advanced": Erweiterte Zusammenhänge, sekundäre Mechanismen und Hintergründe.
   - "deep" / "expert": Spezifische Zahlen, Detailfakten, Zitate oder genaue historische Vergleiche für Nutzer, die tiefer lernen wollen.
3. SORTIERUNG: Die wichtigen Multiple-Choice-Fragen ("high" / "core") MÜSSEN zuerst in der Liste stehen!
4. MODI:
   - Modus 1: "multiple_choice": 4 plausible Optionen, genau 1 richtige Antwort, klare und lehrreiche Erklärung mit Angabe des gelernten Fakts ("fact_summary"). Erstelle mindestens 6-10 Multiple-Choice-Fragen (davon 4-5 Kernfragen "high", 3-4 "medium" und 2-3 "deep").
   - Modus 2: "open_ended" (Stichwörter / Freitext): Schwierigere Fragen, bei denen man genauer antworten muss. Gib eine präzise Frage vor, eine Liste von erwarteten Schlüsselwörtern/Stichwörtern ("keywords"), eine ausführliche Musterlösung ("model_answer") und eine didaktische Erklärung. Erstelle mindestens 4-6 offene Fragen (gestaffelt nach Wichtigkeit).
5. Erstelle zudem eine Liste aller "key_facts" (kurze Faktenliste zum Nachlesen und Wiederholen).

GIB DEINE ANTWORT AUSSCHLIESSLICH ALS VALIDES JSON IM FOLGENDEN SCHEMA ZURÜCK:
{
  "video_summary": "Kurze 2-3 Satz Zusammenfassung der Kernaussagen des Videos.",
  "key_facts": [
    {
      "fact": "Konkreter Fakt aus dem Video mit Zahlen/Namen",
      "importance": "high" | "medium" | "deep",
      "category": "Geopolitik" | "Wirtschaft" | "Strategie" | "Historie"
    }
  ],
  "multiple_choice": [
    {
      "id": "mc_1",
      "question": "Präzise Frage...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "importance": "high" | "medium" | "deep",
      "detail_level": "core" | "advanced" | "expert",
      "explanation": "Warum diese Antwort stimmt und was der Kontext ist.",
      "fact_summary": "Der Kernfakt in 1 Satz zur Festigung."
    }
  ],
  "open_ended": [
    {
      "id": "open_1",
      "question": "Präzise, anspruchsvolle Frage...",
      "keywords": ["Stichwort 1", "Stichwort 2", "Stichwort 3"],
      "model_answer": "Die vollständige, präzise Musterantwort...",
      "importance": "high" | "medium" | "deep",
      "detail_level": "core" | "advanced" | "expert",
      "explanation": "Didaktischer Kontext und Hintergründe."
    }
  ]
}
Antworte vollständig auf Deutsch und halte dich strikt an das JSON-Format ohne Markdown-Ticks außerhalb des JSON.`;

  const candidateModels = Array.from(new Set([
    model,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash'
  ]));

  let result = null;
  let lastError = null;

  for (const candidateModel of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = `Gemini API Fehler (${response.status})`;
        try {
          const parsedErr = JSON.parse(errBody);
          if (parsedErr.error && parsedErr.error.message) {
            message = parsedErr.error.message;
          }
        } catch (e) {}
        lastError = new Error(message);
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          continue;
        }
        throw lastError;
      }

      result = await response.json();
      if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!result) {
    throw lastError || new Error("Gemini API nicht erreichbar.");
  }

  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error("Leere Antwort von der Gemini API erhalten.");
  }

  let quizData;
  try {
    quizData = JSON.parse(textOutput);
  } catch (parseErr) {
    // If enclosed in markdown fences
    const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    quizData = JSON.parse(cleaned);
  }

  // Ensure sorting: high importance first
  const importanceOrder = { high: 1, medium: 2, deep: 3 };
  if (Array.isArray(quizData.multiple_choice)) {
    quizData.multiple_choice.sort((a, b) => {
      const ordA = importanceOrder[a.importance] || 2;
      const ordB = importanceOrder[b.importance] || 2;
      return ordA - ordB;
    });
  }

  if (Array.isArray(quizData.open_ended)) {
    quizData.open_ended.sort((a, b) => {
      const ordA = importanceOrder[a.importance] || 2;
      const ordB = importanceOrder[b.importance] || 2;
      return ordA - ordB;
    });
  }

  quizData.videoId = videoId;
  quizData.videoTitle = title;
  quizData.createdAt = Date.now();

  // Save to cache
  await chrome.storage.local.set({ [cacheKey]: quizData });

  return quizData;
}

// Evaluate user's free text / keyword answer with Gemini
async function evaluateOpenAnswerWithGemini({ question, userAnswer, keywords, modelAnswer }) {
  const settings = await getSettings();
  const apiKey = settings.apiKey;
  const model = settings.model;

  const prompt = `Du bewertest die Freitext-Antwort eines Nutzers zu einer geopolitischen oder wirtschaftlichen Frage.

FRAGE: ${question}
ERWARTETE SCHLÜSSELBEGRIFFE: ${JSON.stringify(keywords)}
MUSTERLÖSUNG: ${modelAnswer}

ANTWORT DES NUTZERS:
"${userAnswer}"

Bewerte die Antwort:
1. Wie viel Prozent der wesentlichen Fakten und Argumente wurden genannt (Score 0 bis 100)?
2. Welche der Schlüsselbegriffe oder deren Synonyme/Bedeutung wurden abgedeckt?
3. Welche wichtigen Punkte wurden vergessen?
4. Ein kurzes, prägnantes und motivierendes Feedback auf Deutsch (2-3 Sätze).

GIB DEINE ANTWORT ALS VALIDES JSON ZURÜCK:
{
  "score": 85,
  "covered_keywords": ["..."],
  "missing_keywords": ["..."],
  "feedback": "Sehr gut zusammengefasst! Du hast ... präzise genannt. Vergessen hast du lediglich ...",
  "is_passed": true
}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    // Fallback heuristic evaluation if API fails
    return heuristicEvaluation(userAnswer, keywords, modelAnswer);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    return JSON.parse(textOutput);
  } catch (e) {
    const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

function heuristicEvaluation(userAnswer, keywords, modelAnswer) {
  const lower = (userAnswer || '').toLowerCase();
  const covered = [];
  const missing = [];

  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      covered.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const ratio = keywords.length > 0 ? (covered.length / keywords.length) : 0.5;
  const score = Math.round(ratio * 100);

  return {
    score,
    covered_keywords: covered,
    missing_keywords: missing,
    feedback: score >= 70
      ? `Gute Antwort! Du hast ${covered.length} von ${keywords.length} Schlüsselwörtern treffend erwähnt.`
      : `Du hast ${covered.length} von ${keywords.length} Kernbegriffen genannt. Sieh dir die Musterlösung für Details an.`,
    is_passed: score >= 60
  };
}

async function saveQuizResult(result) {
  const data = await chrome.storage.local.get(['quizHistory']);
  const history = data.quizHistory || [];
  history.unshift({
    ...result,
    timestamp: Date.now()
  });
  // Keep last 50
  if (history.length > 50) history.pop();
  await chrome.storage.local.set({ quizHistory: history });
}
