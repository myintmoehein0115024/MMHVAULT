// Review-only in-memory patch generator. It NEVER writes app.html.
// This is a surgical candidate for a future, separately approved release.
// Any drift in the original anchors aborts rather than overwriting finance code.
import {assessWorkspaceMfa} from './guard.mjs';

function replaceExactlyOnce(text, before, after, label) {
  const i = text.indexOf(before);
  if (i < 0 || text.indexOf(before, i + before.length) !== -1)
    throw Error('N10 app entry candidate drift: ' + label);
  return text.slice(0, i) + after + text.slice(i + before.length);
}

export function generateAppEntryPreview(original) {
  if (typeof original !== 'string' || original.length < 100000)
    throw Error('Expected full app.html, not a partial file');
  let copy = original;
  const helperName = 'mmhN10AssessWorkspaceMfaV1100';
  const helper = assessWorkspaceMfa.toString()
    .replace(/^async function assessWorkspaceMfa\(/,
             'async function ' + helperName + '(');
  if (!helper.startsWith('async function ' + helperName + '('))
    throw Error('MFA guard source drift');

  copy = replaceExactlyOnce(copy, 'async function enter(session){',
    helper + '\nlet mmhN10GateVersionV1100=0;\nasync function enter(session){', 'entry-helper');
  const oldEntry = [
    '  const a783=await db.auth.mfa.getAuthenticatorAssuranceLevel();',
    "  if(a783.error||!a783.data)throw a783.error||new Error('mfa_status_unavailable');",
    "  if(a783.data.nextLevel==='aal2'&&a783.data.currentLevel!=='aal2'){",
    "    location.replace('login.html?mfa=1');",
    '    return {ok:false,mfaRequired:true};',
    '  }'
  ].join('\n');
  const newEntry = [
    '  const n10Decision=await '+helperName+'(db.auth,session.user.id);',
    "  if(n10Decision==='challenge'){",
    "    location.replace('login.html?mfa=1');",
    '    return {ok:false,mfaRequired:true};',
    '  }',
    "  if(n10Decision!=='allow')throw Error('n10_app_mfa_unverified');"
  ].join('\n');
  copy = replaceExactlyOnce(copy, oldEntry, newEntry, 'initial-entry');

  const oldSameOwner = [
    '    if(liveOwner===nextOwner){',
    "      try{applyUserProfile(session.user);}catch(err){console.warn('MMHVAULT session profile refresh skipped',err);}",
    '      return;',
    '    }'
  ].join('\n');
  const newSameOwner = [
    '    if(liveOwner===nextOwner){',
    "      // Lock immediately on a new same-owner token; never rely on UID alone.",
    "      const n10Version=++mmhN10GateVersionV1100;",\n    "      const n10Ticket=++mmhP947AuthGateTicket;",
    "      mmhP947GuardV947('switch');",
    '      Promise.resolve().then(async()=>{',
    '        const result=await '+helperName+'(db.auth,nextOwner);',
    '        if(n10Version!==mmhN10GateVersionV1100||n10Ticket!==mmhP947AuthGateTicket||currentSessionUser?.id!==nextOwner)return;',
    "        if(result==='challenge'){location.replace('login.html?mfa=1');return;}",
    "        if(result!=='allow')throw Error('n10_mfa_recheck_failed');",
    '        applyUserProfile(session.user);',
    '        mmhP947UnlockV947();',
    '      }).catch(_=>{if(n10Version===mmhN10GateVersionV1100&&n10Ticket===mmhP947AuthGateTicket)mmhP947GuardV947(\'error\');});',
    '      return;',
    '    }'
  ].join('\n');
  copy = replaceExactlyOnce(copy,oldSameOwner,newSameOwner,'same-owner-refresh');

  const oldReconcileStart = [
    "async function mmhVaultReconcileSessionV1239(reason='resume',opts={}){",
    '  if(mmhVaultSessionCheckPromiseV1239)return mmhVaultSessionCheckPromiseV1239;',
    '  const run=(async()=>{',
    '    const startTicket=mmhP947AuthGateTicket;'
  ].join('\n');
  const newReconcileStart = [
    "async function mmhVaultReconcileSessionV1239(reason='resume',opts={}){",
    '  if(mmhVaultSessionCheckPromiseV1239)return mmhVaultSessionCheckPromiseV1239;',
    "  // Invalidate any older same-account check before awaiting resume.",\n    "  const n10Version=++mmhN10GateVersionV1100;",\n    "  // Protect already rendered account data before any async resume check.",
    "  if(currentSessionUser?.id)mmhP947GuardV947('switch');",
    '  const run=(async()=>{',
    '    const startTicket=mmhP947AuthGateTicket;'
  ].join('\n');
  copy=replaceExactlyOnce(copy,oldReconcileStart,newReconcileStart,'resume-mask');

  const oldReconcileCheck = [
    "      if(verifyError||verified?.user?.id!==owner){mmhP947GuardV947('error');return {ok:false,identityUnverified:true};}",
    '      if(!currentSessionUser){'
  ].join('\n');
  const newReconcileCheck = [
    "      if(verifyError||verified?.user?.id!==owner){mmhP947GuardV947('error');return {ok:false,identityUnverified:true};}",
    '      const n10Result=await '+helperName+'(db.auth,owner);',
    '      if(n10Version!==mmhN10GateVersionV1100||startTicket!==mmhP947AuthGateTicket||startEpoch!==(Number(window.__mmhSessionEpochV1239)||0))',
    '        return {ok:false,superseded:true};',
    "      if(n10Result==='challenge'){location.replace('login.html?mfa=1');return {ok:false,mfaRequired:true};}",
    "      if(n10Result!=='allow'){mmhP947GuardV947('error');return {ok:false,mfaUnverified:true};}",
    '      if(!currentSessionUser){'
  ].join('\n');
  copy=replaceExactlyOnce(copy,oldReconcileCheck,newReconcileCheck,'resume-aal-check');
  if (copy===original || !copy.includes("if(n10Decision!=='allow')"))
    throw Error('N10 candidate patch did not apply');
  return copy;
}
