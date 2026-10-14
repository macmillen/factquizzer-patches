// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const videoTitle = document.getElementById('video-title');
  const startQuizBtn = document.getElementById('start-quiz-btn');
  const totalQuizzesEl = document.getElementById('total-quizzes');
  const avgScoreEl = document.getElementById('avg-score');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const optionsLink = document.getElementById('options-link');

  openSettingsBtn.addEventListener('click', openOptions);
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    openOptions();
  });

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  // Check current active tab safely
  let tab = null;
  if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.query === 'function') {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
    } catch (e) {
      console.warn('Tabs query not available:', e);
    }
  }

  let isYouTubeWatch = false;

  if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
    isYouTubeWatch = true;
    statusDot.className = 'dot dot-active';
    statusText.innerText = 'YouTube-Video aktiv';
    videoTitle.innerText = tab.title ? tab.title.replace(' - YouTube', '') : 'Aktuelles Video';
    startQuizBtn.disabled = false;

    startQuizBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.scripting) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const btn = document.getElementById('yq-player-btn') || document.getElementById('yq-action-btn');
            if (btn) btn.click();
            else window.location.reload();
          }
        });
      }
      window.close();
    });
  } else {
    statusDot.className = 'dot dot-inactive';
    statusText.innerText = 'Kein YouTube-Video aktiv';
    videoTitle.innerText = 'Öffne ein YouTube-Video zum Quizzen.';
    startQuizBtn.innerText = 'YouTube öffnen';
    startQuizBtn.disabled = false;
    startQuizBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: 'https://www.youtube.com' });
      } else {
        window.open('https://www.youtube.com', '_blank');
      }
      window.close();
    });
  }

  // Load stats and history from storage safely
  let history = [];
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const data = await chrome.storage.local.get(['quizHistory']);
      history = data.quizHistory || [];
    } catch (e) {}
  }

  totalQuizzesEl.innerText = history.length;
  if (history.length > 0) {
    const totalScore = history.reduce((acc, h) => acc + (h.score || 0), 0);
    const avg = Math.round(totalScore / history.length);
    avgScoreEl.innerText = `${avg}%`;

    historyList.innerHTML = history.slice(0, 5).map(h => `
      <div class="history-item">
        <span class="h-title" title="${escapeHtml(h.title)}">${escapeHtml(h.title)}</span>
        <span class="h-score">${h.score}%</span>
      </div>
    `).join('');
  }

  clearHistoryBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ quizHistory: [] });
    totalQuizzesEl.innerText = '0';
    avgScoreEl.innerText = '-%';
    historyList.innerHTML = '<div class="empty-hint">Verlauf geleert.</div>';
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});
