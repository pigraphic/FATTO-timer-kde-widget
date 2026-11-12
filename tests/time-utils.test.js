import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSeconds,
  formatDateIso,
  formatHeaderDate,
  isSameDay,
  calculateSessionSeconds,
} from '../contents/ui/js/TimeUtils.js';

test('formatSeconds converts seconds into padded HH:MM:SS', () => {
  assert.equal(formatSeconds(0), '00:00:00');
  assert.equal(formatSeconds(5), '00:00:05');
  assert.equal(formatSeconds(65), '00:01:05');
  assert.equal(formatSeconds(3665), '01:01:05');
  assert.equal(formatSeconds(36000), '10:00:00');
});

test('formatDateIso outputs YYYY-MM-DD local format', () => {
  const d = new Date(2026, 10, 12); // Month is 0-indexed (10 = November)
  assert.equal(formatDateIso(d), '2026-11-12');
});

test('formatHeaderDate formats date with weekday and month name', () => {
  const d = new Date(2026, 10, 12);
  assert.equal(formatHeaderDate(d), 'Thursday, 12 Nov');
});

test('isSameDay accurately compares dates in various formats', () => {
  const dateA = new Date(2026, 10, 12, 8, 30);
  const dateB = new Date(2026, 10, 12, 19, 45);
  const dateC = new Date(2026, 10, 13, 8, 30);

  assert.equal(isSameDay(dateA, dateB), true);
  assert.equal(isSameDay(dateA, dateC), false);
  assert.equal(isSameDay(dateA.getTime(), dateB.toISOString()), true);
});

test('calculateSessionSeconds calculates correct elapsed seconds', () => {
  const start = 1700000000000;
  const end = 1700000065000;
  assert.equal(calculateSessionSeconds(start, end), 65);

  const now = 1700000020000;
  assert.equal(calculateSessionSeconds(start, null, now), 20);
});
