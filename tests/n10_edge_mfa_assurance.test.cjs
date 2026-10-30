const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

const moduleURL = pathToFileURL(resolve(__dirname, '../security/n10-edge-candidates/mmh-financial-assistant/mfa-assurance.mjs')).href;

test('conditional MFA gate uses fail-closed decisions', async (t) => {
  const { evaluateMfaAssurance } = await import(moduleURL);
  const scenarios = [
    ['enrolled MFA with AAL1', {currentLevel:'aal1',nextLevel:'aal2'}, 'required'],
    ['verified MFA with AAL2', {currentLevel:'aal2',nextLevel:'aal2'}, 'allowed'],
    ['no MFA enrolled AAL1', {currentLevel:'aal1',nextLevel:'aal1'}, 'allowed'],
    ['legacy null current AAL, verified MFA', {currentLevel:null,nextLevel:'aal2'}, 'required'],
    ['legacy null current AAL, no MFA', {currentLevel:null,nextLevel:'aal1'}, 'allowed'],
    ['factor removed, old AAL2 session', {currentLevel:'aal2',nextLevel:'aal1'}, 'allowed'],
    ['missing nextLevel', {currentLevel:'aal1'}, 'unavailable'],
    ['inconsistent null nextLevel', {currentLevel:'aal1',nextLevel:null}, 'unavailable'],
    ['legacy null current and null next with no factor', {currentLevel:null,nextLevel:null}, 'allowed'],
    ['missing currentLevel', {nextLevel:'aal1'}, 'unavailable'],
    ['unknown currentLevel', {currentLevel:'aal3',nextLevel:'aal2'}, 'unavailable'],
    ['unknown nextLevel', {currentLevel:'aal1',nextLevel:'aal3'}, 'unavailable'],
    ['invalid assurance object', null, 'unavailable'],
    ['empty assurance object', {}, 'unavailable'],
    ['false assurance object', false, 'unavailable'],
    ['factor reported, AAL1/next AAL2', {currentLevel:'aal1',nextLevel:'aal2'}, 'required',true],
    ['factor reported, AAL2/next AAL2', {currentLevel:'aal2',nextLevel:'aal2'}, 'allowed',true],
    ['factor reported, SDK incorrectly reports AAL1/AAL1', {currentLevel:'aal1',nextLevel:'aal1'}, 'unavailable',true],
    ['factor reported, legacy null/null', {currentLevel:null,nextLevel:null}, 'unavailable',true],
    ['factor reported, legacy null/AAL2', {currentLevel:null,nextLevel:'aal2'}, 'required',true],
    ['factor reported, incomplete nextLevel', {currentLevel:'aal2'}, 'unavailable',true],
  ];
  for (const [name, input, expected, hasVerifiedFactor = false] of scenarios) {
    await t.test(name, () => {
      assert.equal(evaluateMfaAssurance(input, hasVerifiedFactor), expected);
    });
  }
});
