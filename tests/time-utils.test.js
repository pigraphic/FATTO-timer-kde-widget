import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

function loadTimeUtils() {
  const filePath = fileURLToPath(new URL('../contents/ui/js/TimeUtils.js', import.meta.url));
  let code = fs.readFileSync(filePath, 'utf8');
  // Strip .pragma library directive for Node.js execution
  code = code.replace(/^\s*\.pragma\s+[^\n]+/m, '');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    Date,
    Math,
    Number,
    isNaN,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.module.exports;
}

const {
  formatSeconds,
  formatDateIso,
  formatHeaderDate,
  isSameDay,
  calculateSessionSeconds,
} = loadTimeUtils();

test('contents/ui/js/TimeUtils.js contains .pragma library directive at top', () => {
  const filePath = fileURLToPath(new URL('../contents/ui/js/TimeUtils.js', import.meta.url));
  const code = fs.readFileSync(filePath, 'utf8');
  assert.match(code.trim(), /^\.pragma\s+library/);
});

test('contents/ui/js/TimeUtils.js does not contain ESM export keywords that break QML', () => {
  const filePath = fileURLToPath(new URL('../contents/ui/js/TimeUtils.js', import.meta.url));
  const code = fs.readFileSync(filePath, 'utf8');
  assert.doesNotMatch(code, /\bexport\s+(function|const|var|let|default)\b/);
});

test('formatSeconds converts seconds into padded HH:MM:SS', () => {
  assert.equal(formatSeconds(0), '00:00:00');
  assert.equal(formatSeconds(5), '00:00:05');
  assert.equal(formatSeconds(65), '00:01:05');
  assert.equal(formatSeconds(3665), '01:01:05');
  assert.equal(formatSeconds(36000), '10:00:00');
  assert.equal(formatSeconds(undefined), '00:00:00');
  assert.equal(formatSeconds(null), '00:00:00');
  assert.equal(formatSeconds(-10), '00:00:00');
});

test('formatDateIso outputs YYYY-MM-DD local format and parses defensively', () => {
  const d = new Date(2026, 10, 12); // Month is 0-indexed (10 = November)
  assert.equal(formatDateIso(d), '2026-11-12');
  // Defensive handling of string or timestamp or null
  assert.equal(formatDateIso('2026-11-12T15:00:00'), '2026-11-12');
  assert.equal(formatDateIso(new Date(2026, 0, 5)), '2026-01-05');
  assert.ok(typeof formatDateIso(null) === 'string');
});

test('formatHeaderDate formats date with weekday and month name and parses defensively', () => {
  const d = new Date(2026, 10, 12);
  assert.equal(formatHeaderDate(d), 'Thursday, 12 Nov');
  assert.equal(formatHeaderDate('2026-11-12T15:00:00'), 'Thursday, 12 Nov');
  assert.ok(typeof formatHeaderDate(null) === 'string');
});

test('isSameDay accurately compares dates in various formats', () => {
  const dateA = new Date(2026, 10, 12, 8, 30);
  const dateB = new Date(2026, 10, 12, 19, 45);
  const dateC = new Date(2026, 10, 13, 8, 30);

  assert.equal(isSameDay(dateA, dateB), true);
  assert.equal(isSameDay(dateA, dateC), false);
  assert.equal(isSameDay(dateA.getTime(), dateB.toISOString()), true);
  assert.equal(isSameDay(null, dateB), false);
  assert.equal(isSameDay('invalid', dateB), false);
});

test('calculateSessionSeconds calculates correct elapsed seconds and handles NaN/missing defensively', () => {
  const start = 1700000000000;
  const end = 1700000065000;
  assert.equal(calculateSessionSeconds(start, end), 65);

  const now = 1700000020000;
  assert.equal(calculateSessionSeconds(start, null, now), 20);

  // NaN / invalid inputs return 0
  assert.equal(calculateSessionSeconds(undefined, end), 0);
  assert.equal(calculateSessionSeconds('invalid', end), 0);
  assert.equal(calculateSessionSeconds(NaN, end), 0);

  // Negative diff clamped to 0
  assert.equal(calculateSessionSeconds(end, start), 0);
});
