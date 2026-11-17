const toggle = document.getElementById('toggle');
const state = document.getElementById('state');

function runInPage(tabId, func, args = []) {
  return chrome.scripting
    .executeScript({ target: { tabId }, world: 'MAIN', func, args })
    .then((r) => r[0] && r[0].result);
}

// Runs inside the Studio page.
function readSetting() {
  try { return JSON.parse(localStorage.getItem('classicStudio.settings') || '{}').flags !== false; } catch (e) { return true; }
}
function writeSetting(on) {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('classicStudio.settings') || '{}'); } catch (e) {}
  s.flags = on;
  localStorage.setItem('classicStudio.settings', JSON.stringify(s));
  location.reload();
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/studio\.youtube\.com\//.test(tab.url || '')) {
    toggle.disabled = true;
    state.textContent = 'Open YouTube Studio first';
    return;
  }
  toggle.checked = await runInPage(tab.id, readSetting);
  state.textContent = toggle.checked ? 'On' : 'Off';

  toggle.onchange = async () => {
    state.textContent = toggle.checked ? 'On' : 'Off';
    await runInPage(tab.id, writeSetting, [toggle.checked]);
    setTimeout(() => window.close(), 150);
  };
})();
