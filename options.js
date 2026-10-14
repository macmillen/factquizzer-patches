// options.js
const DEFAULT_KEY = "";
const DEFAULT_MODEL = "gemini-3-flash-preview";

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const toggleKeyBtn = document.getElementById('toggle-key-visibility');
  const modelSelect = document.getElementById('model-select');
  const testConnBtn = document.getElementById('test-connection-btn');
  const testResult = document.getElementById('test-result');
  const autoOpenToggle = document.getElementById('auto-open-toggle');
  const defaultModeSelect = document.getElementById('default-mode-select');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  const saveStatus = document.getElementById('save-status');

  // Load existing settings safely
  let data = {};
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      data = await chrome.storage.local.get([
        'apiKey', 'model', 'autoOpenOnEnd', 'defaultMode'
      ]);
    } catch (e) {
      console.warn('Storage read warning:', e);
    }
  }

  apiKeyInput.value = data.apiKey || DEFAULT_KEY;
  modelSelect.value = data.model || DEFAULT_MODEL;
  autoOpenToggle.checked = data.autoOpenOnEnd !== undefined ? data.autoOpenOnEnd : true;
  defaultModeSelect.value = data.defaultMode || 'multiple_choice';

  // Toggle key visibility
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.innerText = 'Verbergen';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.innerText = 'Anzeigen';
    }
  });

  // Test Connection
  testConnBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    if (!key) {
      testResult.className = 'test-result-box error';
      testResult.innerText = '❌ Bitte API-Key eingeben.';
      return;
    }

    testResult.className = 'test-result-box';
    testResult.innerText = '⏳ Verbindung wird getestet...';
    testConnBtn.disabled = true;

    const startTime = performance.now();
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }]
        })
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.ok) {
        testResult.className = 'test-result-box success';
        testResult.innerText = `✓ Verbindung erfolgreich (${elapsed}ms)! Modell ist einsatzbereit.`;
      } else {
        const errText = await response.text();
        let errMsg = `Fehler (${response.status})`;
        try {
          const jsonErr = JSON.parse(errText);
          if (jsonErr.error?.message) errMsg = jsonErr.error.message;
        } catch (e) {}
        testResult.className = 'test-result-box error';
        testResult.innerText = `❌ ${errMsg}`;
      }
    } catch (e) {
      testResult.className = 'test-result-box error';
      testResult.innerText = `❌ Netzwerkfehler: ${e.message}`;
    } finally {
      testConnBtn.disabled = false;
    }
  });

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const autoOpenOnEnd = autoOpenToggle.checked;
    const defaultMode = defaultModeSelect.value;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        apiKey,
        model,
        autoOpenOnEnd,
        defaultMode
      });
    } else {
      localStorage.setItem('yq_apiKey', apiKey);
      localStorage.setItem('yq_model', model);
    }

    saveStatus.innerText = '✓ Gespeichert!';
    setTimeout(() => {
      saveStatus.innerText = '';
    }, 2500);
  });

  // Clear Cache
  clearCacheBtn.addEventListener('click', async () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const all = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(all).filter(k => k.startsWith('quiz_'));
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        alert(`${keysToRemove.length} zwischengespeicherte Quizzes wurden gelöscht.`);
      } else {
        alert('Der Quiz-Cache war bereits leer.');
      }
    } else {
      alert('Der Quiz-Cache ist leer.');
    }
  });

  // Clear History
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Möchtest du deinen gesamten Quiz-Verlauf wirklich löschen?')) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove(['quizHistory']);
      }
      alert('Lernverlauf wurde gelöscht.');
    }
  });
});
