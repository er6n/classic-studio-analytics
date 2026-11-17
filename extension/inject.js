// Runs inside the Studio page itself, before YouTube's own code.
// YouTube ships new designs behind "experiment flags" (on/off switches in a
// config object called ytcfg). This script intercepts that config and flips
// any switch that looks like it belongs to the new Insights design, so Studio
// hopefully falls back to the classic Analytics pages.
(() => {
  'use strict';
  const KEY = 'classicStudio.settings';

  const settings = { flags: true, overrides: {} };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

  // Shared state the popup's "Copy debug info" button reads.
  const state = (window.__classicStudio = { settings, raw: {}, changed: {}, hooked: false });

  // Internally YouTube calls the new Insights page the "analytics hub"
  // (e.g. WebFEAllStudioByChannel__enable_analytics_hub_web).
  const MATCH = /insight|analytics_hub/i;
  // Flags that keep you on the OLD design when they are true.
  const KEEP_OLD = /holdback|disable|kill|opt_?out|rollback|legacy|classic/i;

  function desired(name, value) {
    if (Object.prototype.hasOwnProperty.call(settings.overrides, name)) return settings.overrides[name];
    if (!settings.flags || !MATCH.test(name)) return undefined;
    const isBool = typeof value === 'boolean' || value === 'true' || value === 'false';
    if (!isBool) return undefined;
    const want = KEEP_OLD.test(name);
    return typeof value === 'string' ? String(want) : want;
  }

  function wrapFlags(flags) {
    if (!flags || typeof flags !== 'object' || flags.__classicWrapped) return flags;
    for (const k of Object.keys(flags)) if (MATCH.test(k)) state.raw[k] = flags[k];
    return new Proxy(flags, {
      get(t, k, r) {
        if (k === '__classicWrapped') return true;
        const v = Reflect.get(t, k, r);
        if (typeof k !== 'string') return v;
        const d = desired(k, v);
        if (d === undefined) return v;
        if (d !== v) state.changed[k] = { from: v, to: d };
        return d;
      },
      set(t, k, v, r) {
        if (typeof k === 'string' && MATCH.test(k)) state.raw[k] = v;
        return Reflect.set(t, k, v, r);
      },
    });
  }

  function patchConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    for (const key of ['EXPERIMENT_FLAGS', 'EXPERIMENTS_FORCED_FLAGS']) {
      if (cfg[key] && !cfg[key].__classicWrapped) cfg[key] = wrapFlags(cfg[key]);
    }
  }

  function configObject(ytcfg) {
    try { if (ytcfg && typeof ytcfg.d === 'function') return ytcfg.d(); } catch (e) {}
    return (window.yt && window.yt.config_) || (ytcfg && ytcfg.data_);
  }

  function hookYtcfg(ytcfg) {
    if (!ytcfg || ytcfg.__classicHooked) return ytcfg;
    const origSet = ytcfg.set;
    if (typeof origSet === 'function') {
      ytcfg.set = function () {
        const r = origSet.apply(this, arguments);
        patchConfig(configObject(ytcfg));
        return r;
      };
    }
    try { Object.defineProperty(ytcfg, '__classicHooked', { value: true }); } catch (e) {}
    state.hooked = true;
    patchConfig(configObject(ytcfg));
    return ytcfg;
  }

  // Catch window.ytcfg the moment YouTube's inline script creates it.
  let current = window.ytcfg;
  if (current) hookYtcfg(current);
  try {
    Object.defineProperty(window, 'ytcfg', {
      configurable: true,
      enumerable: true,
      get() { return current; },
      set(v) { current = hookYtcfg(v); },
    });
  } catch (e) {}

  // ---- Send the new hub URLs to the classic Analytics pages ----
  // New:     /channel/UC.../analytics/hub_overview, /feed/analytics_hub_channel_content, ...
  // Classic: /channel/UC.../analytics/tab-overview/period-default, tab-content, tab-build_audience
  const CHANNEL_KEY = 'classicStudio.channel';
  const FEED_TABS = {
    analytics_hub_channel_overview: 'tab-overview',
    analytics_hub_channel_content: 'tab-content',
    analytics_hub_channel_audience: 'tab-build_audience',
    analytics_hub_channel_revenue: 'tab-earn_revenue',
    analytics_hub_channel_research: 'tab-research',
  };
  state.redirect = null;

  function classicUrl(path) {
    const ch = path.match(/\/channel\/(UC[\w-]{22})/);
    if (ch) { try { localStorage.setItem(CHANNEL_KEY, ch[1]); } catch (e) {} }
    let channel = ch && ch[1];
    if (!channel) { try { channel = localStorage.getItem(CHANNEL_KEY); } catch (e) {} }
    if (!channel) return null;

    if (/\/channel\/UC[\w-]{22}\/analytics\/hub_/.test(path)) {
      return `/channel/${channel}/analytics/tab-overview/period-default`;
    }
    const feed = path.match(/^\/feed\/(analytics_hub_channel_\w+)/);
    if (feed && FEED_TABS[feed[1]]) {
      return `/channel/${channel}/analytics/${FEED_TABS[feed[1]]}/period-default`;
    }
    return null;
  }

  function maybeRedirect(path) {
    if (!settings.flags) return false;
    const target = classicUrl(path || location.pathname);
    if (!target) return false;
    // Loop guard: if YouTube keeps bouncing us back, stop trying.
    let hops = [];
    try { hops = JSON.parse(sessionStorage.getItem('classicStudio.hops') || '[]'); } catch (e) {}
    hops = hops.filter((t) => Date.now() - t < 15000);
    if (hops.length >= 2) { state.redirect = { blocked: path, reason: 'loop' }; return false; }
    hops.push(Date.now());
    try { sessionStorage.setItem('classicStudio.hops', JSON.stringify(hops)); } catch (e) {}
    state.redirect = { from: path, to: target };
    location.replace(target);
    return true;
  }

  maybeRedirect(location.pathname);

  // Studio is a single-page app: catch in-app navigation to the hub too.
  for (const m of ['pushState', 'replaceState']) {
    const orig = history[m];
    history[m] = function (s, t, url) {
      if (url) {
        try {
          const p = new URL(url, location.href).pathname;
          if (classicUrl(p) && maybeRedirect(p)) return;
        } catch (e) {}
      }
      return orig.apply(this, arguments);
    };
  }

  // Safety net: keep re-wrapping in case YouTube replaces the flags object later.
  let ticks = 0;
  const timer = setInterval(() => {
    patchConfig(configObject(window.ytcfg));
    if (++ticks > 100) clearInterval(timer);
  }, 100);
})();
