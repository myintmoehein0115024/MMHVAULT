/**
 * MMHVAULT N10 — isolated recovery-view controller, REVIEW ONLY / NOT DEPLOYED.
 * This module cannot generate, change, rotate or overwrite recovery words.
 * request() must use the signed owner session to call an independently
 * approved server endpoint. Server must validate MFA, password, Vault & revocation.
 * No localStorage, sessionStorage, IndexedDB, analytics, console or URL secrets.
 */
const GOOD_WORD = /^[a-z]{2,13}$/;
const WORD_COUNT = 10;
const MAX_VIEW_MS = 45_000;
const VALID_STATES = new Set(['ready', 'loading', 'locked', 'visible', 'unavailable', 'login_required', 'mfa_required', 'password_required', 'not_recoverable', 'rate_limited', 'not_supported']);

export function validOriginalWords(words) {
  return Array.isArray(words) && words.length === WORD_COUNT && words.every(w => typeof w === 'string' && GOOD_WORD.test(w));
}

export function recoveryViewMessage(code, language = 'en') {
  const phrases = {
    ready: ['Enter your current password to view the original ten words.', '输入当前登录密码，查看注册时的原始十词。', 'မူရင်း စကားလုံး ၁၀ လုံးကို ကြည့်ရန် လက်ရှိစကားဝှက်ကို ထည့်ပါ။'],
    password_required: ['Confirm your current password.', '请输入当前登录密码。', 'လက်ရှိ စကားဝှက်ကို အတည်ပြုပါ။'],
    login_required: ['Sign in again to continue.', '请重新登录后继续。', 'ဆက်လုပ်ရန် ထပ်မံဝင်ရောက်ပါ။'],
    mfa_required: ['Complete your authenticator verification first.', '请先完成二次身份验证。', 'ဒုတိယအဆင့် အတည်ပြုမှုကို အရင်ပြီးစီးစေပါ။'],
    not_recoverable: ['The original words were never encrypted for viewing and cannot be reconstructed. Your existing key is unchanged.', '原始十词当时没有加密保存，无法重新还原；现有密钥保持不变。', 'မူရင်းစကားလုံးများကို သိမ်းဆည်းထားခြင်းမရှိ၍ ပြန်လည်ဖော်ထုတ်မရပါ။ ယခင်သော့ မပြောင်းလဲပါ။'],
    unavailable: ['Recovery viewing is temporarily unavailable. No recovery key was changed.', '暂时无法查看恢复词，原密钥没有变化。', 'ယာယီကြည့်ရှုမရနိုင်ပါ။ ပြန်လည်ရယူရေးသော့ မပြောင်းလဲပါ။'],
    rate_limited: ['Too many attempts. Please try again later; your Recovery Key is unchanged.', '验证次数过多，请稍后再试；原始恢复密钥没有变化。', 'အကြိမ်များစွာ ကြိုးစားခဲ့သဖြင့် နောက်မှ ပြန်ကြိုးစားပါ။ မူရင်းသော့ မပြောင်းလဲပါ။'],
    not_supported: ['This login method has no username-only Recovery Key.', '此登录方式没有独立用户名恢复密钥。', 'ဤဝင်ရောက်မှုနည်းလမ်းတွင် သီးသန့်အသုံးပြုသူအမည် ပြန်လည်ရယူရေးသော့ မရှိပါ။'],
    locked: ['The original words are hidden.', '原始恢复词已隐藏。', 'မူရင်းစကားလုံးများကို ဖျောက်ထားသည်။'],
  };
  const row = phrases[code] || phrases.unavailable;
  return row[language === 'zh' ? 1 : language === 'my' ? 2 : 0];
}

export function createRecoveryViewController({request, currentOwner, onChange, setTimer = setTimeout, clearTimer = clearTimeout}) {
  if (typeof request !== 'function' || typeof currentOwner !== 'function' || typeof onChange !== 'function')
    throw Error('invalid_recovery_view_dependencies');
  let epoch = 0;
  let timer = null;
  let phase = 'locked';
  let lastBackup = null;
  let owner = null;
  const emit = (state, extras = {}) => {
    if (!VALID_STATES.has(state)) throw Error('invalid_recovery_state');
    phase = state;
    onChange({phase: state, ...extras});
  };
  const stopTimer = () => { if (timer !== null) { clearTimer(timer); timer = null; } };
  const hide = () => {
    epoch += 1; stopTimer(); lastBackup = null;
    // Security state must lock even if a browser renderer throws.
    // The mounted UI adapter must additionally clear sensitive DOM nodes.
    phase = 'locked';
    try { onChange({phase: 'locked'}); } catch { /* remain locked */ }
  };
  const captureOwner = () => {
    const id = currentOwner();
    if (typeof id !== 'string' || !id.length) return null;
    return id;
  };
  const status = async () => {
    hide(); const invocation = epoch; const id = captureOwner(); owner = id;
    if (!id) { emit('login_required'); return; }
    emit('loading');
    try {
      const result = await request('status', {});
      // An obsolete request belongs to a previous view. Never let its
      // completion hide or overwrite a newer owner's active request.
      if (invocation !== epoch) return;
      if (currentOwner() !== id) { hide(); return; }
      if (result?.code === 'backup_status' && typeof result.backed_up === 'boolean') {
        lastBackup = result.backed_up;
        emit(result.backed_up ? 'ready' : 'not_recoverable');
      } else emit(serverBlock(result?.code));
    } catch {
      if (invocation !== epoch) return;
      if (currentOwner() !== id) { hide(); return; }
      emit('unavailable');
    }
  };
  const reveal = async password => {
    if (!['ready', 'password_required'].includes(phase) || lastBackup !== true || !owner || currentOwner() !== owner) {
      hide(); return;
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 20) {
      emit('password_required'); return;
    }
    const invocation = ++epoch;
    emit('loading');
    try {
      const result = await request('reveal', {password});
      if (invocation !== epoch) return;
      if (currentOwner() !== owner) { hide(); return; }
      if (result?.code !== 'recovery_key') {
        emit(serverBlock(result?.code)); return;
      }
      if (!validOriginalWords(result.words) || result.expires_in_seconds !== 45) {
        emit('unavailable'); return;
      }
      emit('visible', {words: [...result.words]});
      // A synchronous UI callback may close the modal while handling 'visible'.
      // Never schedule a new disclosure timer after it invalidates this request.
      if (invocation !== epoch || phase !== 'visible' || currentOwner() !== owner) return;
      timer = setTimer(hide, MAX_VIEW_MS);
    } catch {
      if (invocation === epoch) {
        // Owner changes during an in-flight failure must lock without
        // surfacing the previous owner's request state to the next account.
        if (currentOwner() !== owner) { hide(); return; }
        // A failed visible-state renderer or timer setup must not leave words
        // unlocked. Clear first, then show the non-sensitive error status.
        hide();
        try { emit('unavailable'); } catch { /* remain non-sensitive */ }
      }
    }
  };
  const ownerChanged = () => {
    if (currentOwner() !== owner) hide();
  };
  return Object.freeze({status, reveal, hide, ownerChanged, getPhase: () => phase});
}

function serverBlock(code) {
  if (code === 'mfa_required') return 'mfa_required';
  if (code === 'sign_in_required' || code === 'session_expired') return 'login_required';
  if (code === 'invalid_credentials') return 'password_required';
  if (code === 'too_many_attempts') return 'rate_limited';
  if (code === 'username_only_required') return 'not_supported';
  if (code === 'backup_not_ready') return 'not_recoverable';
  return 'unavailable';
}
