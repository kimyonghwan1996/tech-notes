import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { keyFor, loadMarks, saveMarks, toggle, exportText } =
  createRequire(import.meta.url)('../docs/javascripts/marks.js');

test('keyFor strips base and slashes', () => {
  assert.equal(keyFor('/tech-notes/stack/orchestration/airflow/', 'my-usage'), 'stack/orchestration/airflow#my-usage');
  assert.equal(keyFor('/stack/x/', 'y'), 'stack/x#y');
  assert.equal(keyFor('/tech-notes/', 'intro'), 'index#intro');
});

test('loadMarks never throws', () => {
  assert.deepEqual(loadMarks({ getItem() { throw new Error('blocked'); } }), {});
  assert.deepEqual(loadMarks({ getItem: () => 'not json' }), {});
  assert.deepEqual(loadMarks({ getItem: () => null }), {});
});

test('saveMarks returns false on failure', () => {
  assert.equal(saveMarks({ setItem() { throw new Error('full'); } }, {}), false);
  assert.equal(saveMarks({ setItem() {} }, {}), true);
});

test('toggle', () => {
  const a = toggle({}, 'a#b', 'confused', 'T');
  assert.deepEqual(a, { 'a#b': { state: 'confused', title: 'T' } });
  assert.deepEqual(toggle(a, 'a#b', 'confused', 'T'), {});
  assert.equal(toggle(a, 'a#b', 'ok', 'T')['a#b'].state, 'ok');
});

test('exportText sorted by key', () => {
  assert.equal(
    exportText({ 'stack/x#y': { state: 'confused', title: 'Y' }, 'learn/a#b': { state: 'important', title: 'B' } }),
    '- [learn/a] B (중요)\n- [stack/x] Y (헷갈림)');
});
