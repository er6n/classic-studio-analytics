const $ = (id) => document.getElementById(id);
const status = (t) => ($('status').textContent = t);

async function studioTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/studio\.youtube\.com\//.test(tab.url || '')) return null;
  return tab;
}

function runInPage(tabId, func, args = []) {
  return chrome.scripting
    .executeScript({ target: { tabId }, world: 'MAIN', func, args })
    .then((r) => r[0] && r[0].result);
}

// ---- functions below run inside the Studio page ----
function readSettings() {
  try { return JSON.parse(localStorage.getItem('classicStudio.settings') || '{}'); } catch (e) { return {}; }
}
function writeSettings(patch) {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('classicStudio.settings') || '{}'); } catch (e) {}
  Object.assign(s, patch);
  localStorage.setItem('classicStudio.settings', JSON.stringify(s));
  location.reload();
}
function collectDebug() {
  const st = window.__classicStudio || {};
  const cfg = (window.yt && window.yt.config_) || (window.ytcfg && window.ytcfg.data_) || {};
  const rx = /insight|analytic|research|trend|explore|holdback|redesign|refresh|shelf/i;
  const flags = {};
  try {
    for (const k of Object.keys(cfg.EXPERIMENT_FLAGS || {})) if (rx.test(k)) flags[k] = cfg.EXPERIMENT_FLAGS[k];
  } catch (e) {}
  const tags = new Set();
  document.querySelectorAll('*').forEach((el) => {
    const t = el.tagName.toLowerCase();
    if (t.includes('-') && /analytic|insight|research|explore|shelf|card|trend/.test(t)) tags.add(t);
  });
  const links = [...document.querySelectorAll('a[href*="analytics"], a[href*="insight"]')]
    .map((a) => a.getAttribute('href').replace(/UC[\w-]{22}/g, 'UC_ID'))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 40);
  return JSON.stringify({
    v: 2,
    path: location.pathname.replace(/UC[\w-]{22}/g, 'UC_ID'),
    hooked: !!st.hooked,
    redirect: JSON.parse(JSON.stringify(st.redirect || null).replace(/UC[\w-]{22}/g, 'UC_ID')),
    settings: st.settings,
    insightFlagsRaw: st.raw,
    changed: st.changed,
    relatedFlags: flags,
    elements: [...tags].sort(),
    links,
    clientVersion: cfg.INNERTUBE_CLIENT_VERSION,
  });
}
// ----------------------------------------------------

(async () => {
  const tab = await studioTab();
  if (!tab) {
    status('Open studio.youtube.com in this tab first.');
    $('flags').disabled = $('reload').disabled = $('debug').disabled = true;
    return;
  }
  const s = (await runInPage(tab.id, readSettings)) || {};
  $('flags').checked = s.flags !== false;

  $('reload').onclick = async () => {
    await runInPage(tab.id, writeSettings, [{ flags: $('flags').checked }]);
    window.close();
  };

  $('debug').onclick = async () => {
    let text = '';
    try {
      text = await runInPage(tab.id, collectDebug);
      await navigator.clipboard.writeText(text);
      status('Copied. Paste it back to Claude.');
    } catch (e) {
      if (!text) return status('Failed: ' + e.message);
      // Clipboard blocked: show it so it can be copied by hand.
      const box = document.createElement('textarea');
      box.value = text;
      box.style.cssText = 'width:100%;height:120px;margin-top:8px';
      document.body.appendChild(box);
      box.select();
      status('Press Ctrl+C to copy, then paste it to Claude.');
    }
  };
})();
