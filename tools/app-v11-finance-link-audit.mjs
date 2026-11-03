/**
 * MMHVAULT APP V11 – read-only, owner-scoped account reference audit.
 *
 * No network calls, no mutations of provided data and no guessed currency.
 * This is a QA utility, NOT a production data migration.
 */
const BUILTIN_BAHT_ID = 'acc_bath';
const CORE_FX = new Set(['USD', 'USDT', 'THB', 'MMK', 'CNY', 'RMB']);
const clean = v => String(v == null ? '' : v).trim();
const key = v => clean(v).toLocaleLowerCase('en-US');

function accountKey(account) {
  const name = key(account?.name);
  // The only historical spelling alias with verified, stable metadata.
  if (account?.id === BUILTIN_BAHT_ID && (name === 'baht' || name === 'bath')) return 'baht';
  return name;
}
function accountMatches(account, name) {
  const actual = key(account?.name);
  const requested = key(name);
  if (actual === requested) return true;
  // "Bath" is never a generic THB account; only acc_bath gets the alias.
  return account?.id === BUILTIN_BAHT_ID &&
    (actual === 'baht' || actual === 'bath') &&
    (requested === 'baht' || requested === 'bath');
}
function accountCurrency(account) {
  const c = clean(account?.currency).toUpperCase();
  return /^[A-Z]{3,4}$/.test(c) ? c : null;
}

/**
 * @param {object} input
 * @param {string} input.ownerId - Required signed-in owner; cross-owner rows excluded.
 * @param {object} input.config - Same owner's personal_configuration.config.
 * @param {Array} input.transactions - Transactions (read-only).
 * @param {Array} input.investments - Investments (read-only).
 * @param {Array} input.customInvestments - Optional custom investments (read-only).
 * @param {Array} input.recurringTransactions - Optional recurring transactions (read-only).
 * @returns {object} No write suggestions, no currency inferred for unresolved names.
 */
export function auditFinanceLinks(input = {}) {
  const ownerId = clean(input.ownerId);
  if (!ownerId) throw new TypeError('An authenticated ownerId is required for audit.');
  const accounts = Array.isArray(input.config?.accounts) ? input.config.accounts.filter(
    a => a && typeof a === 'object' && clean(a.name)
  ) : [];
  const byName = new Map();
  const duplicateNames = [];
  for (const a of accounts) {
    const k = accountKey(a);
    if (byName.has(k)) duplicateNames.push({ name: clean(a.name), issue: 'duplicate_name' });
    else byName.set(k, a);
  }

  const unresolved = [];
  const missingCurrency = [];
  const requiresReferenceFx = [];
  const resolved = [];
  const references = [];
  const owned = rows => (Array.isArray(rows) ? rows : []).filter(
    row => row && row.user_id === ownerId
  );
  const record = (kind, row, field) => {
    const name = clean(row?.[field]);
    if (name) references.push({ kind, field, name });
  };
  for (const row of owned(input.transactions)) {
    record('transaction', row, 'from_account');
    record('transaction', row, 'to_account');
  }
  for (const row of owned(input.investments)) record('investment', row, 'source_account');
  for (const row of owned(input.customInvestments)) record('custom_investment', row, 'source_account');
  for (const row of owned(input.recurringTransactions)) {
    record('recurring', row, 'from_account');
    record('recurring', row, 'to_account');
  }

  for (const ref of references) {
    // A legacy alias may collide with an independently named custom account.
    // Never let array order choose the currency for an ambiguous finance link.
    const matches = accounts.filter(a => accountMatches(a, ref.name));
    if (matches.length !== 1) {
      unresolved.push({ ...ref, reason: matches.length ? 'ambiguous_account_reference' : 'account_not_in_config', currency: null });
      continue;
    }
    const account = matches[0];
    const currency = accountCurrency(account);
    // Stable acc_bath metadata must remain THB; a corrupted currency cannot
    // be silently interpreted as another denomination of historical entries.
    if (clean(account.id) === BUILTIN_BAHT_ID && currency !== 'THB') {
      unresolved.push({ ...ref, reason: 'builtin_baht_currency_conflict', currency: null });
      continue;
    }
    if (!currency) missingCurrency.push({ ...ref, reason: 'currency_unset_or_invalid' });
    resolved.push({ ...ref, accountId: clean(account.id), currency });
  }
  const usedIds = new Set(resolved.map(ref => ref.accountId));
  for (const account of accounts) {
    const currency = accountCurrency(account);
    // An archived account can still have historical transactions in Analyze.
    if (!currency || CORE_FX.has(currency)) continue;
    const manual = Number(account.fxPerUSD);
    const hasManual = account.fxPerUSD !== null && account.fxPerUSD !== '' &&
      account.fxPerUSD !== undefined && Number.isFinite(manual) && manual > 0;
    if (!hasManual && usedIds.has(clean(account.id)))
      requiresReferenceFx.push({ accountId: clean(account.id), currency, reason: 'verify_live_reference_rate' });
  }
  return {
    ownerScoped: true,
    accountCount: accounts.length,
    totalReferences: references.length,
    resolvedReferences: resolved.length,
    unresolvedReferences: unresolved.length,
    unresolved, missingCurrency, duplicateNames, requiresReferenceFx,
    // A successful match does not imply that a historical amount can be converted.
    hasUnverifiedAccounting: !!(unresolved.length || missingCurrency.length || duplicateNames.length || requiresReferenceFx.length)
  };
}
