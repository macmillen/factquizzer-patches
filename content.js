// content.js - Injected into YouTube to detect video completion and render the FactQuizzer UI
(function() {
  'use strict';

  let currentVideoId = null;
  let currentQuizData = null;
  let currentMode = 'multiple_choice'; // 'multiple_choice' | 'open_ended' | 'facts'
  let currentFilter = 'core'; // 'core' | 'advanced' | 'expert' | 'all'
  let currentQuestionIndex = 0;
  let mcAnswers = {}; // { questionId: { selectedIndex, isCorrect } }
  let openAnswers = {}; // { questionId: { text, evaluation } }
  let isQuizOpen = false;
  let isMinimized = false;
  let videoEndedTriggered = false;
  let settings = { autoOpenOnEnd: true, defaultMode: 'multiple_choice' };

  // Fetch initial settings
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
    if (res && res.success && res.settings) {
      settings = res.settings;
      currentMode = settings.defaultMode || 'multiple_choice';
    }
  });

  // Watch URL changes & video events
  function init() {
    checkVideoChange();

    // Check periodically for DOM changes and navigation
    setInterval(checkVideoChange, 1000);

    // Listen to bridge navigate event for instant reaction
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data && event.data.source === 'YQ_BRIDGE' && event.data.type === 'YT_NAVIGATE_FINISH') {
        checkVideoChange();
      }
    });

    // Inject trigger buttons
    injectQuizButtons();
    setInterval(injectQuizButtons, 2000);
  }

  function checkVideoChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');

    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      videoEndedTriggered = false;
      currentQuizData = null;
      currentQuestionIndex = 0;
      mcAnswers = {};
      openAnswers = {};
      closeQuizModal();
      setupVideoListeners();
    }
  }

  function setupVideoListeners() {
    const video = document.querySelector('video');
    if (!video) return;

    // Remove old listener if any and add fresh ones
    video.removeEventListener('ended', handleVideoEnded);
    video.removeEventListener('timeupdate', handleTimeUpdate);

    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
  }

  function handleVideoEnded() {
    if (videoEndedTriggered) return;
    videoEndedTriggered = true;
    console.log('[FactQuizzer] Video ended detected');
    if (settings.autoOpenOnEnd) {
      openQuizModal();
    }
  }

  function handleTimeUpdate(e) {
    const video = e.target;
    if (!video || !video.duration) return;
    // Trigger when 1.5 seconds before end if not already triggered
    if (video.duration > 10 && video.currentTime >= video.duration - 1.2) {
      if (!videoEndedTriggered) {
        videoEndedTriggered = true;
        console.log('[FactQuizzer] Video reached near-end');
        if (settings.autoOpenOnEnd) {
          openQuizModal();
        }
      }
    }
  }

  // Inject buttons into YouTube UI
  function injectQuizButtons() {
    if (!window.location.pathname.startsWith('/watch')) return;

    // 1. YouTube Player Control Bar Button
    const rightControls = document.querySelector('.ytp-right-controls');
    if (rightControls && !document.getElementById('yq-player-btn')) {
      const btn = document.createElement('button');
      btn.id = 'yq-player-btn';
      btn.className = 'ytp-button yq-ytp-btn';
      btn.title = 'FactQuizzer: Video-Quiz starten';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
        </svg>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuizModal();
      });
      rightControls.insertBefore(btn, rightControls.firstChild);
    }

    // 2. Action bar button under the video (next to Like/Share)
    const actionsContainer = document.querySelector('#top-level-buttons-computed') ||
                             document.querySelector('#actions-inner #menu #top-level-buttons-computed') ||
                             document.querySelector('#actions #top-level-buttons-computed');

    if (actionsContainer && !document.getElementById('yq-action-btn')) {
      const actionBtn = document.createElement('button');
      actionBtn.id = 'yq-action-btn';
      actionBtn.className = 'yq-action-pill';
      actionBtn.innerHTML = `
        <span class="yq-btn-icon">🧠</span>
        <span class="yq-btn-text">Fakten-Quiz</span>
      `;
      actionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openQuizModal();
      });
      actionsContainer.prepend(actionBtn);
    }
  }

  // Request player metadata from page-bridge.js
  function getVideoMetadata() {
    return new Promise((resolve) => {
      const reqId = 'req_' + Math.random().toString(36).substring(2, 9);
      
      const listener = (event) => {
        if (event.source !== window) return;
        if (event.data && event.data.source === 'YQ_BRIDGE' && event.data.type === 'VIDEO_METADATA_RESPONSE' && event.data.requestId === reqId) {
          window.removeEventListener('message', listener);
          resolve(event.data.data);
        }
      };

      window.addEventListener('message', listener);

      window.postMessage({
        source: 'YQ_CONTENT',
        type: 'GET_VIDEO_METADATA',
        requestId: reqId
      }, '*');

      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener('message', listener);
        // Fallback from DOM
        const title = document.title.replace(' - YouTube', '').trim();
        const author = document.querySelector('#owner #channel-name a')?.innerText?.trim() || '';
        const urlParams = new URLSearchParams(window.location.search);
        resolve({
          videoId: urlParams.get('v') || '',
          title: title,
          author: author,
          captionTracks: []
        });
      }, 1000);
    });
  }

  // Open Quiz Modal
  async function openQuizModal() {
    isQuizOpen = true;
    isMinimized = false;

    // Pause video so autoplay doesn't skip to the next video
    const video = document.querySelector('video');
    if (video && !video.paused) {
      try { video.pause(); } catch (e) {}
    }

    let container = document.getElementById('yq-quiz-overlay');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yq-quiz-overlay';
      document.body.appendChild(container);
    }
    container.style.display = 'flex';
    container.classList.remove('yq-minimized');

    if (currentQuizData) {
      renderQuizUI();
      return;
    }

    // Render loading view
    renderLoadingUI("Analysiere Video und lade Transkript...");

    try {
      const metadata = await getVideoMetadata();
      const videoId = metadata.videoId || new URLSearchParams(window.location.search).get('v');
      const title = metadata.title || document.title;
      const author = metadata.author || '';

      // Find best caption track
      let transcriptText = '';
      if (metadata.captionTracks && metadata.captionTracks.length > 0) {
        // Find German or English track, or first
        const track = metadata.captionTracks.find(t => t.languageCode === 'de') ||
                      metadata.captionTracks.find(t => t.languageCode.startsWith('de')) ||
                      metadata.captionTracks.find(t => t.languageCode === 'en') ||
                      metadata.captionTracks[0];

        renderLoadingUI(`Lade Untertitel (${track.name || track.languageCode})...`);

        const capRes = await new Promise((res) => {
          chrome.runtime.sendMessage({
            type: 'FETCH_TRANSCRIPT',
            url: track.baseUrl
          }, res);
        });

        if (capRes && capRes.success && capRes.text) {
          transcriptText = capRes.text;
        }
      }

      // If no captions found, grab description
      const descEl = document.querySelector('#description-inline-expander') || document.querySelector('#description');
      const description = descEl ? descEl.innerText : '';

      renderLoadingUI("🤖 Gemini 3 Flash analysiert Fakten & generiert Fragen...");

      const quizRes = await new Promise((res) => {
        chrome.runtime.sendMessage({
          type: 'GENERATE_QUIZ',
          payload: {
            videoId,
            title,
            author,
            transcript: transcriptText,
            description,
            forceRefresh: false
          }
        }, res);
      });

      if (!quizRes || !quizRes.success) {
        throw new Error(quizRes ? quizRes.error : "Fehler beim Erstellen des Quiz.");
      }

      currentQuizData = quizRes.quiz;
      currentQuestionIndex = 0;
      renderQuizUI();

    } catch (err) {
      console.error('[FactQuizzer]', err);
      renderErrorUI(err.message);
    }
  }

  function closeQuizModal() {
    isQuizOpen = false;
    const container = document.getElementById('yq-quiz-overlay');
    if (container) {
      container.style.display = 'none';
    }
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    const container = document.getElementById('yq-quiz-overlay');
    if (!container) return;

    if (isMinimized) {
      container.classList.add('yq-minimized');
      renderMinimizedUI();
    } else {
      container.classList.remove('yq-minimized');
      renderQuizUI();
    }
  }

  function renderLoadingUI(statusText) {
    const container = document.getElementById('yq-quiz-overlay');
    if (!container) return;

    container.innerHTML = `
      <div class="yq-modal-card">
        <div class="yq-modal-header">
          <div class="yq-header-title">
            <span class="yq-header-icon">🧠</span>
            <div>
              <h3>YouTube FactQuizzer AI</h3>
              <p class="yq-subtitle">Geopolitik & Wirtschaft Lernsystem</p>
            </div>
          </div>
          <button class="yq-close-btn" id="yq-close-btn" title="Schließen">&times;</button>
        </div>
        <div class="yq-loading-body">
          <div class="yq-spinner"></div>
          <h4 class="yq-loading-text">${statusText}</h4>
          <p class="yq-loading-sub">Extrahiere Kernfakten, wirtschaftliche Zahlen und geopolitische Zusammenhänge...</p>
        </div>
      </div>
    `;

    document.getElementById('yq-close-btn')?.addEventListener('click', closeQuizModal);
  }

  function renderErrorUI(errorMessage) {
    const container = document.getElementById('yq-quiz-overlay');
    if (!container) return;

    container.innerHTML = `
      <div class="yq-modal-card">
        <div class="yq-modal-header">
          <div class="yq-header-title">
            <span class="yq-header-icon">⚠️</span>
            <h3>Quiz konnte nicht geladen werden</h3>
          </div>
          <button class="yq-close-btn" id="yq-close-btn">&times;</button>
        </div>
        <div class="yq-error-body">
          <p class="yq-error-msg">${escapeHtml(errorMessage)}</p>
          <div class="yq-error-actions">
            <button class="yq-btn yq-btn-primary" id="yq-retry-btn">Erneut versuchen</button>
            <button class="yq-btn yq-btn-secondary" id="yq-open-options-btn">API-Einstellungen öffnen</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('yq-close-btn')?.addEventListener('click', closeQuizModal);
    document.getElementById('yq-retry-btn')?.addEventListener('click', () => {
      currentQuizData = null;
      openQuizModal();
    });
    document.getElementById('yq-open-options-btn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    });
  }

  function renderMinimizedUI() {
    const container = document.getElementById('yq-quiz-overlay');
    if (!container) return;

    let scoreInfo = '';
    if (currentQuizData && currentQuizData.multiple_choice) {
      const answered = Object.keys(mcAnswers).length;
      const total = currentQuizData.multiple_choice.length;
      scoreInfo = `(${answered}/${total})`;
    }

    container.innerHTML = `
      <div class="yq-mini-pill" id="yq-mini-pill" title="Klicken zum Wiederherstellen">
        <span class="yq-btn-icon">🧠</span>
        <span class="yq-mini-label">Quiz aktiv ${scoreInfo}</span>
        <button class="yq-mini-close" id="yq-mini-close" title="Beenden">&times;</button>
      </div>
    `;

    document.getElementById('yq-mini-pill')?.addEventListener('click', (e) => {
      if (e.target.id === 'yq-mini-close') return;
      toggleMinimize();
    });

    document.getElementById('yq-mini-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeQuizModal();
    });
  }

  // Filter questions based on selected detail level
  function getFilteredQuestions() {
    if (!currentQuizData) return [];
    const questions = currentMode === 'multiple_choice' 
      ? (currentQuizData.multiple_choice || [])
      : (currentQuizData.open_ended || []);

    if (currentFilter === 'all') return questions;
    if (currentFilter === 'core') {
      return questions.filter(q => q.importance === 'high' || q.detail_level === 'core');
    }
    if (currentFilter === 'advanced') {
      return questions.filter(q => q.importance === 'medium' || q.detail_level === 'advanced');
    }
    if (currentFilter === 'expert') {
      return questions.filter(q => q.importance === 'deep' || q.detail_level === 'expert');
    }
    return questions;
  }

  // Render Full Quiz Interface
  function renderQuizUI() {
    const container = document.getElementById('yq-quiz-overlay');
    if (!container || !currentQuizData) return;

    const questions = getFilteredQuestions();

    container.innerHTML = `
      <div class="yq-modal-card">
        <!-- Header -->
        <div class="yq-modal-header">
          <div class="yq-header-title">
            <span class="yq-header-icon">🧠</span>
            <div class="yq-title-box">
              <h3 title="${escapeHtml(currentQuizData.videoTitle || 'Video-Quiz')}">
                ${escapeHtml(currentQuizData.videoTitle || 'Video-Quiz')}
              </h3>
              <p class="yq-subtitle">KI-Faktenquiz: Geopolitik & Wirtschaft</p>
            </div>
          </div>
          <div class="yq-header-controls">
            <button class="yq-icon-btn" id="yq-min-btn" title="Minimieren">_</button>
            <button class="yq-icon-btn yq-close-btn" id="yq-close-btn" title="Schließen">&times;</button>
          </div>
        </div>

        <!-- Mode Switcher Tabs -->
        <div class="yq-tabs-bar">
          <button class="yq-tab ${currentMode === 'multiple_choice' ? 'active' : ''}" data-mode="multiple_choice">
            <span class="yq-tab-icon">⚡</span> Multiple Choice
          </button>
          <button class="yq-tab ${currentMode === 'open_ended' ? 'active' : ''}" data-mode="open_ended">
            <span class="yq-tab-icon">✍️</span> Stichwörter & Detail
          </button>
          <button class="yq-tab ${currentMode === 'facts' ? 'active' : ''}" data-mode="facts">
            <span class="yq-tab-icon">📋</span> Fakten-Dossier (${currentQuizData.key_facts?.length || 0})
          </button>
        </div>

        <!-- Detail Filter Pills (for questions) -->
        ${currentMode !== 'facts' ? `
          <div class="yq-filter-bar">
            <span class="yq-filter-label">Detailgrad:</span>
            <button class="yq-pill ${currentFilter === 'core' ? 'active' : ''}" data-filter="core">
              🔥 Kernfakten (Wichtigste zuerst)
            </button>
            <button class="yq-pill ${currentFilter === 'advanced' ? 'active' : ''}" data-filter="advanced">
              📈 Vertiefung
            </button>
            <button class="yq-pill ${currentFilter === 'expert' ? 'active' : ''}" data-filter="expert">
              🔍 Experten-Details & Zahlen
            </button>
            <button class="yq-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">
              Alle (${currentMode === 'multiple_choice' ? currentQuizData.multiple_choice?.length || 0 : currentQuizData.open_ended?.length || 0})
            </button>
          </div>
        ` : ''}

        <!-- Main Body -->
        <div class="yq-modal-body" id="yq-modal-body">
          ${renderBodyContent(questions)}
        </div>

        <!-- Footer -->
        <div class="yq-modal-footer">
          <div class="yq-footer-left">
            ${currentMode === 'multiple_choice' ? getScoreBadge() : ''}
          </div>
          <div class="yq-footer-right">
            <button class="yq-btn yq-btn-ghost" id="yq-refresh-quiz-btn" title="Quiz neu von Gemini generieren lassen">
              🔄 Neu generieren
            </button>
          </div>
        </div>
      </div>
    `;

    attachUIEventListeners(questions);
  }

  function getScoreBadge() {
    const questions = currentQuizData.multiple_choice || [];
    let correct = 0;
    let answered = 0;
    for (const q of questions) {
      if (mcAnswers[q.id]) {
        answered++;
        if (mcAnswers[q.id].isCorrect) correct++;
      }
    }
    if (answered === 0) return `<span class="yq-score-tag">Bereit zum Quizzen!</span>`;
    return `<span class="yq-score-tag">Punkte: <strong>${correct}</strong> / ${answered} (${Math.round((correct / answered) * 100)}%)</span>`;
  }

  function renderBodyContent(questions) {
    if (currentMode === 'facts') {
      return renderFactsDossier();
    }

    if (!questions || questions.length === 0) {
      return `
        <div class="yq-empty-state">
          <p>Keine Fragen in dieser Kategorie vorhanden.</p>
          <button class="yq-btn yq-btn-primary" id="yq-show-all-btn">Alle Fragen anzeigen</button>
        </div>
      `;
    }

    if (currentQuestionIndex >= questions.length) {
      return renderQuizCompletedView(questions);
    }

    const currentQ = questions[currentQuestionIndex];
    if (currentMode === 'multiple_choice') {
      return renderMultipleChoiceQuestion(currentQ, currentQuestionIndex, questions.length);
    } else {
      return renderOpenEndedQuestion(currentQ, currentQuestionIndex, questions.length);
    }
  }

  function renderMultipleChoiceQuestion(q, idx, total) {
    const answerState = mcAnswers[q.id];
    const isAnswered = !!answerState;

    // Badges for importance
    let badgeClass = 'yq-badge-core';
    let badgeText = '🔥 KERNFAKT';
    if (q.importance === 'medium' || q.detail_level === 'advanced') {
      badgeClass = 'yq-badge-adv';
      badgeText = '📈 VERTIEFUNG';
    } else if (q.importance === 'deep' || q.detail_level === 'expert') {
      badgeClass = 'yq-badge-exp';
      badgeText = '🔍 EXPERTEN-DETAIL';
    }

    return `
      <div class="yq-question-container">
        <!-- Progress Bar -->
        <div class="yq-progress-wrapper">
          <div class="yq-progress-info">
            <span class="yq-q-count">Frage ${idx + 1} von ${total}</span>
            <span class="yq-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="yq-progress-bar">
            <div class="yq-progress-fill" style="width: ${((idx + 1) / total) * 100}%"></div>
          </div>
        </div>

        <!-- Question Title -->
        <h4 class="yq-question-text">${escapeHtml(q.question)}</h4>

        <!-- Options Grid -->
        <div class="yq-options-grid">
          ${q.options.map((opt, oIdx) => {
            let stateClass = '';
            let indicator = String.fromCharCode(65 + oIdx); // A, B, C, D
            if (isAnswered) {
              if (oIdx === q.correct_index) {
                stateClass = 'yq-opt-correct';
                indicator = '✓';
              } else if (oIdx === answerState.selectedIndex) {
                stateClass = 'yq-opt-wrong';
                indicator = '✗';
              } else {
                stateClass = 'yq-opt-disabled';
              }
            }
            return `
              <button class="yq-option-btn ${stateClass}" data-q-id="${q.id}" data-opt-idx="${oIdx}" ${isAnswered ? 'disabled' : ''}>
                <span class="yq-opt-letter">${indicator}</span>
                <span class="yq-opt-text">${escapeHtml(opt)}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Explanation card after answering -->
        ${isAnswered ? `
          <div class="yq-explanation-card ${answerState.isCorrect ? 'yq-card-success' : 'yq-card-alert'}">
            <div class="yq-explanation-header">
              <span class="yq-expl-icon">${answerState.isCorrect ? '🎯 Richtig!' : '💡 Erklärung:'}</span>
              <strong>${answerState.isCorrect ? 'Exzellent erfasst' : 'Wichtiger Zusammenhang:'}</strong>
            </div>
            <p class="yq-explanation-text">${escapeHtml(q.explanation)}</p>
            ${q.fact_summary ? `
              <div class="yq-fact-callout">
                <span class="yq-fact-tag">📌 KERNFAKT ZUM MERKEN:</span>
                <p>${escapeHtml(q.fact_summary)}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Next / Prev Controls -->
        <div class="yq-q-nav">
          <button class="yq-btn yq-btn-secondary" id="yq-prev-btn" ${idx === 0 ? 'disabled' : ''}>
            ◀ Vorherige
          </button>
          ${isAnswered ? `
            <button class="yq-btn yq-btn-primary" id="yq-next-btn">
              ${idx + 1 === total ? 'Ergebnis anzeigen 🏆' : 'Nächste Frage ▶'}
            </button>
          ` : `
            <span class="yq-select-hint">Wähle eine Option aus</span>
          `}
        </div>
      </div>
    `;
  }

  function renderOpenEndedQuestion(q, idx, total) {
    const existing = openAnswers[q.id] || { text: '', evaluation: null };
    const hasEvaluated = !!existing.evaluation;

    let badgeClass = 'yq-badge-core';
    let badgeText = '🔥 KERNFAKT';
    if (q.importance === 'medium' || q.detail_level === 'advanced') {
      badgeClass = 'yq-badge-adv';
      badgeText = '📈 VERTIEFUNG';
    } else if (q.importance === 'deep' || q.detail_level === 'expert') {
      badgeClass = 'yq-badge-exp';
      badgeText = '🔍 EXPERTEN-DETAIL';
    }

    return `
      <div class="yq-question-container">
        <!-- Progress Bar -->
        <div class="yq-progress-wrapper">
          <div class="yq-progress-info">
            <span class="yq-q-count">Detail-Frage ${idx + 1} von ${total}</span>
            <span class="yq-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="yq-progress-bar">
            <div class="yq-progress-fill" style="width: ${((idx + 1) / total) * 100}%"></div>
          </div>
        </div>

        <h4 class="yq-question-text">${escapeHtml(q.question)}</h4>
        <p class="yq-open-hint">Beantworte die Frage mit eigenen Worten oder nenne die wesentlichen Stichwörter und Zahlen.</p>

        <!-- User Answer Input Area -->
        <div class="yq-input-group">
          <textarea id="yq-open-input" class="yq-textarea" placeholder="Deine Stichworte oder Antwort hier eingeben..." rows="3" ${hasEvaluated ? 'disabled' : ''}>${escapeHtml(existing.text)}</textarea>
        </div>

        <!-- Evaluation Buttons -->
        ${!hasEvaluated ? `
          <div class="yq-open-actions">
            <button class="yq-btn yq-btn-primary" id="yq-submit-open-btn">
              ✍️ Antwort prüfen (Stichworte & KI)
            </button>
            <button class="yq-btn yq-btn-ghost" id="yq-peek-solution-btn">
              Musterlösung direkt ansehen
            </button>
          </div>
        ` : ''}

        <!-- Evaluation Results Card -->
        ${hasEvaluated ? `
          <div class="yq-eval-card">
            <div class="yq-eval-header">
              <span class="yq-eval-score-badge ${existing.evaluation.score >= 60 ? 'good' : 'need-work'}">
                ${existing.evaluation.score}% Übereinstimmung
              </span>
              <p class="yq-eval-feedback">${escapeHtml(existing.evaluation.feedback)}</p>
            </div>

            <!-- Expected Keywords Checked -->
            <div class="yq-keywords-box">
              <span class="yq-kw-title">Erwartete Schlüsselbegriffe:</span>
              <div class="yq-kw-list">
                ${(q.keywords || []).map(kw => {
                  const covered = (existing.evaluation.covered_keywords || []).some(k => k.toLowerCase() === kw.toLowerCase());
                  return `<span class="yq-kw-pill ${covered ? 'covered' : 'missing'}">${covered ? '✓' : '○'} ${escapeHtml(kw)}</span>`;
                }).join('')}
              </div>
            </div>

            <!-- Model Solution -->
            <div class="yq-model-answer-box">
              <strong>📖 Musterlösung:</strong>
              <p>${escapeHtml(q.model_answer)}</p>
            </div>

            ${q.explanation ? `
              <div class="yq-explanation-box">
                <strong>💡 Didaktischer Hintergrund:</strong>
                <p>${escapeHtml(q.explanation)}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Nav -->
        <div class="yq-q-nav">
          <button class="yq-btn yq-btn-secondary" id="yq-prev-btn" ${idx === 0 ? 'disabled' : ''}>
            ◀ Vorherige
          </button>
          <button class="yq-btn yq-btn-primary" id="yq-next-btn">
            ${idx + 1 === total ? 'Ergebnis anzeigen 🏆' : 'Nächste Frage ▶'}
          </button>
        </div>
      </div>
    `;
  }

  function renderFactsDossier() {
    const facts = currentQuizData.key_facts || [];
    const summary = currentQuizData.video_summary || '';

    return `
      <div class="yq-facts-dossier">
        <div class="yq-summary-card">
          <h4>📌 Video-Kernaussagen auf einen Blick:</h4>
          <p>${escapeHtml(summary)}</p>
        </div>

        <h4 class="yq-dossier-heading">Extrahierte Fakten & Kennzahlen (${facts.length}):</h4>
        <div class="yq-facts-grid">
          ${facts.map((f, i) => {
            let catColor = 'var(--yq-primary)';
            if (f.category === 'Geopolitik') catColor = '#3b82f6';
            if (f.category === 'Wirtschaft') catColor = '#10b981';
            if (f.category === 'Strategie') catColor = '#8b5cf6';
            if (f.category === 'Historie') catColor = '#f59e0b';

            return `
              <div class="yq-fact-item">
                <div class="yq-fact-header">
                  <span class="yq-fact-cat" style="background: ${catColor}22; color: ${catColor}">
                    ${escapeHtml(f.category || 'Fakt')}
                  </span>
                  <span class="yq-fact-importance ${f.importance || 'high'}">
                    ${f.importance === 'high' ? '🔥 Wichtig' : f.importance === 'medium' ? '📈 Vertiefung' : '🔍 Detail'}
                  </span>
                </div>
                <p class="yq-fact-desc">${escapeHtml(f.fact)}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderQuizCompletedView(questions) {
    let score = 0;
    let total = questions.length;
    let answered = 0;

    if (currentMode === 'multiple_choice') {
      questions.forEach(q => {
        if (mcAnswers[q.id]) {
          answered++;
          if (mcAnswers[q.id].isCorrect) score++;
        }
      });
    } else {
      questions.forEach(q => {
        if (openAnswers[q.id]) {
          answered++;
          score += (openAnswers[q.id].evaluation?.score || 0);
        }
      });
      score = Math.round(score / (total || 1));
    }

    const pct = currentMode === 'multiple_choice' ? Math.round((score / (total || 1)) * 100) : score;

    // Save result to background history
    chrome.runtime.sendMessage({
      type: 'SAVE_QUIZ_RESULT',
      result: {
        videoId: currentVideoId,
        title: currentQuizData.videoTitle,
        mode: currentMode,
        score: pct,
        totalQuestions: total,
        date: new Date().toLocaleDateString('de-DE')
      }
    });

    let verdict = "Gute Arbeit!";
    if (pct >= 85) verdict = "Hervorragend! Du hast die Fakten und Zusammenhänge meisterhaft verinnerlicht.";
    else if (pct >= 60) verdict = "Solide Leistung! Die Grundlagen sitzen. Schau dir die Details im Fakten-Dossier an.";
    else verdict = "Guter Versuch! Geopolitische Fakten sind komplex. Wiederhole das Quiz oder lies das Fakten-Dossier durch.";

    return `
      <div class="yq-completed-view">
        <div class="yq-trophy-badge">🏆</div>
        <h3>Quiz abgeschlossen!</h3>
        <p class="yq-score-headline">Dein Ergebnis: <span class="yq-big-pct">${pct}%</span></p>
        <p class="yq-verdict">${verdict}</p>

        <div class="yq-actions-row">
          <button class="yq-btn yq-btn-primary" id="yq-restart-btn">
            🔄 Quiz wiederholen
          </button>
          <button class="yq-btn yq-btn-secondary" id="yq-switch-mode-btn">
            ${currentMode === 'multiple_choice' ? '✍️ Zum Stichwort-Modus wechseln' : '⚡ Zum Multiple Choice wechseln'}
          </button>
          <button class="yq-btn yq-btn-ghost" id="yq-view-facts-btn">
            📋 Alle Fakten nachlesen
          </button>
        </div>
      </div>
    `;
  }

  // Attach event listeners for modal controls
  function attachUIEventListeners(questions) {
    // Header controls
    document.getElementById('yq-close-btn')?.addEventListener('click', closeQuizModal);
    document.getElementById('yq-min-btn')?.addEventListener('click', toggleMinimize);

    // Refresh quiz with Gemini button
    document.getElementById('yq-refresh-quiz-btn')?.addEventListener('click', async () => {
      if (confirm('Möchtest du das Quiz mit Gemini neu generieren lassen?')) {
        currentQuizData = null;
        mcAnswers = {};
        openAnswers = {};
        currentQuestionIndex = 0;
        await openQuizModal();
      }
    });

    // Tab switcher
    document.querySelectorAll('.yq-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode) {
          currentMode = mode;
          currentQuestionIndex = 0;
          renderQuizUI();
        }
      });
    });

    // Filter pills
    document.querySelectorAll('.yq-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const filter = pill.dataset.filter;
        if (filter) {
          currentFilter = filter;
          currentQuestionIndex = 0;
          renderQuizUI();
        }
      });
    });

    // Show all questions empty button
    document.getElementById('yq-show-all-btn')?.addEventListener('click', () => {
      currentFilter = 'all';
      currentQuestionIndex = 0;
      renderQuizUI();
    });

    // Navigation buttons
    document.getElementById('yq-prev-btn')?.addEventListener('click', () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuizUI();
      }
    });

    document.getElementById('yq-next-btn')?.addEventListener('click', () => {
      currentQuestionIndex++;
      renderQuizUI();
    });

    // Completion view buttons
    document.getElementById('yq-restart-btn')?.addEventListener('click', () => {
      if (currentMode === 'multiple_choice') mcAnswers = {};
      else openAnswers = {};
      currentQuestionIndex = 0;
      renderQuizUI();
    });

    document.getElementById('yq-switch-mode-btn')?.addEventListener('click', () => {
      currentMode = currentMode === 'multiple_choice' ? 'open_ended' : 'multiple_choice';
      currentQuestionIndex = 0;
      renderQuizUI();
    });

    document.getElementById('yq-view-facts-btn')?.addEventListener('click', () => {
      currentMode = 'facts';
      renderQuizUI();
    });

    // Multiple Choice Option Selection
    document.querySelectorAll('.yq-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.dataset.qId;
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ || currentQ.id !== qId) return;

        const isCorrect = optIdx === currentQ.correct_index;
        mcAnswers[qId] = { selectedIndex: optIdx, isCorrect };
        renderQuizUI();
      });
    });

    // Open Ended Submission & Evaluation
    const submitOpenBtn = document.getElementById('yq-submit-open-btn');
    const peekSolutionBtn = document.getElementById('yq-peek-solution-btn');
    const openInput = document.getElementById('yq-open-input');

    if (submitOpenBtn && openInput) {
      submitOpenBtn.addEventListener('click', async () => {
        const answerText = openInput.value.trim();
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ) return;

        submitOpenBtn.disabled = true;
        submitOpenBtn.innerText = 'Prüfe Antwort mit Gemini...';

        try {
          const evalRes = await new Promise(res => {
            chrome.runtime.sendMessage({
              type: 'EVALUATE_OPEN_ANSWER',
              payload: {
                question: currentQ.question,
                userAnswer: answerText,
                keywords: currentQ.keywords || [],
                modelAnswer: currentQ.model_answer
              }
            }, res);
          });

          const result = (evalRes && evalRes.success) ? evalRes.result : {
            score: 50,
            feedback: "Konnte nicht vollständig von Gemini bewertet werden.",
            covered_keywords: []
          };

          openAnswers[currentQ.id] = {
            text: answerText,
            evaluation: result
          };

          renderQuizUI();
        } catch (e) {
          console.error(e);
          submitOpenBtn.disabled = false;
          submitOpenBtn.innerText = 'Erneut versuchen';
        }
      });
    }

    if (peekSolutionBtn) {
      peekSolutionBtn.addEventListener('click', () => {
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ) return;
        openAnswers[currentQ.id] = {
          text: openInput ? openInput.value : '',
          evaluation: {
            score: 0,
            feedback: "Musterlösung aufgerufen.",
            covered_keywords: []
          }
        };
        renderQuizUI();
      });
    }
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

  // Initialize extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
