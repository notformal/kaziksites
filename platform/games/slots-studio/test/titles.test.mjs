import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAndValidateAll, validateTitle } from '../validate-titles.mjs';

test('all 127 title manifests and aggregate are valid',async()=>{
  const {titles,errors}=await loadAndValidateAll();
  assert.deepEqual(errors,[]);
  assert.equal(titles.length,127);
  assert.equal(titles[0].id,'slot-original-001');
  assert.equal(titles.at(-1).id,'slot-original-127');
});

test('catalog includes every volatility and bonus mode',async()=>{
  const {titles}=await loadAndValidateAll();
  assert.deepEqual([...new Set(titles.map(t=>t.volatility))].sort(),['high','low','medium']);
  assert.deepEqual([...new Set(titles.map(t=>t.mathProfile.bonus.type))].sort(),['free-spins','multiplier','respin']);
});

test('validator rejects client-dangerous malformed math',async()=>{
  const {titles}=await loadAndValidateAll();
  const bad=structuredClone(titles[0]);
  bad.mathProfile.weights.wild=0;
  bad.paytable.wild[4]=-100;
  assert.match(validateTitle(bad).join(' '),/paytable/);
  assert.match(validateTitle(bad).join(' '),/weights/);
});
