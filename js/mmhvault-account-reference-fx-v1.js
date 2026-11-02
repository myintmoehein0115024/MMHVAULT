/* MMHVAULT · Account reference FX V1
 * Shared with the existing Asia Currency Rates public source (USD base).
 * Never transmits account balances, transactions or identifiers.
 * Saved financial/accounting rates and explicit account overrides take priority.
 */
(() => {
  'use strict';
  if (window.MMHAccountReferenceFXV1) return;
  const KEY = 'mmhvault-public-asia-fx-v10';
  const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';
  const CORE = new Set(['USD', 'THB', 'MMK', 'CNY', 'RMB', 'USDT']);
  const SEVEN_DAYS = 7 * 86400000;
  let market = null;
  let inFlight = null;
  let attemptedAt = 0;
  let lastFetchSucceeded = false;
  let bootTimer = 0;
  const now = () => Date.now();
  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 && n < 1e15 ? n : null;
  };
  const code = value => String(value || '').trim().toUpperCase();

  function valid(data) {
    if (!data || data.result !== 'success' || data.base_code !== 'USD' ||
        !data.rates || data.rates.USD !== 1) return false;
    const updated = Number(data.time_last_update_unix) * 1000;
    const next = Number(data.time_next_update_unix) * 1000;
    return Number.isFinite(updated) && updated > 0 &&
      Number.isFinite(next) && next >= updated &&
      updated - now() < 86400000 && now() - updated < SEVEN_DAYS;
  }

  function readSharedCache() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      return valid(data) ? data : null;
    } catch (_) { return null; }
  }

  function refreshFromCache() {
    const latest = readSharedCache();
    if (!latest) return false;
    if (!market || Number(latest.time_last_update_unix) > Number(market.time_last_update_unix)) {
      market = latest;
      refreshDisplays();
      return true;
    }
    return false;
  }

  function getRate(currencyCode) {
    const c = code(currencyCode);
    if (!c || !market || !valid(market)) return null;
    return num(market.rates[c]);
  }

  function info(currencyCode) {
    const rate = getRate(currencyCode);
    if (!rate) return null;
    return {
      rate,
      updatedAt: new Date(market.time_last_update_unix * 1000).toISOString(),
      cached: now() >= market.time_next_update_unix * 1000,
      source: 'Exchange Rate API'
    };
  }

  function unpriced() {
    const cfg = typeof MMHVAULT_CONFIG !== 'undefined' ? MMHVAULT_CONFIG : null;
    const list = Array.isArray(cfg?.accounts) ? cfg.accounts : [];
    return list.filter(a => {
      const c = code(a?.currency);
      if (a?.active === false || !c || CORE.has(c)) return false;
      const manual = typeof mmhVaultAccountFxRateV140 === 'function' ?
        mmhVaultAccountFxRateV140(a.fxPerUSD) : num(a.fxPerUSD);
      return !manual;
    });
  }

  function refreshDisplays() {
    try { if (typeof window.render === 'function') window.render(); } catch (e) {
      console.warn('[MMHVAULT] FX render refresh skipped', e);
    }
    try { window.mmhAccountsRefreshV1?.(); } catch (_) {}
    try {
      if (typeof mmhVaultRefreshDashboardAccountOverviewV449 === 'function')
        mmhVaultRefreshDashboardAccountOverviewV449();
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('mmhvault:account-reference-fx-updated', {
        detail: { updatedAt: market?.time_last_update_unix || null }
      }));
    } catch (_) {}
  }

  async function ensure(force = false) {
    const missing = unpriced();
    if (!missing.length || navigator.onLine === false) return false;
    const needed = missing.map(a => code(a.currency));
    const usable = market && valid(market) && needed.every(c => getRate(c) !== null);
    const next = market ? Number(market.time_next_update_unix) * 1000 : 0;
    if (!force && usable && now() < next) return true;
    if (inFlight) return inFlight;
    if (!force && attemptedAt && now() - attemptedAt < (lastFetchSucceeded ? 3600000 : 60000)) return !!usable;

    attemptedAt = now();
    const aborter = new AbortController();
    const timeout = setTimeout(() => aborter.abort(), 12000);
    inFlight = (async () => {
      try {
        const response = await fetch(ENDPOINT, { signal: aborter.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Reference FX request failed');
        const data = await response.json();
        if (!valid(data)) throw new Error('Invalid reference FX response');
        market = data;
        lastFetchSucceeded = true;
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
        refreshDisplays();
        return needed.every(c => getRate(c) !== null);
      } catch (e) {
        lastFetchSucceeded = false;
        console.warn('[MMHVAULT] Reference FX unavailable; existing accounting data unchanged.', e);
        return !!usable;
      } finally {
        clearTimeout(timeout);
        inFlight = null;
      }
    })();
    return inFlight;
  }

  function schedule() {
    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => { refreshFromCache(); void ensure(false); }, 150);
  }

  market = readSharedCache();
  window.MMHAccountReferenceFXV1 = { getRate, info, ensure, refreshFromCache };
  window.addEventListener('mmhvault:data-loaded', schedule);
  // A newly entered transaction can turn a zero-balance account into a
  // currency that now requires conversion. Re-evaluate after each data sync
  // without changing any historical amounts or account metadata.
  window.addEventListener('mmhvault:data-change', schedule);
  window.addEventListener('mmhvault:sync-complete', schedule);
  window.addEventListener('mmhvault:config-cloud-synced', schedule);
  window.addEventListener('mmhvault:config-owner-changed', schedule);
  window.addEventListener('mmhvault:asia-rates-updated', refreshFromCache);
  window.addEventListener('storage', e => { if (e.key === KEY) refreshFromCache(); });
  window.addEventListener('online', () => { void ensure(true); });
  window.addEventListener('focus', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
})();
