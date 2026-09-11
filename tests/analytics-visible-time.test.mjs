import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = process.env.ANALYTICS_SOURCE
  ? fs.readFileSync(process.env.ANALYTICS_SOURCE, 'utf8')
  : fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = source.indexOf('    // 「LP30秒滞在」');
const end = source.indexOf('    // === 現在時刻表示 ===', start);
assert.ok(start >= 0 && end > start, 'Test the exact inline production timer');
const code = source.slice(start, end);
const key = 'ks-google-ads-lp-30s-fired';

function browser({ storage = new Map(), visibility = 'visible', storageBlocked = false } = {}) {
  let now = 1000000;
  let id = 0;
  const timers = new Map();
  const listeners = new Map();
  const events = [];
  const add = (scope, type, fn) => {
    const key = `${scope}:${type}`;
    listeners.set(key, [...(listeners.get(key) || []), fn]);
  };
  const document = { visibilityState: visibility, addEventListener: (t, f) => add('document', t, f) };
  const window = { addEventListener: (t, f) => add('window', t, f) };
  const emit = (scope, type, event = {}) => (listeners.get(`${scope}:${type}`) || []).forEach(f => f(event));
  vm.runInNewContext(code, {
    document, window, Date: { now: () => now },
    sessionStorage: {
      getItem: k => { if (storageBlocked) throw new Error('Storage denied'); return storage.get(k); },
      setItem: (k, v) => { if (storageBlocked) throw new Error('Storage denied'); storage.set(k, v); },
    },
    gtag: (...args) => events.push({ elapsed: now - 1000000, args: JSON.parse(JSON.stringify(args)) }),
    setInterval: (fn, ms) => { timers.set(++id, { fn, ms, next: now + ms }); return id; },
    clearInterval: id => timers.delete(id),
  });
  function advance(ms) {
    const until = now + ms;
    while (timers.size) {
      const due = [...timers.values()].sort((a, b) => a.next - b.next)[0];
      if (due.next > until) break;
      now = due.next;
      due.next += due.ms;
      due.fn();
    }
    now = until;
  }
  return {
    events, storage, advance, emit,
    activeTimers: () => timers.size,
    visibility: state => { document.visibilityState = state; emit('document', 'visibilitychange'); },
  };
}

test('normal: send exactly at 30 visible seconds, once, with unchanged payload', () => {
  const b = browser();
  b.advance(29000);
  assert.equal(b.events.length, 0);
  b.advance(1000);
  assert.deepEqual(b.events, [{ elapsed: 30000, args: ['event', 'conversion', {
    send_to: 'AW-18262130937/01NXCOnXws8cEPmBiIRE',
  }] }]);
  b.advance(60000);
  assert.equal(b.events.length, 1);
  assert.equal(b.activeTimers(), 0);
});

test('exclude hidden time and preserve accumulated visible time', () => {
  const b = browser();
  b.advance(10000); b.visibility('hidden'); b.advance(60000);
  assert.equal(b.events.length, 0);
  b.visibility('visible'); b.advance(19000);
  assert.equal(b.events.length, 0);
  b.advance(1000);
  assert.equal(b.events.length, 1);
});

test('background initial load does not count until visible', () => {
  const b = browser({ visibility: 'hidden' });
  b.advance(60000);
  assert.equal(b.events.length, 0);
  b.visibility('visible'); b.advance(30000);
  assert.equal(b.events.length, 1);
});

for (const visibilityFirst of [true, false]) {
  test(`BFCache restore resumes at 30 visible seconds; visibilityFirst=${visibilityFirst}`, () => {
    const b = browser();
    b.advance(10000);
    if (visibilityFirst) b.visibility('hidden');
    b.emit('window', 'pagehide', { persisted: true });
    if (!visibilityFirst) b.visibility('hidden');
    assert.equal(b.activeTimers(), 0);
    b.advance(60000);
    b.visibility('visible');
    b.emit('window', 'pageshow', { persisted: true });
    assert.equal(b.activeTimers(), 1);
    b.advance(19000); assert.equal(b.events.length, 0);
    b.advance(1000); assert.equal(b.events.length, 1);
  });
}

test('pagehide without visibilitychange excludes all time away', () => {
  const b = browser();
  b.advance(10000); b.emit('window', 'pagehide', { persisted: true });
  b.advance(60000); b.emit('window', 'pageshow', { persisted: true });
  b.advance(19000); assert.equal(b.events.length, 0);
  b.advance(1000); assert.equal(b.events.length, 1);
});

test('hidden BFCache restore waits until visible', () => {
  const b = browser();
  b.advance(10000); b.visibility('hidden'); b.emit('window', 'pagehide', { persisted: true });
  b.advance(60000); b.emit('window', 'pageshow', { persisted: true });
  b.advance(60000); assert.equal(b.activeTimers(), 0);
  b.visibility('visible'); b.advance(20000); assert.equal(b.events.length, 1);
});

test('multiple pageshow/visible notifications do not duplicate the timer', () => {
  const b = browser();
  b.advance(10000);
  b.emit('window', 'pageshow', { persisted: false }); b.visibility('visible');
  b.emit('window', 'pageshow', { persisted: true });
  assert.equal(b.activeTimers(), 1);
  b.advance(19000); assert.equal(b.events.length, 0);
  b.advance(1000); assert.equal(b.events.length, 1);
});

test('already-fired same-tab reload and restoration remain deduplicated', () => {
  const storage = new Map();
  const a = browser({ storage }); a.advance(30000);
  a.emit('window', 'pagehide', { persisted: true }); a.advance(60000);
  a.emit('window', 'pageshow', { persisted: true }); a.advance(60000);
  const b = browser({ storage }); b.advance(60000);
  assert.equal(a.events.length, 1); assert.equal(b.events.length, 0);
  assert.equal(b.activeTimers(), 0);
});

test('another same-tab document firing while cached prevents a duplicate', () => {
  const storage = new Map();
  const a = browser({ storage }); a.advance(10000);
  a.emit('window', 'pagehide', { persisted: true });
  const b = browser({ storage }); b.advance(30000);
  a.emit('window', 'pageshow', { persisted: true }); a.advance(60000);
  assert.equal(b.events.length, 1); assert.equal(a.events.length, 0);
  assert.equal(storage.get(key), '1');
});

test('blocked session storage does not break page-local counting or deduplication', () => {
  const b = browser({ storageBlocked: true });
  b.advance(30000); b.emit('window', 'pagehide', { persisted: true });
  b.emit('window', 'pageshow', { persisted: true }); b.advance(60000);
  assert.equal(b.events.length, 1);
});

test('a new tab session can independently fire', () => {
  const a = browser(); const b = browser();
  a.advance(30000); b.advance(30000);
  assert.equal(a.events.length, 1); assert.equal(b.events.length, 1);
});
