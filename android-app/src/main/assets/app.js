// pwa/app.js - FactQuizzer Android PWA Application Logic
(function() {
  'use strict';

  const DEFAULT_API_KEY = "";
  const DEFAULT_MODEL = "gemini-3-flash-preview";

  let deferredPrompt = null;
  let currentVideoId = null;
  let currentQuizData = null;
  let currentMode = 'multiple_choice'; // 'multiple_choice' | 'open_ended' | 'facts'
  let currentFilter = 'core'; // 'core' | 'advanced' | 'expert' | 'all'
  let currentQuestionIndex = 0;
  let mcAnswers = {};
  let openAnswers = {};

  // DOM Elements
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const testKeyBtn = document.getElementById('test-key-btn');
  const testKeyStatus = document.getElementById('test-key-status');
  const settingApiKey = document.getElementById('setting-api-key');
  const settingModel = document.getElementById('setting-model');
  const toggleKeyBtn = document.getElementById('toggle-key-btn');

  const videoUrlInput = document.getElementById('video-url-input');
  const startBtn = document.getElementById('start-btn');
  const shareInfoHint = document.getElementById('share-info-hint');

  const videoCard = document.getElementById('video-card');
  const videoThumb = document.getElementById('video-thumb');
  const videoTitleEl = document.getElementById('video-title');
  const videoChannelEl = document.getElementById('video-channel');

  const loadingCard = document.getElementById('loading-card');
  const loadingTitle = document.getElementById('loading-title');
  const loadingSub = document.getElementById('loading-sub');

  const errorCard = document.getElementById('error-card');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');

  const quizContainer = document.getElementById('quiz-container');
  const quizBody = document.getElementById('quiz-body');
  const scoreCounter = document.getElementById('score-counter');
  const refreshQuizBtn = document.getElementById('refresh-quiz-btn');

  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Register Service Worker (only for web HTTP/HTTPS origins)
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('[PWA] Service Worker registered'))
        .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
  }

  // Handle PWA installation prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) pwaInstallBtn.style.display = 'inline-flex';
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        pwaInstallBtn.style.display = 'none';
      }
      deferredPrompt = null;
    });
  }

  // Init app
  init();

  async function init() {
    loadSettings();
    renderHistory();
    setupEventListeners();

    // Check if opened via Android Share Target or with query params
    handleIncomingShare();

    // Check secure context for Android PWA install
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const banner = document.getElementById('insecure-context-banner');
      const hostIpEl = document.getElementById('current-host-ip');
      if (banner && hostIpEl) {
        hostIpEl.innerText = `${window.location.origin}`;
        banner.style.display = 'flex';
      }
    }
  }

  function getSettings() {
    return {
      apiKey: localStorage.getItem('yq_apiKey') || DEFAULT_API_KEY,
      model: localStorage.getItem('yq_model') || DEFAULT_MODEL
    };
  }

  function loadSettings() {
    const s = getSettings();
    settingApiKey.value = s.apiKey;
    settingModel.value = s.model;
  }

  function setupEventListeners() {
    // Settings modal
    openSettingsBtn.addEventListener('click', () => {
      loadSettings();
      settingsModal.style.display = 'flex';
    });
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    toggleKeyBtn.addEventListener('click', () => {
      if (settingApiKey.type === 'password') {
        settingApiKey.type = 'text';
        toggleKeyBtn.innerText = 'Verbergen';
      } else {
        settingApiKey.type = 'password';
        toggleKeyBtn.innerText = 'Anzeigen';
      }
    });

    saveSettingsBtn.addEventListener('click', () => {
      localStorage.setItem('yq_apiKey', settingApiKey.value.trim());
      localStorage.setItem('yq_model', settingModel.value);
      settingsModal.style.display = 'none';
      alert('Einstellungen gespeichert!');
    });

    testKeyBtn.addEventListener('click', testConnection);

    // Paste button
    const pasteBtn = document.getElementById('paste-btn');
    const clipboardHint = document.getElementById('clipboard-hint');

    if (pasteBtn) {
      pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          const vId = extractVideoId(text);
          if (vId) {
            videoUrlInput.value = text.trim();
            startQuizForVideo(vId);
          } else if (text.trim()) {
            videoUrlInput.value = text.trim();
            alert('Kein YouTube-Link in der Zwischenablage gefunden.');
          } else {
            alert('Zwischenablage ist leer.');
          }
        } catch (e) {
          // If browser restricts automatic readText without user focus
          const manual = prompt('YouTube Link eingeben:');
          if (manual) {
            const vId = extractVideoId(manual);
            if (vId) {
              videoUrlInput.value = manual.trim();
              startQuizForVideo(vId);
            }
          }
        }
      });
    }

    // Auto-check clipboard when app comes to foreground
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && navigator.clipboard && navigator.clipboard.readText) {
        try {
          const text = await navigator.clipboard.readText();
          const vId = extractVideoId(text);
          if (vId && vId !== currentVideoId) {
            if (clipboardHint) {
              clipboardHint.style.display = 'flex';
              clipboardHint.onclick = () => {
                videoUrlInput.value = text.trim();
                clipboardHint.style.display = 'none';
                startQuizForVideo(vId);
              };
            }
          }
        } catch (e) {
          // Clipboard permission denied or not focused
        }
      }
    });

    // Start Button
    startBtn.addEventListener('click', () => {
      const raw = videoUrlInput.value.trim();
      const vId = extractVideoId(raw);
      if (vId) {
        startQuizForVideo(vId);
      } else {
        alert('Bitte einen gültigen YouTube-Link eingeben.');
      }
    });

    retryBtn.addEventListener('click', () => {
      if (currentVideoId) startQuizForVideo(currentVideoId, true);
    });

    refreshQuizBtn.addEventListener('click', () => {
      if (confirm('Möchtest du das Quiz mit Gemini neu generieren lassen?')) {
        if (currentVideoId) {
          localStorage.removeItem(`quiz_${currentVideoId}`);
          startQuizForVideo(currentVideoId, true);
        }
      }
    });

    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Möchtest du deinen Lernverlauf wirklich leeren?')) {
        localStorage.removeItem('yq_history');
        renderHistory();
      }
    });

    // Mode Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        currentQuestionIndex = 0;
        renderQuizBody();
      });
    });

    // Filter Pills
    document.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        currentQuestionIndex = 0;
        renderQuizBody();
      });
    });
  }

  // Handle incoming Share Target on Android
  function handleIncomingShare() {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url') || '';
    const sharedText = params.get('text') || '';
    const sharedTitle = params.get('title') || '';

    const combined = `${sharedUrl} ${sharedText} ${sharedTitle}`.trim();
    if (!combined) return;

    const vId = extractVideoId(combined);
    if (vId) {
      videoUrlInput.value = sharedUrl || sharedText;
      shareInfoHint.style.display = 'flex';
      // Clean up URL in browser history without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
      startQuizForVideo(vId);
    }
  }

  function extractVideoId(text) {
    if (!text) return null;
    const match = text.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  // Test Connection to Gemini
  async function testConnection() {
    const key = settingApiKey.value.trim();
    const model = settingModel.value;
    if (!key) {
      testKeyStatus.className = 'test-status error';
      testKeyStatus.innerText = '❌ Bitte API-Key eingeben.';
      return;
    }

    testKeyStatus.className = 'test-status';
    testKeyStatus.innerText = '⏳ Verbindung wird getestet...';
    testKeyBtn.disabled = true;

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
      });

      if (resp.ok) {
        testKeyStatus.className = 'test-status success';
        testKeyStatus.innerText = '✓ Verbindung erfolgreich! Modell ist einsatzbereit.';
      } else {
        const err = await resp.json();
        testKeyStatus.className = 'test-status error';
        testKeyStatus.innerText = `❌ ${err.error?.message || resp.statusText}`;
      }
    } catch (e) {
      testKeyStatus.className = 'test-status error';
      testKeyStatus.innerText = `❌ Fehler: ${e.message}`;
    } finally {
      testKeyBtn.disabled = false;
    }
  }

  // Start Quiz Process for a Video
  async function startQuizForVideo(videoId, forceRefresh = false) {
    currentVideoId = videoId;
    mcAnswers = {};
    openAnswers = {};
    currentQuestionIndex = 0;

    // Show loading
    errorCard.style.display = 'none';
    quizContainer.style.display = 'none';
    loadingCard.style.display = 'block';
    loadingTitle.innerText = 'Lade Video-Informationen...';
    loadingSub.innerText = 'Rufe Metadaten von YouTube ab...';

    // 1. Fetch Video Metadata via oEmbed
    let videoMeta = { title: 'YouTube Video', author: '', thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        videoMeta.title = data.title || videoMeta.title;
        videoMeta.author = data.author_name || '';
        videoMeta.thumb = data.thumbnail_url || videoMeta.thumb;
      }
    } catch (e) {
      console.warn('oEmbed fetch warning:', e);
    }

    // Update video card
    videoThumb.src = videoMeta.thumb;
    videoTitleEl.innerText = videoMeta.title;
    videoChannelEl.innerText = videoMeta.author ? `Kanal: ${videoMeta.author}` : '';
    videoCard.style.display = 'flex';

    // Check cache
    const cacheKey = `quiz_${videoId}`;
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          currentQuizData = JSON.parse(cached);
          loadingCard.style.display = 'none';
          quizContainer.style.display = 'flex';
          renderQuizBody();
          return;
        } catch (e) {}
      }
    }

    // 2. Generate with Gemini
    loadingTitle.innerText = '🤖 Gemini 3 Flash analysiert Fakten...';
    loadingSub.innerText = 'Erstelle Multiple Choice & Detailfragen für Geopolitik und Wirtschaft...';

    try {
      const quiz = await callGeminiForQuiz(videoId, videoMeta.title, videoMeta.author);
      currentQuizData = quiz;
      localStorage.setItem(cacheKey, JSON.stringify(quiz));

      loadingCard.style.display = 'none';
      quizContainer.style.display = 'flex';
      renderQuizBody();
    } catch (err) {
      console.error(err);
      loadingCard.style.display = 'none';
      errorCard.style.display = 'block';
      errorMessage.innerText = err.message || 'Quiz konnte nicht generiert werden.';
    }
  }

  // Call Gemini API to generate Quiz
  async function callGeminiForQuiz(videoId, title, author) {
    const settings = getSettings();
    const apiKey = settings.apiKey;
    const model = settings.model;

    if (!apiKey) throw new Error("Kein Gemini API-Schlüssel hinterlegt. Bitte in den Einstellungen eintragen.");

    const prompt = `Du bist ein hochkarätiger geopolitischer und wirtschaftlicher Analyst, Dozent und Quiz-Master.
Analysiere das folgende Video:
TITEL: ${title}
AUTOR / KANAL: ${author}
YOUTUBE-URL: https://www.youtube.com/watch?v=${videoId}

Analysiere die Thematik, Hintergründe, wirtschaftlichen Zusammenhänge, Handelsströme, Akteure, Verträge und geopolitischen Brennpunkte dieses Themas.
Erstelle ein fundiertes, anspruchsvolles Lern-Quiz.

ANFORDERUNGEN:
1. Extrahiere so viele handfeste Fakten wie möglich (Zahlen, Daten, strategische Abkommen, geostrategische Engpässe / Chokepoints, wirtschaftliche Kennzahlen).
2. Gewichte alle Fragen nach Wichtigkeit und Detailgrad:
   - "high" / "core": Wichtigste Kernfakten (Ursachen, primäre Akteure, zentrale Zahlen). Diese MÜSSEN in der Liste zuerst stehen!
   - "medium" / "advanced": Erweiterte Zusammenhänge und Mechanismen.
   - "deep" / "expert": Genaue Zahlen, Quoten, Verträge und Details für intensives Lernen.
3. MODI:
   - "multiple_choice": 6-8 Fragen mit je 4 Optionen, genau 1 richtige Antwort, ausführliche Erklärung und "fact_summary" (1-Satz Kernfakt zum Merken).
   - "open_ended": 4-6 anspruchsvolle Fragen für Stichworte/Freitext, mit erwarteten Schlüsselwörtern ("keywords"), Musterlösung ("model_answer") und didaktischer Erklärung.
4. "key_facts": Ein Fakten-Dossier mit einer Liste der wichtigsten Fakten zum Nachlesen.

ANTWORTE AUSSCHLIESSLICH ALS VALIDES JSON:
{
  "video_summary": "Kurze 2-3 Satz Zusammenfassung...",
  "key_facts": [
    { "fact": "Konkreter Fakt...", "importance": "high" | "medium" | "deep", "category": "Geopolitik" | "Wirtschaft" | "Strategie" | "Historie" }
  ],
  "multiple_choice": [
    {
      "id": "mc_1",
      "question": "Frage...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "importance": "high" | "medium" | "deep",
      "detail_level": "core" | "advanced" | "expert",
      "explanation": "Erklärung...",
      "fact_summary": "1-Satz Kernfakt..."
    }
  ],
  "open_ended": [
    {
      "id": "open_1",
      "question": "Frage...",
      "keywords": ["Stichwort 1", "Stichwort 2"],
      "model_answer": "Musterlösung...",
      "importance": "high" | "medium" | "deep",
      "detail_level": "core" | "advanced" | "expert",
      "explanation": "Didaktischer Hintergrund..."
    }
  ]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      let msg = `Gemini API Fehler (${resp.status})`;
      try {
        const j = JSON.parse(errText);
        if (j.error?.message) msg = j.error.message;
      } catch (e) {}
      throw new Error(msg);
    }

    const data = await resp.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error("Leere Antwort von Gemini.");

    let quizData;
    try {
      quizData = JSON.parse(textOutput);
    } catch (e) {
      const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      quizData = JSON.parse(cleaned);
    }

    // Sort: high importance first
    const impMap = { high: 1, medium: 2, deep: 3 };
    if (quizData.multiple_choice) {
      quizData.multiple_choice.sort((a, b) => (impMap[a.importance] || 2) - (impMap[b.importance] || 2));
    }
    if (quizData.open_ended) {
      quizData.open_ended.sort((a, b) => (impMap[a.importance] || 2) - (impMap[b.importance] || 2));
    }

    quizData.videoId = videoId;
    quizData.videoTitle = title;
    return quizData;
  }

  // Filter questions based on active pill
  function getFilteredQuestions() {
    if (!currentQuizData) return [];
    const list = currentMode === 'multiple_choice' 
      ? (currentQuizData.multiple_choice || []) 
      : (currentQuizData.open_ended || []);

    if (currentFilter === 'all') return list;
    if (currentFilter === 'core') return list.filter(q => q.importance === 'high' || q.detail_level === 'core');
    if (currentFilter === 'advanced') return list.filter(q => q.importance === 'medium' || q.detail_level === 'advanced');
    if (currentFilter === 'expert') return list.filter(q => q.importance === 'deep' || q.detail_level === 'expert');
    return list;
  }

  // Render main quiz area
  function renderQuizBody() {
    const filterBar = document.getElementById('filter-bar');
    if (currentMode === 'facts') {
      filterBar.style.display = 'none';
      renderFactsDossier();
      updateScoreCounter();
      return;
    }

    filterBar.style.display = 'flex';
    const questions = getFilteredQuestions();

    if (!questions || questions.length === 0) {
      quizBody.innerHTML = `
        <div style="text-align: center; padding: 30px 10px;">
          <p style="color: var(--text-sub);">Keine Fragen in dieser Kategorie vorhanden.</p>
          <button class="btn btn-secondary" onclick="document.querySelector('[data-filter=all]').click()">Alle Fragen anzeigen</button>
        </div>
      `;
      return;
    }

    if (currentQuestionIndex >= questions.length) {
      renderCompletedView(questions);
      return;
    }

    const q = questions[currentQuestionIndex];
    if (currentMode === 'multiple_choice') {
      renderMultipleChoice(q, currentQuestionIndex, questions.length);
    } else {
      renderOpenEnded(q, currentQuestionIndex, questions.length);
    }

    updateScoreCounter();
  }

  function renderMultipleChoice(q, idx, total) {
    const answered = mcAnswers[q.id];
    const isAnswered = !!answered;

    let badgeClass = 'badge-core';
    let badgeText = '🔥 KERNFAKT';
    if (q.importance === 'medium' || q.detail_level === 'advanced') {
      badgeClass = 'badge-adv';
      badgeText = '📈 VERTIEFUNG';
    } else if (q.importance === 'deep' || q.detail_level === 'expert') {
      badgeClass = 'badge-exp';
      badgeText = '🔍 EXPERTEN-DETAIL';
    }

    quizBody.innerHTML = `
      <div class="q-progress">
        <span>Frage ${idx + 1} von ${total}</span>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>

      <h4 class="q-text">${escapeHtml(q.question)}</h4>

      <div class="options-list">
        ${q.options.map((opt, oIdx) => {
          let stateClass = '';
          let letter = String.fromCharCode(65 + oIdx);
          if (isAnswered) {
            if (oIdx === q.correct_index) {
              stateClass = 'correct';
              letter = '✓';
            } else if (oIdx === answered.selectedIndex) {
              stateClass = 'wrong';
              letter = '✗';
            } else {
              stateClass = 'disabled';
            }
          }
          return `
            <button class="opt-btn ${stateClass}" data-opt-idx="${oIdx}" ${isAnswered ? 'disabled' : ''}>
              <span class="opt-letter">${letter}</span>
              <span>${escapeHtml(opt)}</span>
            </button>
          `;
        }).join('')}
      </div>

      ${isAnswered ? `
        <div class="expl-card ${answered.isCorrect ? 'success' : 'alert'}">
          <strong>${answered.isCorrect ? '🎯 Richtig!' : '💡 Erklärung:'}</strong>
          <p style="margin: 4px 0 0 0;">${escapeHtml(q.explanation)}</p>
          ${q.fact_summary ? `
            <div class="fact-note">
              <strong>📌 KERNFAKT ZUM MERKEN:</strong>
              ${escapeHtml(q.fact_summary)}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="nav-row">
        <button class="btn btn-secondary btn-sm" id="prev-btn" ${idx === 0 ? 'disabled' : ''}>◀ Zurück</button>
        ${isAnswered ? `
          <button class="btn btn-primary btn-sm" id="next-btn">${idx + 1 === total ? 'Ergebnis 🏆' : 'Weiter ▶'}</button>
        ` : `
          <span style="font-size: 12px; color: var(--text-sub);">Wähle eine Option</span>
        `}
      </div>
    `;

    // Events
    quizBody.querySelectorAll('.opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        mcAnswers[q.id] = {
          selectedIndex: optIdx,
          isCorrect: optIdx === q.correct_index
        };
        renderQuizBody();
      });
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuizBody();
      }
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
      currentQuestionIndex++;
      renderQuizBody();
    });
  }

  function renderOpenEnded(q, idx, total) {
    const existing = openAnswers[q.id] || { text: '', eval: null };
    const hasEval = !!existing.eval;

    let badgeClass = 'badge-core';
    let badgeText = '🔥 KERNFAKT';
    if (q.importance === 'medium' || q.detail_level === 'advanced') {
      badgeClass = 'badge-adv';
      badgeText = '📈 VERTIEFUNG';
    } else if (q.importance === 'deep' || q.detail_level === 'expert') {
      badgeClass = 'badge-exp';
      badgeText = '🔍 EXPERTEN-DETAIL';
    }

    quizBody.innerHTML = `
      <div class="q-progress">
        <span>Detail-Frage ${idx + 1} von ${total}</span>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>

      <h4 class="q-text">${escapeHtml(q.question)}</h4>

      <textarea id="open-input" class="open-textarea" placeholder="Nenne die wichtigsten Stichwörter, Zahlen oder deine Antwort..." rows="3" ${hasEval ? 'disabled' : ''}>${escapeHtml(existing.text)}</textarea>

      ${!hasEval ? `
        <div style="display: flex; gap: 8px; margin-bottom: 14px;">
          <button class="btn btn-primary btn-sm" id="check-answer-btn">✍️ Mit Gemini prüfen</button>
          <button class="btn btn-ghost btn-sm" id="peek-btn">Musterlösung anzeigen</button>
        </div>
      ` : ''}

      ${hasEval ? `
        <div class="eval-result">
          <span class="eval-score ${existing.eval.score >= 60 ? 'good' : 'bad'}">${existing.eval.score}% Übereinstimmung</span>
          <p style="margin: 6px 0; font-size: 13.5px;">${escapeHtml(existing.eval.feedback)}</p>

          <div class="kw-chips">
            ${(q.keywords || []).map(kw => {
              const hit = (existing.eval.covered || []).some(k => k.toLowerCase() === kw.toLowerCase());
              return `<span class="kw-chip ${hit ? 'hit' : 'miss'}">${hit ? '✓' : '○'} ${escapeHtml(kw)}</span>`;
            }).join('')}
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; margin-top: 8px; font-size: 13px;">
            <strong style="color: #93c5fd; display: block;">📖 Musterlösung:</strong>
            ${escapeHtml(q.model_answer)}
          </div>
        </div>
      ` : ''}

      <div class="nav-row">
        <button class="btn btn-secondary btn-sm" id="prev-btn" ${idx === 0 ? 'disabled' : ''}>◀ Zurück</button>
        <button class="btn btn-primary btn-sm" id="next-btn">${idx + 1 === total ? 'Ergebnis 🏆' : 'Weiter ▶'}</button>
      </div>
    `;

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuizBody();
      }
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
      currentQuestionIndex++;
      renderQuizBody();
    });

    const openInput = document.getElementById('open-input');
    const checkBtn = document.getElementById('check-answer-btn');
    const peekBtn = document.getElementById('peek-btn');

    if (checkBtn) {
      checkBtn.addEventListener('click', async () => {
        const text = openInput.value.trim();
        checkBtn.disabled = true;
        checkBtn.innerText = 'Prüfe...';

        const evalRes = await evaluateOpenAnswer(q, text);
        openAnswers[q.id] = { text, eval: evalRes };
        renderQuizBody();
      });
    }

    if (peekBtn) {
      peekBtn.addEventListener('click', () => {
        openAnswers[q.id] = {
          text: openInput.value,
          eval: { score: 0, feedback: "Musterlösung aufgerufen.", covered: [] }
        };
        renderQuizBody();
      });
    }
  }

  async function evaluateOpenAnswer(q, text) {
    const s = getSettings();
    const prompt = `Bewerte diese Antwort:
FRAGE: ${q.question}
KEYWORDS: ${JSON.stringify(q.keywords || [])}
MUSTERLÖSUNG: ${q.model_answer}
ANTWORT DES NUTZERS: "${text}"

Antworte als JSON:
{
  "score": 85,
  "covered": ["..."],
  "feedback": "Kurzes Feedback (2 Sätze)..."
}`;

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${s.model}:generateContent?key=${s.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      });
      if (resp.ok) {
        const d = await resp.json();
        const raw = d.candidates[0].content.parts[0].text;
        return JSON.parse(raw);
      }
    } catch (e) {}

    // Fallback keyword search
    const lower = text.toLowerCase();
    const covered = (q.keywords || []).filter(k => lower.includes(k.toLowerCase()));
    const ratio = q.keywords?.length ? covered.length / q.keywords.length : 0.5;
    return {
      score: Math.round(ratio * 100),
      covered,
      feedback: `Du hast ${covered.length} von ${q.keywords?.length || 0} Kernbegriffen genannt.`
    };
  }

  function renderFactsDossier() {
    const facts = currentQuizData.key_facts || [];
    const summary = currentQuizData.video_summary || '';

    quizBody.innerHTML = `
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 12px; border-radius: 10px; margin-bottom: 14px;">
        <strong style="color: #93c5fd; font-size: 13px; display: block; margin-bottom: 4px;">📌 Kernaussage des Videos:</strong>
        <p style="margin: 0; font-size: 13.5px; color: #f1f5f9; line-height: 1.45;">${escapeHtml(summary)}</p>
      </div>

      <h4 style="margin: 0 0 10px 0; font-size: 14px;">Extrahierte Fakten (${facts.length}):</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${facts.map(f => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: #3b82f6;">${escapeHtml(f.category || 'Fakt')}</span>
              <span style="font-size: 11px; color: var(--text-sub);">${f.importance === 'high' ? '🔥 Kernfakt' : '📈 Detail'}</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #e2e8f0; line-height: 1.4;">${escapeHtml(f.fact)}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCompletedView(questions) {
    let score = 0;
    let total = questions.length;
    if (currentMode === 'multiple_choice') {
      questions.forEach(q => {
        if (mcAnswers[q.id]?.isCorrect) score++;
      });
      score = Math.round((score / total) * 100);
    } else {
      questions.forEach(q => {
        score += (openAnswers[q.id]?.eval?.score || 0);
      });
      score = Math.round(score / total);
    }

    // Save to history
    saveToHistory({
      videoId: currentVideoId,
      title: currentQuizData.videoTitle || 'Quiz',
      score,
      date: new Date().toLocaleDateString('de-DE')
    });

    let verdict = "Gute Arbeit!";
    if (score >= 80) verdict = "Hervorragend! Du hast die geopolitischen und wirtschaftlichen Fakten exzellent verinnerlicht.";
    else if (score >= 50) verdict = "Solides Ergebnis! Schaue dir das Fakten-Dossier an, um Lücken zu schließen.";
    else verdict = "Guter Versuch! Geopolitik ist detailreich. Wiederhole das Quiz oder lies das Fakten-Dossier.";

    quizBody.innerHTML = `
      <div class="completed-view">
        <div class="trophy">🏆</div>
        <h3>Quiz beendet!</h3>
        <div class="big-score">${score}%</div>
        <p class="verdict-text">${verdict}</p>

        <div class="completed-actions">
          <button class="btn btn-primary" id="restart-btn">🔄 Quiz wiederholen</button>
          <button class="btn btn-secondary" id="switch-mode-btn">
            ${currentMode === 'multiple_choice' ? '✍️ Zum Stichwort-Modus' : '⚡ Zum Multiple Choice'}
          </button>
          <button class="btn btn-ghost" id="view-dossier-btn">📋 Fakten-Dossier öffnen</button>
        </div>
      </div>
    `;

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      if (currentMode === 'multiple_choice') mcAnswers = {};
      else openAnswers = {};
      currentQuestionIndex = 0;
      renderQuizBody();
    });

    document.getElementById('switch-mode-btn')?.addEventListener('click', () => {
      const target = currentMode === 'multiple_choice' ? 'open_ended' : 'multiple_choice';
      document.querySelector(`[data-mode=${target}]`)?.click();
    });

    document.getElementById('view-dossier-btn')?.addEventListener('click', () => {
      document.querySelector('[data-mode=facts]')?.click();
    });
  }

  function updateScoreCounter() {
    if (!currentQuizData || currentMode === 'facts') {
      scoreCounter.innerText = '';
      return;
    }
    const questions = currentQuizData.multiple_choice || [];
    let correct = 0;
    let answered = 0;
    questions.forEach(q => {
      if (mcAnswers[q.id]) {
        answered++;
        if (mcAnswers[q.id].isCorrect) correct++;
      }
    });
    scoreCounter.innerText = `Punkte: ${correct} / ${answered}`;
  }

  function saveToHistory(item) {
    const raw = localStorage.getItem('yq_history');
    let history = raw ? JSON.parse(raw) : [];
    history.unshift(item);
    if (history.length > 30) history.pop();
    localStorage.setItem('yq_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const raw = localStorage.getItem('yq_history');
    const history = raw ? JSON.parse(raw) : [];
    if (history.length === 0) {
      historyList.innerHTML = `<div class="empty-state">Noch keine Quizzes absolviert. Teile ein Video aus YouTube ReVanced!</div>`;
      return;
    }

    historyList.innerHTML = history.slice(0, 5).map(h => `
      <div class="history-item" data-v-id="${h.videoId}">
        <div class="h-info">
          <span class="h-title">${escapeHtml(h.title)}</span>
          <span class="h-date">${h.date}</span>
        </div>
        <span class="h-score">${h.score}%</span>
      </div>
    `).join('');

    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const vId = item.dataset.vId;
        if (vId) startQuizForVideo(vId);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
