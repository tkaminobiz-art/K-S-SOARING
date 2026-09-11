import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*(window\.dataLayer[\s\S]*?)<\/script>/)[1];
function run(url, referrer = '') {
  const window = {};
  const loaded = [];
  const context = {window, location: new URL(url), URL, Date,
    document: {referrer, createElement: () => ({}), head: {appendChild: x => loaded.push(x)}}};
  Object.defineProperty(context, 'dataLayer', {get: () => window.dataLayer});
  vm.runInNewContext(script, context);
  return {loaded, calls: JSON.parse(JSON.stringify(window.dataLayer.map(x => Array.from(x))))};
}
for (const host of ['www.sokujitu-kaishu.com', 'sokujitu-kaishu.com']) {
  test(`${host}: one loader, one Ads config, one GA4 config`, () => {
    const {loaded, calls} = run(`https://${host}/`);
    assert.equal(loaded.length, 1);
    assert.equal(calls.filter(x => x[0] === 'js').length, 1);
    assert.deepEqual(calls.filter(x => x[1] === 'AW-18262130937'), [['config', 'AW-18262130937']]);
    const ga4 = calls.filter(x => x[1] === 'G-J6PMQ8DRYX');
    assert.equal(ga4.length, 1);
    assert.equal(ga4[0][2].allow_google_signals, false);
    assert.equal(ga4[0][2].allow_ad_personalization_signals, false);
  });
}
for (const url of ['https://k-s-soaring.vercel.app/', 'http://localhost:8811/', 'https://www.sokujitu-kaishu.com.evil.example/']) {
  test(`${url}: isolated`, () => {
    const {loaded, calls} = run(url);
    assert.equal(loaded.length, 0);
    assert.equal(calls.length, 0);
  });
}
test('Ads local debug does not enable GA4', () => {
  const {loaded, calls} = run('http://localhost:8811/?adsdebug=1');
  assert.equal(loaded.length, 1);
  assert.equal(calls.filter(x => x[1] === 'G-J6PMQ8DRYX').length, 0);
});
test('GA4 URL drops unknown fields, fragment, and referrer query; keeps attribution', () => {
  const {calls} = run('https://www.sokujitu-kaishu.com/?roulette=1&utm_source=google&utm_medium=cpc&gclid=TEST&email=private&token=secret#private', 'https://example.com/path?token=secret#private');
  const config = calls.find(x => x[1] === 'G-J6PMQ8DRYX')[2];
  assert.equal(config.page_location, 'https://www.sokujitu-kaishu.com/?roulette=1&utm_source=google&utm_medium=cpc&gclid=TEST');
  assert.equal(config.page_referrer, 'https://example.com/path');
  assert.ok(!JSON.stringify(config).includes('private'));
  assert.ok(!JSON.stringify(config).includes('secret'));
});
test('roulette wrapper has no second measurement tag', () => {
  const wrapper = fs.readFileSync(new URL('../roulette/index.html', import.meta.url), 'utf8');
  assert.ok(!wrapper.includes('G-J6PMQ8DRYX'));
  assert.ok(!wrapper.includes('gtag('));
});
test('Search Console verification and canonical-only sitemap', () => {
  assert.equal((html.match(/name="google-site-verification"/g) || []).length, 1);
  const sitemap = fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1]), ['https://www.sokujitu-kaishu.com/']);
  assert.ok(fs.readFileSync(new URL('../robots.txt', import.meta.url), 'utf8').includes('Sitemap: https://www.sokujitu-kaishu.com/sitemap.xml'));
});
