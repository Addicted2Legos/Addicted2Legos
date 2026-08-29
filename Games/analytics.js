// Shared play-tracking snippet for every game's entry page.
// Logs one row to Supabase (game_plays) per page load: game name, a
// per-browser session id, device/browser, referrer source, and a coarse
// country/region from a free IP geolocation lookup. When the visitor leaves
// the page it reports back how long they stayed. Never throws -- a failure
// here must never break a game.
//
// Usage: set `window.GAME_NAME` to the display name before this script runs,
// then include this file. If GAME_NAME isn't set, the file/folder name is
// used as a fallback.
//
// Optional: a game can call `window.GameAnalytics.markCompleted()` when the
// player reaches a defined "finished" state (won, beat the level, hit a
// natural end), to track completion rate. Nothing calls this automatically --
// wiring it into a specific game's win condition is a per-game follow-up.
(function () {
  var SUPABASE_URL = 'https://tgdypcnzpojjxuxizjvh.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable__4owv0oy0QoOnTNYBIOPow_-BDrQ7iS';
  var REST_URL = SUPABASE_URL + '/rest/v1/game_plays';
  var GEO_LOOKUP_URL = 'https://ipwho.is/';
  var GEO_CACHE_KEY = 'ga_geo_cache_v1';
  var SESSION_KEY = 'ga_session_id_v1';

  var startedAt = Date.now();
  var playId = createPlayId();
  var durationSent = false;

  function createPlayId() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) {}
    return 'play_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }

  function fallbackNameFromPath() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || 'index.html';
    var name = last.replace(/\.html?$/i, '');
    if (/^index$/i.test(name) && parts.length > 1) {
      name = parts[parts.length - 2];
    }
    try {
      return decodeURIComponent(name);
    } catch (e) {
      return name;
    }
  }

  function getSessionId() {
    try {
      var id = localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
        localStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) {
      return null;
    }
  }

  function detectDevice() {
    var ua = navigator.userAgent || '';
    if (/iPad/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return 'Tablet';
    if (/Tablet(?!.*Mobile)/i.test(ua)) return 'Tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function detectBrowser() {
    var ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
    return 'Other';
  }

  function detectReferrerHost() {
    if (!document.referrer) return null;
    try {
      var host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host === window.location.hostname) return null; // internal nav between games counts as Direct
      return host;
    } catch (e) {
      return null;
    }
  }

  function getCachedGeo() {
    try {
      var raw = sessionStorage.getItem(GEO_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setCachedGeo(geo) {
    try {
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
    } catch (e) {
      // ignore
    }
  }

  function fetchGeo() {
    var cached = getCachedGeo();
    if (cached) return Promise.resolve(cached);
    return fetch(GEO_LOOKUP_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var geo = {
          country: (data && data.success !== false && data.country) || null,
          region: (data && data.success !== false && data.region) || null
        };
        setCachedGeo(geo);
        return geo;
      })
      .catch(function () {
        return { country: null, region: null };
      });
  }

  var supabaseLibPromise = null;
  function ensureSupabaseLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (!supabaseLibPromise) {
      supabaseLibPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return supabaseLibPromise;
  }

  var clientPromise = null;
  function getClient() {
    if (!clientPromise) {
      clientPromise = ensureSupabaseLib().then(function () {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      });
    }
    return clientPromise;
  }

  function logPlay() {
    var gameName = window.GAME_NAME || fallbackNameFromPath();
    var sessionId = getSessionId();

    Promise.all([getClient(), fetchGeo()])
      .then(function (results) {
        var client = results[0];
        var geo = results[1];
        return client.from('game_plays').insert({
          play_id: playId,
          game_name: gameName,
          session_id: sessionId,
          country: geo.country,
          region: geo.region,
          referrer: document.referrer || null,
          referrer_host: detectReferrerHost(),
          device_type: detectDevice(),
          browser: detectBrowser(),
          user_agent: navigator.userAgent
        });
      })
      .catch(function (err) {
        console.warn('analytics: failed to log play', err);
      });
  }

  // Raw fetch (not the supabase-js client) so this can run synchronously
  // enough to complete during page unload -- `keepalive` lets the browser
  // finish the request after the page starts closing.
  function patchOwnRow(fields) {
    try {
      fetch(REST_URL + '?play_id=eq.' + encodeURIComponent(playId), {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(fields)
      }).catch(function () {});
    } catch (e) {
      // ignore
    }
  }

  function sendDuration() {
    if (durationSent) return;
    durationSent = true;
    var seconds = Math.round((Date.now() - startedAt) / 1000);
    patchOwnRow({ duration_seconds: seconds });
  }

  function markCompleted() {
    patchOwnRow({ completed: true });
  }

  function logError(message, source, lineno, colno, stack) {
    var gameName = window.GAME_NAME || fallbackNameFromPath();
    getClient()
      .then(function (client) {
        return client.from('game_errors').insert({
          game_name: gameName,
          session_id: getSessionId(),
          message: String(message || '').slice(0, 2000),
          source: source ? String(source).slice(0, 500) : null,
          lineno: lineno || null,
          colno: colno || null,
          stack: stack ? String(stack).slice(0, 4000) : null
        });
      })
      .catch(function () {});
  }

  window.addEventListener('error', function (event) {
    logError(event.message, event.filename, event.lineno, event.colno, event.error && event.error.stack);
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    logError(
      (reason && reason.message) || String(reason),
      null,
      null,
      null,
      reason && reason.stack
    );
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendDuration();
  });
  window.addEventListener('pagehide', sendDuration);

  window.GameAnalytics = { markCompleted: markCompleted };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    logPlay();
  } else {
    document.addEventListener('DOMContentLoaded', logPlay);
  }
})();
