// FULGURITE live playtest: open the game with no ?shot=, click through the
// title, drag a vein across the sand, release to strike, and confirm the
// state advances (veins drawn, discharge fired, wraiths shattered).
// Usage: node tools/playtest.mjs [port]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/makefun/shot-tool/node_modules/playwright-core');

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.argv[2] || 8099);

const serve = spawn(process.execPath, [join(repo, 'serve.ts'), '--port', String(port)], {
  cwd: repo, stdio: ['ignore', 'pipe', 'pipe'],
});
let serveLog = '';
serve.stdout.on('data', (d) => { serveLog += d; });
serve.stderr.on('data', (d) => { serveLog += d; });

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolveOk, reject) => {
    (function probe() {
      fetch(url).then((r) => { if (r.ok) resolveOk(); else retry(); }).catch(retry);
      function retry() {
        if (Date.now() - start > timeoutMs) reject(new Error('server did not start: ' + serveLog));
        else setTimeout(probe, 200);
      }
    })();
  });
}

const errors = [];
const read = (page) => page.evaluate(() => {
  const s = window.__fulgurite;
  if (!s) return null;
  return {
    screen: s.screen, squall: s.squall, score: s.score, kills: s.kills,
    veins: s.edges.length, veinUsed: Math.round(s.veinUsed),
    discharges: s.stats.discharges, wraiths: s.wraiths.length,
    spawnLeft: s.spawnLeft, rings: s.rings,
  };
});
try {
  await waitForServer(`http://127.0.0.1:${port}/index.html`);
  const browser = await chromium.launch({
    args: ['--no-proxy-server'],
    env: { ...process.env, http_proxy: '', https_proxy: '', HTTP_PROXY: '', HTTPS_PROXY: '' },
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  console.log('title:', JSON.stringify(await read(page)));
  // Click to start.
  await page.mouse.click(640, 640);
  await page.waitForTimeout(500);
  console.log('after start:', JSON.stringify(await read(page)));
  // Drag a vein in a wide arc across the middle of the field.
  await page.mouse.move(300, 500);
  await page.mouse.down();
  for (let i = 1; i <= 24; i += 1) {
    await page.mouse.move(300 + i * 28, 500 - Math.sin(i / 4) * 60, { steps: 1 });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(100);
  console.log('mid-drag:', JSON.stringify(await read(page)));
  await page.mouse.up();
  await page.waitForTimeout(800);
  console.log('after discharge:', JSON.stringify(await read(page)));
  // Let the first wraiths walk in, then strike again with Space.
  await page.waitForTimeout(9000);
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  console.log('after 9s + space:', JSON.stringify(await read(page)));
  await page.screenshot({ path: '/tmp/fulgurite-live.jpg', type: 'jpeg', quality: 85 });
  console.log('live screenshot: /tmp/fulgurite-live.jpg');
  await browser.close();
} finally {
  serve.kill();
}
console.log('console/page errors:', errors.length ? errors : 'none');
if (errors.length > 0) process.exit(1);
