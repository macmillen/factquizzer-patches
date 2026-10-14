// page-bridge.js - Runs in YouTube MAIN world to access internal player response & caption tracks
(function() {
  'use strict';

  function extractPlayerData() {
    let playerResponse = null;

    try {
      // 1. Try movie_player element
      const playerEl = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      if (playerEl && typeof playerEl.getPlayerResponse === 'function') {
        playerResponse = playerEl.getPlayerResponse();
      }
    } catch (e) {
      // Ignore
    }

    if (!playerResponse && window.ytInitialPlayerResponse) {
      playerResponse = window.ytInitialPlayerResponse;
    }

    if (!playerResponse && window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
      try {
        const raw = window.ytplayer.config.args.raw_player_response;
        playerResponse = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        // Ignore
      }
    }

    const videoDetails = playerResponse?.videoDetails || {};
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    // Also try to grab video metadata directly from DOM if needed
    const title = videoDetails.title || document.title.replace(' - YouTube', '').trim();
    const author = videoDetails.author || document.querySelector('#owner #channel-name a')?.innerText?.trim() || '';
    const videoId = videoDetails.videoId || new URLSearchParams(window.location.search).get('v') || '';
    const lengthSeconds = videoDetails.lengthSeconds || 0;
    const shortDescription = videoDetails.shortDescription || '';

    return {
      videoId,
      title,
      author,
      lengthSeconds,
      shortDescription,
      captionTracks: captionTracks.map(track => ({
        baseUrl: track.baseUrl,
        name: track.name?.simpleText || track.name?.runs?.[0]?.text || '',
        languageCode: track.languageCode,
        kind: track.kind || 'standard',
        isTranslatable: track.isTranslatable || false
      }))
    };
  }

  // Listen for requests from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === 'YQ_CONTENT' && event.data.type === 'GET_VIDEO_METADATA') {
      const data = extractPlayerData();
      window.postMessage({
        source: 'YQ_BRIDGE',
        type: 'VIDEO_METADATA_RESPONSE',
        requestId: event.data.requestId,
        data: data
      }, '*');
    }
  });

  // Notify content script when YouTube finishes SPA navigation
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(() => {
      const data = extractPlayerData();
      window.postMessage({
        source: 'YQ_BRIDGE',
        type: 'YT_NAVIGATE_FINISH',
        data: data
      }, '*');
    }, 500);
  });
})();
