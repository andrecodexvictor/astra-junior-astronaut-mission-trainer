import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ROOT_DIR = path.resolve('.');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CAPTURES_DIR = path.join(ROOT_DIR, 'docs', 'demo', 'captures');
const SAVE_KEY = 'astra-independent-demo-v4';
const LEGACY_V3_KEY = 'astra-independent-demo-v3';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getCommitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function findBrowserExecutable() {
  const candidates = [
    process.env.ASTRA_CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const pwDir = path.join(localAppData, 'ms-playwright');
  if (fs.existsSync(pwDir)) {
    const entries = fs.readdirSync(pwDir).filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const dir of entries) {
      for (const rel of [
        path.join(pwDir, dir, 'chrome-win64', 'chrome.exe'),
        path.join(pwDir, dir, 'chrome-win', 'chrome.exe'),
      ]) {
        if (fs.existsSync(rel)) return rel;
      }
    }
  }
  return null;
}

function startStaticServer() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html missing — run `npm run build` before `npm run test:e2e`.');
  }
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.replace(/^\/+/, ''));
    const filePath = path.resolve(DIST_DIR, rel);
    if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        port: addr.port,
        baseUrl: `http://127.0.0.1:${addr.port}/`,
      });
    });
  });
}

function connectWs(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const listeners = new Set();

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej, method });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        onEvent(fn) {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },
        close() {
          for (const { rej, method } of pending.values()) {
            rej(new Error(`CDP socket closed while awaiting ${method}`));
          }
          pending.clear();
          ws.close();
        },
      });
    });
    ws.addEventListener('error', (err) => reject(err));
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id) {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          if (msg.error) {
            entry.rej(new Error(`CDP ${entry.method} error ${msg.error.code}: ${msg.error.message}`));
          } else {
            entry.res(msg.result);
          }
        }
      } else {
        for (const fn of listeners) fn(msg);
      }
    });
  });
}

async function launchBrowser(exePath, gpuArgs) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-e2e-'));
  const args = [
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-features=WebGPUService,WebGPU',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required',
    ...gpuArgs,
    'about:blank',
  ];

  const proc = spawn(exePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderrBuf = '';
  proc.stderr.on('data', (chunk) => {
    stderrBuf += chunk.toString();
  });

  const cleanup = async (browserCdp) => {
    if (browserCdp) {
      try {
        await Promise.race([browserCdp.send('Browser.close'), sleep(1500)]);
      } catch {
        // Ignore shutdown race
      }
      try {
        browserCdp.close();
      } catch {
        // Ignore
      }
    }
    await new Promise((resolve) => {
      if (proc.exitCode !== null) return resolve();
      proc.once('exit', resolve);
      setTimeout(() => {
        try {
          proc.kill();
        } catch {
          // Ignore
        }
        resolve();
      }, 2000);
    });
    for (let i = 0; i < 6; i++) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
        break;
      } catch {
        await sleep(250);
      }
    }
  };

  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  let wsUrl = null;
  for (let i = 0; i < 120; i++) {
    const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\r\n]+)/);
    if (m) {
      wsUrl = m[1];
      break;
    }
    if (fs.existsSync(portFile)) {
      try {
        const lines = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
        if (lines.length >= 2 && /^\d+$/.test(lines[0])) {
          wsUrl = `ws://127.0.0.1:${lines[0]}${lines[1]}`;
          break;
        }
      } catch {
        // Windows may briefly lock DevToolsActivePort while Chrome writes it.
      }
    }
    if (proc.exitCode !== null) break;
    await sleep(100);
  }

  if (!wsUrl) {
    await cleanup(null);
    throw new Error(`Failed to open CDP DevTools endpoint (stderr=${stderrBuf.slice(0, 400)})`);
  }

  const browser = await connectWs(wsUrl);
  const debugPort = new URL(wsUrl).port;
  return { browser, debugPort, cleanup };
}

class AstraSession {
  constructor(browser, debugPort, baseUrl, localPort) {
    this.browser = browser;
    this.debugPort = debugPort;
    this.baseUrl = baseUrl;
    this.localPort = localPort;
    this.page = null;
    this.targetId = null;
    this.exceptions = [];
    this.consoleErrors = [];
    this.badResponses = [];
    this.loadingFailures = [];
    this.externalRequests = [];
    this.assertFailures = [];
    this.passes = [];
    this.captures = [];
    this.cachedFwd = null;
  }

  async openPage() {
    const { targetId } = await this.browser.send('Target.createTarget', { url: 'about:blank' });
    this.targetId = targetId;
    const list = await fetch(`http://127.0.0.1:${this.debugPort}/json/list`).then((r) => r.json());
    const info = list.find((t) => t.id === targetId);
    if (!info) throw new Error('Could not find created CDP target');
    this.page = await connectWs(info.webSocketDebuggerUrl);
    await this.page.send('Page.enable');
    await this.page.send('Runtime.enable');
    await this.page.send('Network.enable');
    await this.setViewport(1280, 800, 1, false);

    this.page.onEvent((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        const ex = msg.params.exceptionDetails;
        this.exceptions.push({
          text: ex?.text || 'exceptionThrown',
          description: ex?.exception?.description || '',
        });
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        this.consoleErrors.push(text);
      } else if (msg.method === 'Network.requestWillBeSent') {
        const url = msg.params.request.url || '';
        const allowed =
          url.startsWith(`http://127.0.0.1:${this.localPort}/`) ||
          url.startsWith('data:') ||
          url.startsWith('blob:') ||
          url === 'about:blank';
        if (!allowed) {
          this.externalRequests.push(url);
        }
      } else if (msg.method === 'Network.loadingFailed') {
        const p = msg.params;
        if (!p.canceled) {
          this.loadingFailures.push({ errorText: p.errorText, type: p.type });
        }
      } else if (msg.method === 'Network.responseReceived') {
        const res = msg.params.response;
        if (res.status >= 400) {
          this.badResponses.push({ url: res.url, status: res.status });
        }
      }
    });
  }

  async setViewport(width, height, deviceScaleFactor = 1, mobile = false) {
    await this.page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
    });
    if (mobile) {
      await this.page.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 5,
      });
    }
  }

  async eval(expression) {
    const res = await this.page.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval threw: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  assert(name, condition, detail = '') {
    if (condition) {
      this.passes.push(name);
      return true;
    }
    const msg = detail ? `${name}: ${detail}` : name;
    this.assertFailures.push(msg);
    console.error(`FAIL [${name}] ${detail}`);
    return false;
  }

  async waitFor(fnExpr, timeoutMs = 20000, pollMs = 100) {
    const res = await this.eval(`(async () => {
      const deadline = performance.now() + ${Number(timeoutMs)};
      while (performance.now() < deadline) {
        try {
          const val = (${fnExpr});
          if (val) return { ok: true, val };
        } catch {}
        await new Promise((r) => setTimeout(r, ${Number(pollMs)}));
      }
      return { ok: false };
    })()`);
    if (res?.ok) return res.val;
    throw new Error(`Timeout after ${timeoutMs}ms waiting for: ${fnExpr}`);
  }

  async waitForWorldReady(timeoutMs = 30000) {
    await this.waitFor(
      `(() => {
        const loading = document.getElementById('loading');
        const dbg = window.__ASTRA_WORLD_DEBUG__;
        return Boolean(dbg && loading && loading.hidden === true);
      })()`,
      timeoutMs,
      200,
    );
  }

  async navigateFresh(clearStorage = false) {
    await this.page.send('Page.navigate', { url: this.baseUrl });
    await this.waitForWorldReady();
    if (clearStorage) {
      const hadSave = await this.eval(`(() => {
        const had = localStorage.length > 0;
        localStorage.clear();
        return had;
      })()`);
      if (hadSave) {
        await this.page.send('Page.reload', { ignoreCache: true });
        await this.waitForWorldReady();
      }
    }
  }

  async reloadPage() {
    this.cachedFwd = null;
    await this.eval(`window.__ASTRA_RELOAD_MARK__ = true`);
    await this.page.send('Page.reload', { ignoreCache: true });
    await this.waitFor(
      `(() => {
        if (window.__ASTRA_RELOAD_MARK__) return false;
        const loading = document.getElementById('loading');
        const dbg = window.__ASTRA_WORLD_DEBUG__;
        return Boolean(dbg && loading && loading.hidden === true);
      })()`,
      30000,
      150,
    );
  }

  async openWithStorageSetup(setupJs) {
    this.cachedFwd = null;
    await this.page.send('Page.navigate', { url: 'about:blank' });
    await this.waitFor(`location.href === 'about:blank'`, 4000, 50);
    await this.page.send('Page.navigate', { url: `${this.baseUrl}science/sources.json` });
    await this.waitFor(`location.pathname.endsWith('sources.json')`, 5000, 50);
    await this.eval(`(() => { ${setupJs} })()`);
    await this.page.send('Page.navigate', { url: this.baseUrl });
    await this.waitForWorldReady();
  }

  async snap() {
    return this.eval(`window.__ASTRA_WORLD_DEBUG__?.getSnapshot() ?? null`);
  }

  async saveState() {
    return this.eval(`(() => {
      const raw = localStorage.getItem('${SAVE_KEY}');
      return raw ? JSON.parse(raw) : null;
    })()`);
  }

  async domInfo() {
    return this.eval(`(() => {
      const modal = document.querySelector('#modal-layer [data-testid]');
      const timeText = document.getElementById('time')?.textContent?.trim() || '';
      const regionText = document.getElementById('region')?.textContent?.trim() || '';
      const interactText = document.getElementById('interact')?.textContent?.trim() || '';
      const stormEl = document.getElementById('storm');
      const feedback = document.getElementById('station-feedback')?.textContent?.trim() || '';
      const readout = document.querySelector('[data-testid="station-readout"]')?.textContent?.trim() || '';
      const resourcesText = document.getElementById('resources')?.textContent?.trim() || '';
      const inventoryText = document.getElementById('inventory')?.textContent?.trim() || '';
      const cometaStatus = document.querySelector('[data-testid="cometa-status-text"]')?.textContent?.trim() || '';
      const beatBadge = document.querySelector('[data-testid="episode-beat-badge"]')?.textContent?.trim() || '';
      const touchEl = document.querySelector('[data-testid="touch-controls"]');
      return {
        modalTestId: modal?.getAttribute('data-testid') || null,
        modalHidden: document.getElementById('modal-layer')?.hidden ?? true,
        loadingHidden: document.getElementById('loading')?.hidden ?? true,
        activeElTag: document.activeElement?.tagName || null,
        activeElId: document.activeElement?.id || null,
        activeInModal: Boolean(document.getElementById('modal-layer')?.contains(document.activeElement)),
        timeText,
        regionText,
        interactText,
        hasInteractBtn: Boolean(document.querySelector('[data-testid="btn-interact"]')),
        hasExitShelterBtn: Boolean(document.querySelector('[data-testid="btn-exit-shelter"]')),
        stormVisible: Boolean(stormEl && !stormEl.hidden),
        stormText: stormEl?.textContent?.trim() || '',
        feedback,
        readout,
        resourcesText,
        inventoryText,
        cometaStatus,
        beatBadge,
        touchVisible: Boolean(touchEl && !touchEl.hidden && getComputedStyle(touchEl).display !== 'none'),
      };
    })()`);
  }

  async click(selector, waitAfterMs = 150) {
    const rect = await this.waitFor(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el || el.disabled) return null;
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })()`,
      3000,
      60,
    ).catch(async () => {
      const diag = await this.eval(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return { exists: false };
        const r = el.getBoundingClientRect();
        return { exists: true, disabled: Boolean(el.disabled), w: r.width, h: r.height };
      })()`);
      throw new Error(`click failed for ${selector}: ${JSON.stringify(diag)}`);
    });

    await Promise.all([
      this.page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: rect.x,
        y: rect.y,
      }),
      this.page.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: rect.x,
        y: rect.y,
        button: 'left',
        clickCount: 1,
      }),
      this.page.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: rect.x,
        y: rect.y,
        button: 'left',
        clickCount: 1,
      }),
    ]);
    if (waitAfterMs > 0) await sleep(waitAfterMs);
  }

  async clickUntil(selector, checkFn, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
      await this.click(selector, 100);
      if (await checkFn()) return true;
      if (i === maxAttempts - 1) {
        const hitInfo = await this.eval(`(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return { exists: false };
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return {
            exists: true,
            rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
            topTag: top?.tagName,
            topId: top?.id,
            topTestId: top?.getAttribute('data-testid'),
          };
        })()`);
        const dom = await this.domInfo();
        const modalIds = await this.eval(`Array.from(document.querySelectorAll('#modal-layer [data-testid]')).map(e => e.getAttribute('data-testid'))`);
        throw new Error(`clickUntil(${selector}) failed after ${maxAttempts} attempts: hit=${JSON.stringify(hitInfo)}, dom=${JSON.stringify(dom)}, modalIds=${JSON.stringify(modalIds)}`);
      }
      await sleep(80);
    }
    return false;
  }

  async setSelect(selector, value) {
    const ok = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      el.value = ${JSON.stringify(String(value))};
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === ${JSON.stringify(String(value))};
    })()`);
    if (!ok) throw new Error(`setSelect failed for ${selector} = ${value}`);
    await sleep(100);
  }

  async setCheckbox(selector, checked) {
    const ok = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (el.checked !== ${Boolean(checked)}) {
        el.checked = ${Boolean(checked)};
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return el.checked === ${Boolean(checked)};
    })()`);
    if (!ok) throw new Error(`setCheckbox failed for ${selector} = ${checked}`);
    await sleep(100);
  }

  async setInputValue(selector, value) {
    const ok = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      el.value = ${JSON.stringify(String(value))};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`setInputValue failed for ${selector}`);
    await sleep(60);
  }

  async keyEvent(type, key, code, keyCode, modifiers = 0) {
    await this.page.send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      modifiers,
    });
  }

  async keyDown(key, code, keyCode, modifiers = 0) {
    await this.keyEvent('rawKeyDown', key, code, keyCode, modifiers);
  }

  async keyUp(key, code, keyCode, modifiers = 0) {
    await this.keyEvent('keyUp', key, code, keyCode, modifiers);
  }

  async tapKey(key, code, keyCode, holdMs = 80) {
    await this.keyDown(key, code, keyCode);
    await sleep(holdMs);
    await this.keyUp(key, code, keyCode);
    await sleep(40);
  }

  async dragCanvas(dx, dy, steps = 3) {
    this.cachedFwd = null;
    const box = await this.eval(`(() => {
      const r = document.getElementById('world').getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
    })()`);
    const sends = [
      this.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y }),
      this.page.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: box.x,
        y: box.y,
        button: 'left',
        clickCount: 1,
      }),
    ];
    for (let i = 1; i <= steps; i++) {
      await sleep(25);
      sends.push(
        this.page.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: box.x + (dx * i) / steps,
          y: box.y + (dy * i) / steps,
          button: 'left',
          buttons: 1,
        }),
      );
    }
    await sleep(25);
    sends.push(
      this.page.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: box.x + dx,
        y: box.y + dy,
        button: 'left',
        clickCount: 1,
      }),
    );
    await Promise.all(sends);
    await sleep(100);
  }

  async focusWorldCanvas() {
    await this.eval(`(() => {
      const w = document.getElementById('world');
      if (w) w.focus();
    })()`);
  }

  async releaseAllMoveKeys() {
    await Promise.all([
      this.keyUp('w', 'KeyW', 87),
      this.keyUp('a', 'KeyA', 65),
      this.keyUp('s', 'KeyS', 83),
      this.keyUp('d', 'KeyD', 68),
      this.keyUp('Shift', 'ShiftLeft', 16),
      this.keyUp(' ', 'Space', 32),
    ]);
  }

  async waitFrames(count = 2) {
    await this.eval(`new Promise((resolve) => {
      let left = ${count};
      const step = () => {
        if (--left <= 0) resolve(true);
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    })`);
  }

  /**
   * Walks cleanly along waypoints using frame-synchronized WASD + Shift KeyboardEvents
   * on the `#world` canvas so zero WebSocket IPC roundtrips happen mid-stride.
   */
  async walkPath(waypoints, options = {}) {
    const { sprint = true, arrivalRadius = 0.85, expectedTargetId = null, maxWaypointMs = 25000 } = options;
    const forceCalibrate = !this.cachedFwd;
    const res = await this.eval(`(async () => {
      const waypoints = ${JSON.stringify(waypoints)};
      const sprint = ${Boolean(sprint)};
      const arrivalRadius = ${Number(arrivalRadius)};
      const expectedTargetId = ${JSON.stringify(expectedTargetId)};
      const maxWaypointMs = ${Number(maxWaypointMs)};
      const forceCalibrate = ${Boolean(forceCalibrate)};

      const worldEl = document.getElementById('world') || window;
      if (document.getElementById('world')) document.getElementById('world').focus();

      const keySpecs = {
        w: ['w', 'KeyW', 87],
        s: ['s', 'KeyS', 83],
        a: ['a', 'KeyA', 65],
        d: ['d', 'KeyD', 68],
        shift: ['Shift', 'ShiftLeft', 16],
      };
      const held = new Set();
      const emit = (type, k) => {
        const [key, code, keyCode] = keySpecs[k];
        worldEl.dispatchEvent(new KeyboardEvent(type, {
          key,
          code,
          keyCode,
          which: keyCode,
          bubbles: true,
          cancelable: true,
        }));
      };
      const setKeys = (desired) => {
        for (const k of Array.from(held)) {
          if (!desired.has(k)) {
            emit('keyup', k);
            held.delete(k);
          }
        }
        for (const k of desired) {
          if (!held.has(k)) {
            emit('keydown', k);
            held.add(k);
          }
        }
      };
      const releaseAll = () => setKeys(new Set());
      const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
      const getPos = () => {
        const s = window.__ASTRA_WORLD_DEBUG__?.getSnapshot();
        return s?.actors?.astronaut?.position ?? null;
      };

      const calibrate = async (force = false) => {
        if (!force && window.__astraWalkFwd) return window.__astraWalkFwd;
        const p0 = getPos();
        if (!p0) return { fx: 0, fz: 1 };
        const tryDir = async (k) => {
          const a = getPos();
          setKeys(new Set([k]));
          const t0 = performance.now();
          while (performance.now() - t0 < 220) {
            await nextFrame();
            const b = getPos();
            if (Math.hypot(b.x - a.x, b.z - a.z) >= 0.14) break;
          }
          releaseAll();
          await nextFrame();
          const b = getPos();
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          return { dx, dz, len: Math.hypot(dx, dz) };
        };
        const rw = await tryDir('w');
        if (rw.len >= 0.08) {
          window.__astraWalkFwd = { fx: rw.dx / rw.len, fz: rw.dz / rw.len };
          return window.__astraWalkFwd;
        }
        const rs = await tryDir('s');
        if (rs.len >= 0.08) {
          window.__astraWalkFwd = { fx: -rs.dx / rs.len, fz: -rs.dz / rs.len };
          return window.__astraWalkFwd;
        }
        const rd = await tryDir('d');
        if (rd.len >= 0.08) {
          window.__astraWalkFwd = { fx: -rd.dz / rd.len, fz: rd.dx / rd.len };
          return window.__astraWalkFwd;
        }
        window.__astraWalkFwd = { fx: 0, fz: 1 };
        return window.__astraWalkFwd;
      };

      try {
        let fwd = await calibrate(forceCalibrate);
        for (let wi = 0; wi < waypoints.length; wi++) {
          const wp = waypoints[wi];
          const isLast = wi === waypoints.length - 1;
          const tol = isLast ? (expectedTargetId ? Math.min(arrivalRadius, 0.35) : arrivalRadius) : 1.5;
          const wpStart = performance.now();
          let stallOrigin = getPos();
          let stallTs = wpStart;
          let stallFlip = 0;
          let arrived = false;

          while (performance.now() - wpStart < maxWaypointMs) {
            const pos = getPos();
            if (!pos) return { ok: false, reason: 'no-pos', wi, wp };

            const dx = wp.x - pos.x;
            const dz = wp.z - pos.z;
            const dist = Math.hypot(dx, dz);
            const hasInteract = Boolean(document.querySelector('[data-testid="btn-interact"]'));

            if (isLast && expectedTargetId && hasInteract && dist < 2.8) {
              arrived = true;
              break;
            }
            if (dist <= tol) {
              arrived = true;
              break;
            }

            if (performance.now() - stallTs > 650) {
              const moved = Math.hypot(pos.x - stallOrigin.x, pos.z - stallOrigin.z);
              stallOrigin = pos;
              stallTs = performance.now();
              if (moved < 0.14) {
                releaseAll();
                fwd = await calibrate(true);
                const sideKey = stallFlip++ % 2 === 0 ? 'd' : 'a';
                setKeys(new Set([sideKey]));
                const st0 = performance.now();
                while (performance.now() - st0 < 240) await nextFrame();
                releaseAll();
                continue;
              }
            }

            const projZ = (dx * fwd.fx + dz * fwd.fz) / dist;
            const rightX = fwd.fz;
            const rightZ = -fwd.fx;
            const projX = (dx * rightX + dz * rightZ) / dist;

            const desired = new Set();
            if (projZ > 0.22) desired.add('w');
            else if (projZ < -0.22) desired.add('s');
            if (projX > 0.22) desired.add('d');
            else if (projX < -0.22) desired.add('a');
            if (desired.size === 0) {
              desired.add(Math.abs(projZ) >= Math.abs(projX) ? (projZ >= 0 ? 'w' : 's') : (projX >= 0 ? 'd' : 'a'));
            }
            if (sprint && dist > 2.6) desired.add('shift');

            setKeys(desired);
            await nextFrame();
          }

          releaseAll();
          await nextFrame();
          if (!arrived) {
            return { ok: false, reason: 'timeout', wi, wp, lastPos: getPos() };
          }
        }
        document.getElementById('world')?.focus({ preventScroll: true });
        return {
          ok: true,
          pos: getPos(),
          hasInteract: Boolean(document.querySelector('[data-testid="btn-interact"]')),
        };
      } finally {
        releaseAll();
      }
    })()`);

    if (!res?.ok) {
      throw new Error(`walkPath failed: ${JSON.stringify(res)} (target=${expectedTargetId})`);
    }
    this.cachedFwd = true;
    return res;
  }

  async walkAndInteract(waypoints, expectedTargetId) {
    const res = await this.walkPath(waypoints, { expectedTargetId, arrivalRadius: 0.9 });
    if (!res?.hasInteract) {
      await this.waitFor(
        `Boolean(document.querySelector('[data-testid="btn-interact"]'))`,
        5000,
        100,
      );
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0 || !res?.hasInteract) await this.focusWorldCanvas();
      await this.tapKey('e', 'KeyE', 69, 90);
      try {
        await this.waitFor(
          `document.querySelector('#modal-layer [data-testid="station-modal"]') !== null`,
          2500,
          100,
        );
        return;
      } catch (err) {
        if (attempt === 1) throw err;
      }
    }
  }

  async closeModal() {
    const stillOpen = await this.eval(`(() => {
      const layer = document.getElementById('modal-layer');
      if (!layer || layer.hidden) return false;
      const closeBtn = document.querySelector('[data-testid="modal-back-explore"], [data-testid="modal-close"], [data-testid="btn-resume-pause"]');
      if (closeBtn) closeBtn.click();
      return !document.getElementById('modal-layer').hidden;
    })()`);
    if (stillOpen) {
      await this.waitFor(`document.getElementById('modal-layer').hidden === true`, 4000, 80);
    }
  }

  async travelViaPortal(waypoints, targetId, destRegion) {
    await this.walkAndInteract(waypoints, targetId);
    await this.click(`[data-testid="btn-travel-${destRegion}"]`, 80);
    const navRes = await this.waitFor(
      `(() => {
        const loading = document.getElementById('loading');
        const snap = window.__ASTRA_WORLD_DEBUG__?.getSnapshot();
        if (loading && loading.hidden === true && snap && snap.region === '${destRegion}') {
          return { ok: true };
        }
        const fb = document.getElementById('station-feedback')?.textContent?.trim() || '';
        if (fb.startsWith('⚠')) return { ok: false, fb };
        return false;
      })()`,
      25000,
      120,
    );
    if (navRes && navRes.ok === false) {
      throw new Error(`travelViaPortal(${targetId} -> ${destRegion}) rejected: ${navRes.fb}`);
    }
    this.cachedFwd = null;
    await this.eval(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('world')?.focus({ preventScroll: true });
      resolve(true);
    })))`);
  }

  async capture(filename) {
    fs.mkdirSync(CAPTURES_DIR, { recursive: true });
    const { data } = await this.page.send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(CAPTURES_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    this.captures.push(path.relative(ROOT_DIR, outPath).replace(/\\/g, '/'));
    return outPath;
  }

  async waitTicks(deltaTicks, timeoutMs = 45000) {
    const res = await this.eval(`(async () => {
      const parseTick = () => {
        const t = document.getElementById('time')?.textContent || '';
        const m = t.match(/T\\+\\s*(\\d+):(\\d+)/);
        return m ? Number(m[1]) * 60 + Number(m[2]) : null;
      };
      const t0 = parseTick();
      if (t0 === null) return { err: 'Could not parse #time HUD tick' };
      const target = t0 + ${Number(deltaTicks)};
      const deadline = performance.now() + ${Number(timeoutMs)};
      while (performance.now() < deadline) {
        const cur = parseTick();
        if (cur !== null && cur >= target) return { ok: true, cur };
        await new Promise((r) => setTimeout(r, 150));
      }
      return { err: 'Timeout waiting for ${Number(deltaTicks)} ticks (start=' + t0 + ', cur=' + parseTick() + ')' };
    })()`);
    if (res?.ok) return res.cur;
    throw new Error(res?.err || `waitTicks failed for ${deltaTicks}`);
  }

  async setSpeed(speedVal) {
    await this.click('[data-testid="btn-settings"]', 120);
    await this.setSelect('[data-testid="setting-speed"]', String(speedVal));
    await this.closeModal();
  }

  async triggerSave(closeAfter = true) {
    await this.focusWorldCanvas();
    await this.tapKey('p', 'KeyP', 80, 60);
    await this.waitFor(`document.querySelector('[data-testid="btn-save-now"]') !== null`, 3000, 80);
    await this.click('[data-testid="btn-save-now"]', 100);
    if (closeAfter) await this.closeModal();
  }
}

async function runAll() {
  const commitSha = getCommitSha();
  const exePath = findBrowserExecutable();
  if (!exePath) {
    console.error('No Chrome/Edge/Playwright Chromium executable found.');
    process.exit(1);
  }

  const { server, port, baseUrl } = await startStaticServer();
  console.log(`[e2e] Serving dist/ at ${baseUrl}`);
  console.log(`[e2e] Browser binary: ${exePath}`);

  let browserCtx = null;
  let session = null;
  let usedSwiftShader = false;
  try {
    try {
      browserCtx = await launchBrowser(exePath, ['--use-gl=angle', '--use-angle=d3d11']);
      session = new AstraSession(browserCtx.browser, browserCtx.debugPort, baseUrl, port);
      await session.openPage();
      const glProbe = await session.eval(`(() => {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl2'));
      })()`);
      if (!glProbe) throw new Error('Hardware ANGLE D3D11 WebGL2 context returned null');
    } catch (hwErr) {
      console.warn('[e2e] Hardware ANGLE D3D11 WebGL2 unavailable, falling back to SwiftShader:', hwErr.message);
      if (session?.page) {
        try { session.page.close(); } catch {}
      }
      if (browserCtx) await browserCtx.cleanup(browserCtx.browser);
      usedSwiftShader = true;
      browserCtx = await launchBrowser(exePath, [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ]);
      session = new AstraSession(browserCtx.browser, browserCtx.debugPort, baseUrl, port);
      await session.openPage();
    }

    const ver = await browserCtx.browser.send('Browser.getVersion');

    const envMeta = await session.eval(`(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      const dbg = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
      return {
        webgl2: Boolean(gl),
        unmaskedRenderer: gl && dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
        unmaskedVendor: gl && dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
        glVersion: gl ? gl.getParameter(gl.VERSION) : null,
        dpr: window.devicePixelRatio,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    })()`);

    console.log('[e2e] Environment:', JSON.stringify({
      commitSha,
      os: `${os.platform()} ${os.release()} (${os.arch()})`,
      node: process.version,
      browser: ver.product,
      userAgent: ver.userAgent,
      usedSwiftShader,
      ...envMeta,
    }, null, 2));

    // =========================================================================
    // SUITE 1: Boot, Assets, Cadet Customization, Academy, Ep01 Beats 1-2 & Cometa
    // =========================================================================
    const tSuite = Date.now();
    const trace = (msg) => console.log(`[e2e +${((Date.now() - tSuite) / 1000).toFixed(2)}s] ${msg}`);
    console.log('\n[e2e] --- SUITE 1: Boot, Assets, Academy, Ep01 Beats 1-2, Cometa ---');
    await session.navigateFresh(true);
    trace('navigateFresh done');
    const bootSnap = await session.snap();
    const bootDom = await session.domInfo();
    session.assert('boot-no-login-intro-visible', bootDom.modalTestId === 'intro-modal', `modal=${bootDom.modalTestId}`);
    session.assert('boot-engine-webgl2', bootSnap.engine === 'WebGL 2', `engine=${bootSnap.engine}`);
    session.assert('boot-all-glbs-no-fallback', bootSnap.fallbackModels.length === 0 && bootSnap.loadedModels.length === 11,
      `loaded=${bootSnap.loadedModels.length}, fallback=${JSON.stringify(bootSnap.fallbackModels)}`);

    // Cadet appearance customization
    await session.setSelect('[data-testid="select-suit-accent"]', 'cyan');
    await session.setSelect('[data-testid="select-visor-tone"]', 'cyan');
    await session.setSelect('[data-testid="select-skin-tone"]', 'tan');
    const customSnap = await session.snap();
    session.assert('cadet-customization-live',
      customSnap.cadetAppearance.suitAccent === 'cyan' &&
      customSnap.cadetAppearance.visorTone === 'cyan' &&
      customSnap.cadetAppearance.skinTone === 'tan',
      JSON.stringify(customSnap.cadetAppearance));
    trace('cadet customization done');

    // Start new expedition
    await session.click('[data-testid="btn-start-new"]', 120);
    await session.waitFor(`document.getElementById('modal-layer').hidden === true`, 5000);
    await session.waitFrames(3);
    trace('started expedition');
    const acSnap = await session.snap();
    session.assert('academy-actors-loaded-nonfallback',
      ['astronaut', 'pip', 'cometa', 'npc-lia-academy', 'npc-reyes-academy', 'npc-elena-academy'].every(
        (k) => acSnap.actors[k] && !acSnap.actors[k].usingFallback && acSnap.actors[k].skeletons >= 1,
      ),
      `actors=${JSON.stringify(Object.keys(acSnap.actors))}`);

    // Camera pointer drag + keyboard movement (WASD + Shift + Space)
    const pBeforeDrag = acSnap.actors.astronaut.position;
    await session.dragCanvas(55, -12);
    trace('drag 1 done');
    await session.dragCanvas(-55, 12); // restore facing near north after proving camera drag responds
    trace('drag 2 done');
    await session.focusWorldCanvas();
    const downP = Promise.all([
      session.keyDown('w', 'KeyW', 87),
      session.keyDown('Shift', 'ShiftLeft', 16),
    ]);
    await sleep(220);
    await downP;
    const clipMoving = (await session.snap()).actors.astronaut.clip;
    await session.keyDown(' ', 'Space', 32);
    await sleep(100);
    const jumpSnap = await session.snap();
    await session.releaseAllMoveKeys();
    trace('move/jump done');
    const pAfterMove = jumpSnap.actors.astronaut.position;
    session.assert('keyboard-wasd-shift-moves-astronaut',
      Math.hypot(pAfterMove.x - pBeforeDrag.x, pAfterMove.z - pBeforeDrag.z) > 0.5,
      `moved from ${JSON.stringify(pBeforeDrag)} to ${JSON.stringify(pAfterMove)}`);
    session.assert('keyboard-animation-clip-changes',
      clipMoving === 'WalkEarth' || clipMoving === 'RunEarth' || jumpSnap.actors.astronaut.clip !== 'Idle',
      `moving=${clipMoving}, jump=${jumpSnap.actors.astronaut.clip}`);

    // Episode 01 Beat 1: dialogue history + skip optional beat
    trace('opening episode modal...');
    await session.clickUntil('[data-testid="btn-open-episode"]', async () => (await session.domInfo()).modalTestId === 'episode-modal');
    trace('episode modal opened!');
    await session.click('[data-testid="tone-arrival-curious"]', 80);
    await session.click('[data-testid="tab-episode-history"]', 80);
    const histCount = await session.eval(`document.querySelectorAll('[data-testid="dialogue-history"] li').length`);
    session.assert('episode-dialogue-history-records-line', histCount >= 1, `histCount=${histCount}`);
    await session.click('[data-testid="tab-episode-current"]', 60);
    await session.click('[data-testid="btn-skip-beat-modal"]', 80);
    await session.closeModal();

    // Cometa Pet (0 resource creation) + Sniff in pressurized academy
    const resBeforePet = (await session.saveState()).current.simulation.resources;
    await session.clickUntil('[data-testid="cometa-pet"]', async () =>
      ((await session.saveState())?.current?.simulation?.cometa?.petCount ?? 0) >= 1,
    );
    const snapAfterPet = await session.snap();
    await session.clickUntil('[data-testid="cometa-sniff"]', async () =>
      ((await session.saveState())?.current?.simulation?.cometa?.sniffCount ?? 0) >= 1,
    );
    const snapAfterSniffAc = await session.snap();
    const stateAfterCometaAc = (await session.saveState()).current.simulation;
    trace('cometa pet/sniff done');
    session.assert('cometa-pet-0-resource-creation',
      stateAfterCometaAc.cometa.petCount === 1 &&
      stateAfterCometaAc.resources.battery === resBeforePet.battery &&
      stateAfterCometaAc.resources.potable === resBeforePet.potable &&
      stateAfterCometaAc.resources.oxygen === resBeforePet.oxygen &&
      stateAfterCometaAc.resources.food === resBeforePet.food &&
      stateAfterCometaAc.resources.parts === resBeforePet.parts,
      `petCount=${stateAfterCometaAc.cometa.petCount}`);
    session.assert('cometa-sniff-allowed-pressurized-academy',
      stateAfterCometaAc.cometa.sniffCount === 1 &&
      (snapAfterSniffAc.cometa.clip === 'Sniff' || snapAfterPet.cometa.clip !== 'none'),
      `sniffCount=${stateAfterCometaAc.cometa.sniffCount}, clip=${snapAfterSniffAc.cometa.clip}`);

    // Walk closer to Lia + academy console so Comet/PIP/Crew frame nicely for Capture 01
    await session.walkPath([{ x: -3.2, z: -2.2 }], { arrivalRadius: 0.7 });
    await session.capture('01-academy-cometa.png');

    // Academy console: verify uniform pause (clock + AnimationGroup paused while modal open)
    await session.walkAndInteract([{ x: -3.2, z: 0 }], 'academy-console');
    const tickAtModalOpen = await session.eval(`document.getElementById('time')?.textContent`);
    const snapInModal = await session.snap();
    await sleep(1200);
    const tickAfterModalWait = await session.eval(`document.getElementById('time')?.textContent`);
    session.assert('uniform-pause-freezes-clock-and-animations',
      snapInModal.paused === true &&
      Object.values(snapInModal.actors).every((a) => a.paused === true) &&
      tickAtModalOpen === tickAfterModalWait &&
      tickAtModalOpen.includes('PAUSADO'),
      `before=${tickAtModalOpen}, after=${tickAfterModalWait}`);

    // Diagnose + test academy_load keep_secondary drains vs shed stabilizes 15 ticks
    await session.click('[data-testid="station-choice-0"]', 120); // diagnoseAcademy
    await session.eval(`document.querySelector('.beat-details summary')?.click()`);
    await sleep(80);
    await session.click('[data-testid="causal-keep_secondary"]', 120);
    await session.closeModal();
    await session.waitTicks(3, 8000);
    await session.triggerSave();
    const acKeepBattery = (await session.saveState()).current.simulation.academyBattery;
    session.assert('academy-keep-secondary-drains-battery', acKeepBattery < 6, `academyBattery=${acKeepBattery}`);

    // Switch to 3x speed, then shedLoad and stabilize 15 ticks
    await session.setSpeed(3);
    await session.walkAndInteract([{ x: -3.2, z: 0 }], 'academy-console');
    await session.click('[data-testid="station-choice-1"]', 120); // shedLoad (or causal-shed)
    await session.closeModal();
    await session.waitTicks(17, 15000); // >15 ticks (~6s at 3x)
    await session.triggerSave();
    const acDoneSim = (await session.saveState()).current.simulation;
    session.assert('academy-shed-load-stabilizes-15-ticks',
      acDoneSim.flags.loadShed && acDoneSim.flags.academyStableTicks >= 15,
      `stableTicks=${acDoneSim.flags.academyStableTicks}`);
    await session.setSpeed(1);

    // Travel to Orbit
    await session.travelViaPortal([{ x: 0, z: 4 }, { x: 0, z: 12 }], 'academy-launch', 'orbit');

    // =========================================================================
    // SUITE 2: Orbit & 45 kg Cargo Manifest
    // =========================================================================
    console.log('\n[e2e] --- SUITE 2: Orbit & 45 kg Cargo Manifest ---');
    const orbSnap = await session.snap();
    session.assert('orbit-region-earth-present', orbSnap.region === 'orbit' && orbSnap.sceneCounts.meshes > 15,
      `meshes=${orbSnap.sceneCounts.meshes}`);

    await session.walkAndInteract([{ x: -2.5, z: 1 }], 'cargo');
    const orbCargoHtml = await session.eval(`document.querySelector('[data-testid="cargo-manifest"]')?.textContent || ''`);
    session.assert('orbit-assisted-disclaimer-visible', orbCargoHtml.includes('orbitAssisted = true'));

    // Try selecting heavy_ballast (40 + 20 = 60 > 45 kg) -> expect rejection
    await session.setCheckbox('[data-cargo-item="heavy_ballast"]', true);
    await session.click('[data-testid="btn-cargo-submit"]', 150);
    const overMsg = (await session.domInfo()).feedback;
    session.assert('orbit-cargo-over-45kg-rejected', overMsg.startsWith('⚠'), `feedback=${overMsg}`);

    // Use preset (40/45 kg) and submit
    await session.click('[data-testid="btn-cargo-preset"]', 120);
    await session.click('[data-testid="btn-cargo-submit"]', 150);
    const okCargoMsg = (await session.domInfo()).feedback;
    session.assert('orbit-cargo-40kg-accepted', okCargoMsg.startsWith('✓'), `feedback=${okCargoMsg}`);
    await session.closeModal();

    // Travel to Aurora (habitat)
    await session.travelViaPortal([{ x: 0, z: 9.5 }], 'lunar-transfer', 'habitat');

    // =========================================================================
    // SUITE 3: Aurora (habitat), Vacuum Checks, Repairs, Aux/Kit Undo & Early Plant
    // =========================================================================
    console.log('\n[e2e] --- SUITE 3: Aurora Habitat, Fog, Repairs, AuxBay/Kit, Locker, Early Plant ---');
    const habSnap = await session.snap();
    session.assert('lunar-fog-mode-none', habSnap.fogMode === 0, `fogMode=${habSnap.fogMode}`);

    // Cometa sniff MUST be rejected in vacuum habitat (!sheltered)
    const sniffBeforeVac = (await session.saveState()).current.simulation.cometa.sniffCount;
    await session.click('[data-testid="cometa-sniff"]', 220);
    await session.triggerSave();
    const sniffAfterVac = (await session.saveState()).current.simulation.cometa.sniffCount;
    session.assert('cometa-sniff-rejected-in-vacuum-habitat',
      habSnap.cometa.pressurized === false && sniffAfterVac === sniffBeforeVac,
      `before=${sniffBeforeVac}, after=${sniffAfterVac}`);
    trace('Suite 3 habitat arrived + vacuum check done');

    // Capture 02-aurora-hub.png (wide Aurora hub) & 03-aurora-cometa-crew.png (near console w/ crew & Cometa)
    await session.capture('02-aurora-hub.png');
    await session.walkPath([{ x: -0.6, z: -6.2 }], { arrivalRadius: 0.7 });
    await sleep(600);
    await session.capture('03-aurora-cometa-crew.png');

    // Repair Power -> wait 5 ticks (~2s at 3x)
    await session.walkAndInteract([{ x: -7, z: -4 }, { x: -9.5, z: 0 }], 'battery-bank');
    await session.click('[data-testid="station-choice-0"]', 100); // scanSolar
    await session.click('[data-testid="station-choice-1"]', 100); // repairPower
    await session.closeModal();
    await session.waitTicks(7, 10000);

    // Repair Water -> wait 5 ticks (walk south around AuxBay pad at (-7.5, 2.5))
    await session.walkAndInteract([{ x: -5, z: 0 }, { x: -5, z: 4 }], 'water-recycler');
    await session.click('[data-testid="station-choice-0"]', 100); // scanWater
    await session.click('[data-testid="station-choice-1"]', 100); // repairWater
    await session.closeModal();
    await session.waitTicks(7, 10000);

    // Repair Oxygen -> wait 5 ticks
    await session.walkAndInteract([{ x: 0, z: 3.5 }, { x: 5, z: 4 }], 'oxygen-generator');
    await session.click('[data-testid="station-choice-0"]', 100); // repairOxygen
    await session.closeModal();
    await session.waitTicks(7, 10000);

    // Mission console: AuxBay 3 ports + FieldKit 3 pieces + Undo refund check + Checkpoint
    await session.walkAndInteract([{ x: 3, z: -3 }, { x: 0, z: -5 }], 'mission-console');
    await session.click('[data-testid="btn-aux-power"]', 120);
    await session.click('[data-testid="btn-aux-water"]', 120);
    await session.click('[data-testid="btn-aux-o2"]', 120);
    const snapAux = await session.snap();
    session.assert('aux-bay-3-ports-installed',
      snapAux.auxState.ports.power && snapAux.auxState.ports.water && snapAux.auxState.ports.o2,
      JSON.stringify(snapAux.auxState.ports));

    // Install 3 field kit pieces + check undo refunds exact cost (0.2 kWh)
    await session.setSelect('[data-testid="select-kit-slot"]', '0');
    await session.click('[data-testid="btn-kit-install-relay_mast"]', 100);
    await session.setSelect('[data-testid="select-kit-slot"]', '1');
    await session.click('[data-testid="btn-kit-install-thermal_shield"]', 100);
    await session.setSelect('[data-testid="select-kit-slot"]', '2');
    await session.click('[data-testid="btn-kit-install-sensor_pylon"]', 100);
    const snapKit3 = await session.snap();
    session.assert('field-kit-3-pieces-installed',
      snapKit3.auxState.fieldKitSlots[0] === 'relay_mast' &&
      snapKit3.auxState.fieldKitSlots[1] === 'thermal_shield' &&
      snapKit3.auxState.fieldKitSlots[2] === 'sensor_pylon' &&
      snapKit3.auxState.telemetryRangeM === 55,
      JSON.stringify(snapKit3.auxState));

    const batBeforeUndo = (await session.saveState()).current.simulation.resources.battery;
    await session.click('[data-testid="btn-kit-undo"]', 120);
    const snapKitUndo = await session.snap();
    const batAfterUndo = (await session.saveState()).current.simulation.resources.battery;
    session.assert('field-kit-undo-removes-last-without-duplication',
      snapKitUndo.auxState.fieldKitSlots[2] === null &&
      snapKitUndo.auxState.fieldKitSlots[1] === 'thermal_shield' &&
      Math.abs((batAfterUndo - batBeforeUndo) - 0.2) < 0.001,
      `slots=${JSON.stringify(snapKitUndo.auxState.fieldKitSlots)}, batDelta=${(batAfterUndo - batBeforeUndo).toFixed(3)}`);

    // Re-place sensor_pylon in slot 2, resolve solar_dust_attenuation, save checkpoint
    await session.setSelect('[data-testid="select-kit-slot"]', '2');
    await session.click('[data-testid="btn-kit-install-sensor_pylon"]', 100);
    await session.click('[data-testid="btn-inspect-solar_dust_attenuation"]', 100);
    await session.setInputValue('[data-hypothesis-id="solar_dust_attenuation"]', 'Poeira reduz geração em tempestade conforme telemetria');
    await session.click('[data-testid="btn-probe-solar_dust_attenuation"]', 100);
    await session.click('[data-testid="btn-classify-telemetry-solar_dust_attenuation"]', 100);
    await session.click('[data-testid="btn-checkpoint"]', 120);
    await session.closeModal();

    // Field Locker: 18 kg cap check + preset submit
    await session.walkAndInteract([{ x: -4, z: -8 }, { x: -8, z: -8 }], 'field-locker');
    await session.setCheckbox('[data-loadout-item="auxiliary_drill"]', true);
    await session.click('[data-testid="btn-loadout-submit"]', 120);
    const lockerOverMsg = (await session.domInfo()).feedback;
    session.assert('field-locker-over-18kg-rejected', lockerOverMsg.startsWith('⚠'), `feedback=${lockerOverMsg}`);
    await session.click('[data-testid="btn-loadout-preset"]', 100);
    await session.click('[data-testid="btn-loadout-submit"]', 120);
    session.assert('field-locker-15kg-accepted', (await session.domInfo()).feedback.startsWith('✓'));
    await session.closeModal();

    // Visit Greenhouse to plant Strategy 1 (early_plant) early!
    await session.travelViaPortal([{ x: -4, z: -8 }, { x: 3, z: -5 }, { x: 3, z: 9 }, { x: 13.5, z: 9 }, { x: 17.6, z: 9 }], 'greenhouse-door', 'greenhouse');
    await session.walkAndInteract([{ x: -3.2, z: 3 }], 'crop-bed');
    await session.click('[data-testid="station-choice-0"]', 100); // early_plant
    await session.click('[data-testid="station-choice-2"]', 100); // plantCrop
    session.assert('greenhouse-early-crop-planted', (await session.domInfo()).feedback.startsWith('✓'));
    await session.closeModal();
    await session.travelViaPortal([{ x: 0, z: -11 }], 'return-habitat', 'habitat');

    // Exit Expedition Gate to Canyon (spawns at (0, -14) after returning from greenhouse)
    await session.travelViaPortal([{ x: 2.5, z: -3 }, { x: 0, z: 11 }, { x: 0, z: 22 }], 'expedition-gate', 'canyon');
    trace('Suite 3 complete -> entered Canyon');

    // =========================================================================
    // SUITE 4: Canyon, Discovery Classification, Non-Emissive Ice, Scout & Cometa Recall
    // =========================================================================
    console.log('\n[e2e] --- SUITE 4: Canyon, Discovery, Scout S-02, Ice, Cometa Recall ---');
    const canSnap = await session.snap();
    session.assert('canyon-fog-mode-none', canSnap.fogMode === 0, `fogMode=${canSnap.fogMode}`);

    // Damaged Scout: repair FIRST, verify repaired != recruited, then recruit, scan, recharge
    await session.walkAndInteract([{ x: 0, z: 0 }, { x: 6.5, z: 4.5 }], 'damaged-scout');
    await session.click('[data-testid="station-choice-0"]', 100); // repairCompanion
    await session.closeModal();
    await session.waitTicks(7, 10000);

    await session.walkAndInteract([{ x: 6.5, z: 4.5 }], 'damaged-scout');
    const scoutPreRecruitSnap = await session.snap();
    session.assert('scout-repair-distinct-from-recruitment', !scoutPreRecruitSnap.actors.scout);
    await session.click('[data-testid="station-choice-1"]', 120); // recruitCompanion
    const scoutRecruitedSnap = await session.snap();
    session.assert('scout-recruited-model-active',
      Boolean(scoutRecruitedSnap.actors.scout && !scoutRecruitedSnap.actors.scout.usingFallback));
    await session.click('[data-testid="station-choice-2"]', 120); // dispatchScoutScan (-0.4 kWh)
    await session.click('[data-testid="station-choice-3"]', 120); // rechargeScout (+0.5 kWh)
    await session.closeModal();

    // Survey Beacon (MOD. COM-03): inspect, probe, classify verified_telemetry
    await session.walkAndInteract([{ x: 0, z: 16 }, { x: 0, z: 19.2 }], 'survey-beacon');
    await session.click('[data-testid="btn-inspect-com03_unplugged_cable"]', 100);
    await session.setInputValue('[data-hypothesis-id="com03_unplugged_cable"]', 'Cabo desconectado em COM-03 testado com sonda');
    await session.click('[data-testid="btn-probe-com03_unplugged_cable"]', 100);
    await session.click('[data-testid="btn-classify-telemetry-com03_unplugged_cable"]', 100);
    await session.closeModal();

    // Ice Deposit: collect 0.5 kg ice + classify canyon_ice_strata as fictional_abstraction
    await session.walkAndInteract([{ x: -1.5, z: 14 }, { x: -4.5, z: 13 }], 'ice-deposit');
    await session.click('[data-testid="station-choice-0"]', 100); // collectSample (0.5 kg)
    await session.click('[data-testid="btn-inspect-canyon_ice_strata"]', 100);
    await session.setInputValue('[data-hypothesis-id="canyon_ice_strata"]', 'Depósito didático de treinamento no cânion');
    await session.click('[data-testid="btn-probe-canyon_ice_strata"]', 100);
    await session.click('[data-testid="btn-classify-fiction-canyon_ice_strata"]', 100);
    await session.closeModal();

    // Cometa recall test + capture 04-canyon-scout-ice.png
    await session.clickUntil('[data-testid="cometa-mode-recall"]', async () => (await session.snap()).cometa.mode === 'recall');
    await sleep(350);
    const recallSnap = await session.snap();
    session.assert('cometa-recall-effectiveMode',
      recallSnap.cometa.mode === 'recall' && recallSnap.cometa.effectiveMode === 'recall',
      JSON.stringify(recallSnap.cometa));
    await session.capture('04-canyon-scout-ice.png');
    await session.clickUntil('[data-testid="cometa-mode-follow"]', async () => (await session.snap()).cometa.mode === 'follow');

    // Return to Habitat via return-gate
    await session.travelViaPortal([{ x: 0, z: 0 }, { x: 0, z: -20 }], 'return-gate', 'habitat');

    // =========================================================================
    // SUITE 5: Ice Processing, Storm Shelter + Sniff, Harvest & Victory Report
    // =========================================================================
    console.log('\n[e2e] --- SUITE 5: Ice Processing, Storm Shelter, Harvest, Victory Report ---');
    await session.setSpeed(3);
    await session.walkAndInteract([{ x: 0, z: -5 }], 'mission-console');
    await session.click('[data-testid="station-choice-0"]', 120); // deliverSample
    await session.closeModal();
    await session.waitTicks(12, 15000); // 10s sample processing (~4s at 3x)

    // Save checkpoint cleanly before waiting for storm (so we can reuse clean state later if desired)
    await session.triggerSave();
    const afterSampleSave = await session.saveState();
    session.assert('sample-processed-to-water',
      afterSampleSave.current.simulation.resources.processedIce === 0.5,
      `processedIce=${afterSampleSave.current.simulation.resources.processedIce}`);

    // Wait until storm enters warning/active (lunarTick 180..379)
    await session.waitFor(
      `document.getElementById('storm') && !document.getElementById('storm').hidden`,
      90000,
      500,
    );
    await session.walkAndInteract([{ x: 3, z: -3 }, { x: 3, z: 1 }, { x: 9.2, z: 1 }], 'habitat-shelter');
    await session.click('[data-testid="station-choice-0"]', 200); // shelter (also closes modal)

    // Verify cometaSniff SUCCEEDS inside pressurized shelter!
    const sniffInShelterSnap0 = await session.snap();
    const sniffBtnText = await session.eval(`document.querySelector('[data-testid="cometa-sniff"]')?.textContent?.trim() || ''`);
    session.assert('cometa-ui-pressurized-inside-shelter', sniffBtnText === 'Farejar', `btnText=${sniffBtnText}`);
    session.assert('cometa-pressurized-inside-shelter', sniffInShelterSnap0.cometa.pressurized === true);
    await session.clickUntil('[data-testid="cometa-sniff"]', async () =>
      ((await session.saveState())?.current?.simulation?.cometa?.sniffCount ?? 0) > afterSampleSave.current.simulation.cometa.sniffCount,
    );
    const sniffShelterSave = await session.saveState();
    session.assert('cometa-sniff-succeeds-inside-shelter',
      sniffShelterSave.current.simulation.cometa.sniffCount > afterSampleSave.current.simulation.cometa.sniffCount);

    // Wait for storm to clear (storm banner hides when clear again at lunarTick >= 380)
    await session.waitFor(
      `document.getElementById('storm') && document.getElementById('storm').hidden === true`,
      160000,
      500,
    );
    await session.clickUntil('[data-testid="btn-exit-shelter"]', async () => !(await session.domInfo()).hasExitShelterBtn);

    // Save mid-session while paused & reload immediately to prove Save/Reload preserves state, remainder & Cometa!
    await session.triggerSave(false);
    const preReloadSave = await session.saveState();
    await session.reloadPage();
    await session.click('[data-testid="btn-start-resume"]', 300);
    await session.waitFor(`document.getElementById('modal-layer').hidden === true`, 6000);
    const postReloadSave = await session.saveState();
    const postReloadSnap = await session.snap();
    session.assert('save-reload-preserves-state-and-cometa',
      postReloadSave.version === 4 &&
      postReloadSave.current.simulation.tick === preReloadSave.current.simulation.tick &&
      postReloadSave.current.simulation.remainder === preReloadSave.current.simulation.remainder &&
      postReloadSnap.region === 'habitat' &&
      postReloadSave.cometa.enabled === preReloadSave.cometa.enabled &&
      postReloadSave.current.simulation.cometa.sniffCount === preReloadSave.current.simulation.cometa.sniffCount,
      `preTick=${preReloadSave.current.simulation.tick}, postTick=${postReloadSave.current.simulation.tick}, rem=${preReloadSave.current.simulation.remainder}/${postReloadSave.current.simulation.remainder}`);

    // Travel to Greenhouse (exit shelter ramp west to (2.5, 1), clear north past signpost/oxygen, then east to greenhouse ramp)
    await session.travelViaPortal([{ x: 2.5, z: 1 }, { x: 1.5, z: 11.2 }, { x: 13.5, z: 11.0 }, { x: 17.6, z: 9 }], 'greenhouse-door', 'greenhouse');
    await session.walkAndInteract([{ x: -3.2, z: 3 }], 'crop-bed');
    // Check if crop already at 180/180, otherwise close & wait remainder
    let bedReadout = (await session.domInfo()).readout;
    if (!bedReadout.includes('180/180')) {
      await session.closeModal();
      const m = bedReadout.match(/Cultivo\s*(\d+)\/180/);
      const curCrop = m ? Number(m[1]) : 0;
      const waitNeeded = Math.max(5, 182 - curCrop);
      await session.waitTicks(waitNeeded, 110000);
      await session.walkAndInteract([{ x: -3.2, z: 3 }], 'crop-bed');
    }
    await session.click('[data-testid="station-choice-3"]', 200); // harvest
    await session.closeModal();
    await session.capture('05-greenhouse-harvest.png');

    // Wait for Victory Report modal (next tick triggers phase === 'complete')
    await session.waitFor(
      `document.querySelector('[data-testid="report-modal"]') !== null`,
      8000,
      150,
    );
    const reportHtml = await session.eval(`document.querySelector('[data-testid="report-modal"]')?.textContent || ''`);
    session.assert('victory-report-reached', reportHtml.includes('Aurora está viva'));

    // Test JSON report export interception cleanly without writing outside Downloads
    const exportedJson = await session.eval(`(() => {
      let capturedBlobUrl = null;
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        capturedBlobUrl = this.href;
      };
      try {
        document.querySelector('[data-testid="btn-download-report"]').click();
        return Boolean(capturedBlobUrl);
      } finally {
        HTMLAnchorElement.prototype.click = origClick;
      }
    })()`);
    session.assert('victory-report-json-export', exportedJson === true);

    // =========================================================================
    // SUITE 6: Legacy v3 Migration, Corrupted Storage & Visibility Pause
    // =========================================================================
    console.log('\n[e2e] --- SUITE 6: Legacy v3 Migration, Corrupted JSON, Visibility Pause ---');
    const latestReportSave = await session.saveState();
    const v3BaseSim = latestReportSave?.current?.simulation ?? preReloadSave.current.simulation;

    // Legacy v3 Save Migration test (staged cleanly before app mounts so old-page pagehide cannot resurrect v4)
    const v3Sim = {
      ...structuredClone(v3BaseSim),
      tick: 25,
      remainder: 0.4,
      phase: 'lunar',
      region: 'habitat',
      lunarTick: 10,
      cropGrowth: 0,
      storm: 'clear',
      health: 100,
      log: [],
      awarded: [],
      cometa: {
        ...v3BaseSim.cometa,
        region: 'habitat',
        safePos: { x: 1.5, y: 0, z: -12 },
        safeTargetId: 'mission-console',
      },
      flags: {
        ...v3BaseSim.flags,
        landed: true,
        expedition: false,
        sheltered: false,
        harvested: false,
        sampleDelivered: false,
      },
    };
    const v3Payload = {
      version: 3,
      current: {
        simulation: v3Sim,
        pose: { region: 'habitat', position: { x: 0, y: 0, z: -12 }, heading: 0 },
      },
      checkpoint: {
        simulation: structuredClone(v3Sim),
        pose: { region: 'habitat', position: { x: 0, y: 0, z: -14 }, heading: 0 },
      },
      settings: { quality: 'high', largeText: false, reducedMotion: false, speed: 3 },
    };
    await session.openWithStorageSetup(`
      localStorage.clear();
      localStorage.setItem(${JSON.stringify(LEGACY_V3_KEY)}, ${JSON.stringify(JSON.stringify(v3Payload))});
    `);
    const v3IntroText = await session.eval(`document.querySelector('[data-testid="intro-modal"]')?.textContent || ''`);
    session.assert('legacy-v3-notice-shown', v3IntroText.includes('Save legado v3 migrado'), v3IntroText.slice(0, 120));
    await session.click('[data-testid="btn-start-resume"]', 300);
    await session.waitFor(`document.getElementById('modal-layer').hidden === true`, 12000);
    await session.waitFor(`(() => { const s = window.__ASTRA_WORLD_DEBUG__?.getSnapshot(); return Boolean(s && s.region === 'habitat' && s.paused === false); })()`, 12000);
    const migrated = await session.saveState();
    session.assert('legacy-v3-migrated-to-v4',
      migrated && migrated.version === 4 && migrated.current.simulation.region === 'habitat',
      `version=${migrated?.version}, region=${migrated?.current?.simulation?.region}`);

    // Visibilitychange hidden pause + key release check (zero offline ticks!)
    const { targetId: bgTarget } = await browserCtx.browser.send('Target.createTarget', { url: 'about:blank', background: true });
    await browserCtx.browser.send('Target.activateTarget', { targetId: session.targetId });
    await session.focusWorldCanvas();
    const posBeforeVis = (await session.snap()).actors.astronaut.position;
    await session.keyDown('w', 'KeyW', 87);
    await session.waitFor(`(() => {
      const p = window.__ASTRA_WORLD_DEBUG__?.getSnapshot()?.actors?.astronaut?.position;
      return Boolean(p && Math.hypot(p.x - (${posBeforeVis.x}), p.z - (${posBeforeVis.z})) > 0.12);
    })()`, 3000, 60);
    await session.eval(`(() => {
      window.__astraVisLog = [];
      document.addEventListener('visibilitychange', () => {
        window.__astraVisLog.push({
          hidden: document.hidden,
          time: document.getElementById('time')?.textContent || '',
          ts: performance.now(),
        });
      });
    })()`);
    await browserCtx.browser.send('Target.activateTarget', { targetId: bgTarget });
    await sleep(3500);
    await browserCtx.browser.send('Target.activateTarget', { targetId: session.targetId });
    await session.waitFor(`document.hidden === false && Array.isArray(window.__astraVisLog) && window.__astraVisLog.length >= 2`, 4000, 50);
    const visLog = await session.eval(`window.__astraVisLog`);
    // Keep W logically "un-released" via keyboard check -> after blur/visibilitychange, held keys MUST have cleared!
    const posAfterVis1 = (await session.snap()).actors.astronaut.position;
    await sleep(450);
    const posAfterVis2 = (await session.snap()).actors.astronaut.position;
    await session.keyUp('w', 'KeyW', 87);
    await browserCtx.browser.send('Target.closeTarget', { targetId: bgTarget });
    const parseSec = (t) => {
      const m = t?.match(/T\+\s*(\d+):(\d+)/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
    };
    const hideEv = visLog.find((e) => e.hidden === true);
    const showEv = [...visLog].reverse().find((e) => e.hidden === false);
    session.assert('visibilitychange-pauses-zero-offline-progress',
      Boolean(hideEv && showEv && (showEv.ts - hideEv.ts) >= 2500 && parseSec(showEv.time) === parseSec(hideEv.time)),
      `hide=${JSON.stringify(hideEv)}, show=${JSON.stringify(showEv)}`);
    session.assert('visibilitychange-clears-held-keys',
      Math.hypot(posAfterVis2.x - posAfterVis1.x, posAfterVis2.z - posAfterVis1.z) < 0.05 &&
      Math.hypot(posAfterVis1.x - posBeforeVis.x, posAfterVis1.z - posBeforeVis.z) > 0.05,
      `p1=${JSON.stringify(posAfterVis1)}, p2=${JSON.stringify(posAfterVis2)}`);

    // Audit unstarted pagehide behavior + Corrupted localStorage handling cleanly
    await session.openWithStorageSetup(`localStorage.clear();`);
    await session.reloadPage();
    const unstartedSave = await session.eval(`localStorage.getItem('${SAVE_KEY}')`);
    session.assert('unstarted-pagehide-does-not-write-save', unstartedSave === null, `wroteSave=${Boolean(unstartedSave)}`);

    await session.openWithStorageSetup(`
      localStorage.clear();
      localStorage.setItem('${SAVE_KEY}', '{corrupted_json!!!');
    `);
    const corruptNotice = await session.eval(`document.querySelector('[data-testid="intro-modal"]')?.textContent || ''`);
    const hasCorruptResume = await session.eval(`Boolean(document.querySelector('[data-testid="btn-start-resume"]'))`);
    session.assert('corrupted-storage-handled-cleanly',
      corruptNotice.includes('corrompido') && !hasCorruptResume && (await session.domInfo()).modalTestId === 'intro-modal',
      `hasResume=${hasCorruptResume}`);

    // =========================================================================
    // SUITE 7: Cometa DISABLED + Strategy 2 (deferred_plant) + Storm Fail + Checkpoint Retry
    // =========================================================================
    console.log('\n[e2e] --- SUITE 7: Cometa Disabled + Deferred Plant + Storm Fail & Checkpoint Retry ---');
    await session.setCheckbox('[data-testid="toggle-intro-cometa"]', false);
    await session.click('[data-testid="btn-start-new"]', 250);
    await session.waitFor(`document.getElementById('modal-layer').hidden === true`, 5000);
    const noCometaSnap = await session.snap();
    session.assert('cometa-disabled-removes-actor-and-nodes',
      noCometaSnap.cometa.enabled === false && !noCometaSnap.actors.cometa,
      `actors=${JSON.stringify(Object.keys(noCometaSnap.actors))}`);

    // Keep speed 3x, clear Academy quickly with Cometa disabled
    await session.setSpeed(3);
    await session.walkAndInteract([{ x: -3.2, z: 0 }], 'academy-console');
    await session.click('[data-testid="station-choice-0"]', 80); // diagnose
    await session.click('[data-testid="station-choice-1"]', 80); // shedLoad
    await session.closeModal();
    await session.waitTicks(17, 15000);
    await session.setSpeed(1);
    await session.travelViaPortal([{ x: 0, z: 4 }, { x: 0, z: 12 }], 'academy-launch', 'orbit');
    await session.walkAndInteract([{ x: -2.5, z: 1 }], 'cargo');
    await session.click('[data-testid="station-choice-0"]', 100); // default cargo 40 kg
    await session.closeModal();
    await session.travelViaPortal([{ x: 0, z: 9.5 }], 'lunar-transfer', 'habitat');

    // Repair Power/Water/O2, Locker, Strategy 2 (deferred_plant), Canyon Scout & Sample
    await session.walkAndInteract([{ x: -3.5, z: -10 }, { x: -3.5, z: -3.5 }, { x: -9.5, z: 0 }], 'battery-bank');
    await session.click('[data-testid="station-choice-1"]', 100); // repairPower
    await session.closeModal();
    await session.waitTicks(7, 10000);

    await session.walkAndInteract([{ x: -5, z: 0 }, { x: -5, z: 4 }], 'water-recycler');
    await session.click('[data-testid="station-choice-1"]', 100); // repairWater
    await session.closeModal();
    await session.waitTicks(7, 10000);

    await session.walkAndInteract([{ x: 0, z: 3.5 }, { x: 5, z: 4 }], 'oxygen-generator');
    await session.click('[data-testid="station-choice-0"]', 100); // repairOxygen
    await session.closeModal();
    await session.waitTicks(7, 10000);

    await session.walkAndInteract([{ x: 2.5, z: -5 }, { x: -3.5, z: -9.5 }, { x: -8, z: -8 }], 'field-locker');
    await session.click('[data-testid="btn-loadout-submit"]', 100);
    await session.closeModal();

    // Deferred plant choice in Greenhouse (do NOT plant before storm!)
    await session.travelViaPortal([{ x: -4, z: -8 }, { x: 2.5, z: -3 }, { x: 1.5, z: 11.2 }, { x: 13.5, z: 11.0 }, { x: 17.6, z: 9 }], 'greenhouse-door', 'greenhouse');
    await session.walkAndInteract([{ x: -3.2, z: 3 }], 'crop-bed');
    await session.click('[data-testid="station-choice-1"]', 100); // deferred_plant!
    await session.closeModal();
    await session.travelViaPortal([{ x: 0, z: -11 }], 'return-habitat', 'habitat');

    // Canyon: collect 0.5kg ice + repair & recruit Scout cleanly without Cometa
    await session.travelViaPortal([{ x: 3, z: -5 }, { x: 0, z: 11 }, { x: 0, z: 22 }], 'expedition-gate', 'canyon');
    await session.walkAndInteract([{ x: 0, z: 0 }, { x: 6.5, z: 4.5 }], 'damaged-scout');
    await session.click('[data-testid="station-choice-0"]', 100); // repairCompanion
    await session.closeModal();
    await session.waitTicks(7, 10000);
    await session.walkAndInteract([{ x: 6.5, z: 4.5 }], 'damaged-scout');
    await session.click('[data-testid="station-choice-1"]', 100); // recruitCompanion
    await session.closeModal();
    await session.walkAndInteract([{ x: -1.5, z: 14 }, { x: -4.5, z: 13 }], 'ice-deposit');
    await session.click('[data-testid="station-choice-0"]', 100); // collectSample
    await session.closeModal();
    await session.travelViaPortal([{ x: 0, z: 0 }, { x: 0, z: -20 }], 'return-gate', 'habitat');

    // Deliver sample + process (10s)
    await session.setSpeed(3);
    await session.walkAndInteract([{ x: 0, z: -5 }], 'mission-console');
    await session.click('[data-testid="station-choice-0"]', 100); // deliverSample
    await session.closeModal();
    await session.waitTicks(12, 18000);

    // Wait until storm warning appears (lunarTick >= 180) and advance near active window (~275)
    // so both storm-fail and retry->shelter run cleanly without excessive idle waiting.
    await session.waitFor(`document.getElementById('storm') && !document.getElementById('storm').hidden`, 90000, 500);
    await session.waitTicks(95, 55000);

    // Save clean checkpoint right before active storm failure test!
    await session.walkAndInteract([{ x: 0, z: -5 }], 'mission-console');
    await session.click('[data-testid="btn-checkpoint"]', 120);
    const cpBeforeFail = await session.saveState();
    await session.closeModal();
    trace('Suite 7 pre-active-storm checkpoint saved');

    // Intentionally IGNORE storm until active storm depletes safety health -> phase === 'failed'
    await session.waitFor(
      `document.querySelector('[data-testid="report-modal"]') !== null`,
      90000,
      500,
    );
    const failText = await session.eval(`document.querySelector('[data-testid="report-modal"]')?.textContent || ''`);
    session.assert('storm-ignored-triggers-failure', failText.includes('Uma decisão pode mudar'));

    // Restore checkpoint -> confirm NO duplication of parts/ice/recruitment!
    await session.click('[data-testid="btn-retry-checkpoint"]', 250);
    await session.waitFor(`(() => { const m = document.getElementById('modal-layer'); const s = window.__ASTRA_WORLD_DEBUG__?.getSnapshot(); return Boolean(m?.hidden && s && s.region === 'habitat' && s.paused === false); })()`, 12000);
    await session.triggerSave();
    const afterRetry = await session.saveState();
    session.assert('checkpoint-retry-no-duplication',
      afterRetry.current.simulation.phase === 'lunar' &&
      afterRetry.current.simulation.health === 100 &&
      afterRetry.current.simulation.resources.parts === cpBeforeFail.checkpoint.simulation.resources.parts &&
      afterRetry.current.simulation.resources.processedIce === cpBeforeFail.checkpoint.simulation.resources.processedIce &&
      afterRetry.current.simulation.flags.scoutRecruited === cpBeforeFail.checkpoint.simulation.flags.scoutRecruited,
      `parts=${afterRetry.current.simulation.resources.parts}`);

    // Now shelter storm -> deferred_plant after storm -> harvest -> COMPLETE with Cometa DISABLED!
    await session.walkAndInteract([{ x: 3, z: -3 }, { x: 3, z: 1 }, { x: 9.2, z: 1 }], 'habitat-shelter');
    await session.click('[data-testid="station-choice-0"]', 150); // shelter
    await session.waitFor(`document.getElementById('storm') && document.getElementById('storm').hidden === true`, 120000, 500);
    await session.clickUntil('[data-testid="btn-exit-shelter"]', async () => !(await session.domInfo()).hasExitShelterBtn);
    trace('Suite 7 survived storm, heading to greenhouse');

    await session.travelViaPortal([{ x: 2.5, z: 1 }, { x: 1.5, z: 11.2 }, { x: 13.5, z: 11.0 }, { x: 17.6, z: 9 }], 'greenhouse-door', 'greenhouse');
    await session.walkAndInteract([{ x: -3.2, z: 3 }], 'crop-bed');
    await session.click('[data-testid="station-choice-2"]', 100); // plantCrop (deferred_plant!)
    await session.closeModal();
    await session.waitTicks(184, 120000); // ~61s at 3x speed
    await session.walkAndInteract([{ x: -3.2, z: 3 }], 'crop-bed');
    await session.click('[data-testid="station-choice-3"]', 150); // harvest
    await session.closeModal();
    await session.waitFor(`document.querySelector('[data-testid="report-modal"]') !== null`, 8000, 150);
    const noCometaWin = await session.eval(`document.querySelector('[data-testid="report-modal"]')?.textContent || ''`);
    session.assert('cometa-disabled-deferred-plant-completes-campaign',
      noCometaWin.includes('Aurora está viva') && noCometaWin.includes('opcional desativado'));

    // =========================================================================
    // SUITE 8: 20 Real WebGL2 Region Transitions Leak Check + Sustained Perf Trace
    // =========================================================================
    console.log('\n[e2e] --- SUITE 8: 20 Region Transitions Leak Check & Sustained Perf Trace ---');
    // Load back cleanly into the Suite 7 checkpoint, wait out storm cleanly in shelter at 3x so sky is clear for canyon + greenhouse, then set 1x!
    await session.click('[data-testid="btn-retry-checkpoint"]', 250);
    await session.waitFor(`(() => { const m = document.getElementById('modal-layer'); const s = window.__ASTRA_WORLD_DEBUG__?.getSnapshot(); return Boolean(m?.hidden && s && s.region === 'habitat' && s.paused === false); })()`, 12000);
    await session.setSpeed(3);
    await session.walkAndInteract([{ x: 3, z: -3 }, { x: 3, z: 1 }, { x: 9.2, z: 1 }], 'habitat-shelter');
    await session.click('[data-testid="station-choice-0"]', 150); // shelter
    await session.waitFor(`document.getElementById('storm') && document.getElementById('storm').hidden === true`, 120000, 500);
    await session.clickUntil('[data-testid="btn-exit-shelter"]', async () => !(await session.domInfo()).hasExitShelterBtn);
    await session.walkPath([{ x: 2.8, z: 1 }, { x: 2.8, z: -6.5 }, { x: 0, z: -6 }], { arrivalRadius: 1.0 });
    await session.setSpeed(1);
    const countsPerHabitatVisit = [];
    const baselineHab = (await session.snap()).sceneCounts;
    countsPerHabitatVisit.push(baselineHab);

    let transitionsDone = 0;
    let canyonCycles = 0;
    for (let cycle = 0; cycle < 10; cycle++) {
      // Clear sky guarantees both canyon and greenhouse transitions run without storm interruption!
      const st = await session.domInfo();
      const useCanyon = !st.stormVisible && (cycle === 0 || cycle === 4 || cycle === 8);
      if (useCanyon) {
        canyonCycles++;
        await session.travelViaPortal([{ x: 2.5, z: -3 }, { x: 0, z: 11 }, { x: 0, z: 22 }], 'expedition-gate', 'canyon');
        transitionsDone++;
        await session.travelViaPortal([{ x: 0, z: -20 }], 'return-gate', 'habitat');
        transitionsDone++;
      } else {
        await session.travelViaPortal([{ x: 2.5, z: -3 }, { x: 1.5, z: 11.2 }, { x: 13.5, z: 11.0 }, { x: 17.6, z: 9 }], 'greenhouse-door', 'greenhouse');
        transitionsDone++;
        await session.travelViaPortal([{ x: 0, z: -11 }], 'return-habitat', 'habitat');
        transitionsDone++;
      }
      countsPerHabitatVisit.push((await session.snap()).sceneCounts);
    }

    const firstHab = countsPerHabitatVisit[0];
    const lastHab = countsPerHabitatVisit[countsPerHabitatVisit.length - 1];
    console.log('[e2e] Leak check sceneCounts:', JSON.stringify({ transitionsDone, canyonCycles, firstHab, lastHab }));
    session.assert('twenty-region-transitions-zero-resource-growth',
      transitionsDone === 20 &&
      canyonCycles >= 1 &&
      lastHab.meshes === firstHab.meshes &&
      lastHab.skeletons === firstHab.skeletons &&
      lastHab.animationGroups === firstHab.animationGroups &&
      lastHab.materials === firstHab.materials &&
      lastHab.textures === firstHab.textures &&
      lastHab.lights === firstHab.lights,
      `transitions=${transitionsDone}, first=${JSON.stringify(firstHab)}, last=${JSON.stringify(lastHab)}`);

    // Sustained 10s render performance trace in Aurora habitat (1280x800, quality='high')
    await session.click('[data-testid="btn-settings"]', 100);
    await session.setSelect('[data-testid="setting-quality"]', 'high');
    await session.closeModal();
    await sleep(500);
    const perfSamples = await session.eval(`(async () => {
      const rafDeltas = [];
      let last = performance.now();
      let running = true;
      const onFrame = (now) => {
        rafDeltas.push(now - last);
        last = now;
        if (running) requestAnimationFrame(onFrame);
      };
      requestAnimationFrame(onFrame);
      const metricSamples = [];
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const s = window.__ASTRA_WORLD_DEBUG__.getSnapshot();
        metricSamples.push(s.metrics);
      }
      running = false;
      const sortedRaf = rafDeltas.slice(1).sort((a, b) => a - b);
      const avgRaf = sortedRaf.reduce((a, b) => a + b, 0) / Math.max(1, sortedRaf.length);
      const p95Raf = sortedRaf[Math.min(sortedRaf.length - 1, Math.floor(sortedRaf.length * 0.95))] ?? 0;
      const p99Raf = sortedRaf[Math.min(sortedRaf.length - 1, Math.floor(sortedRaf.length * 0.99))] ?? 0;
      const avgFps = metricSamples.reduce((a, m) => a + m.fps, 0) / metricSamples.length;
      const lastM = metricSamples[metricSamples.length - 1];
      return {
        durationMs: 10000,
        rafCount: sortedRaf.length,
        avgRafMs: Number(avgRaf.toFixed(2)),
        p95RafMs: Number(p95Raf.toFixed(2)),
        p99RafMs: Number(p99Raf.toFixed(2)),
        avgBabylonFps: Number(avgFps.toFixed(1)),
        lastMetrics: lastM,
      };
    })()`);
    console.log('[e2e] Sustained Perf Telemetry (habitat, 1280x800, quality=high):', JSON.stringify(perfSamples, null, 2));
    session.assert('sustained-perf-measured-10s',
      perfSamples.rafCount >= 60 && perfSamples.avgBabylonFps > 0,
      `fps=${perfSamples.avgBabylonFps}, p95=${perfSamples.p95RafMs}ms`);

    // =========================================================================
    // SUITE 9: Keyboard-Only Modal Tab Trap / Esc Focus Return / A11y + 390x844 Mobile Touch
    // =========================================================================
    console.log('\n[e2e] --- SUITE 9: Keyboard Trap, Esc Focus, A11y, Mobile Touch 390x844 ---');
    await session.focusWorldCanvas();
    await session.tapKey('Escape', 'Escape', 27, 60);
    await session.waitFor(`document.querySelector('[data-testid="pause-modal"]') !== null`, 3000);
    let stayedInModal = true;
    for (let i = 0; i < 14; i++) {
      await session.tapKey('Tab', 'Tab', 9, 40);
      const d = await session.domInfo();
      if (!d.activeInModal) {
        stayedInModal = false;
        break;
      }
    }
    session.assert('keyboard-tab-trap-stays-in-modal', stayedInModal);

    await session.tapKey('Escape', 'Escape', 27, 60);
    await session.waitFor(`document.getElementById('modal-layer').hidden === true`, 3000);
    const afterEsc = await session.domInfo();
    session.assert('keyboard-esc-closes-modal-and-returns-focus-to-world',
      afterEsc.modalHidden && afterEsc.activeElId === 'world',
      `activeEl=${afterEsc.activeElTag}#${afterEsc.activeElId}`);

    // Test largeText + reducedMotion toggles
    await session.click('[data-testid="btn-settings"]', 120);
    await session.setCheckbox('[data-testid="setting-large-text"]', true);
    await session.setCheckbox('[data-testid="setting-reduced-motion"]', true);
    const a11yCheck = await session.eval(`({
      largeText: document.documentElement.classList.contains('large-text'),
      reducedCss: document.documentElement.classList.contains('reduced-motion'),
      worldReduced: window.__ASTRA_WORLD_DEBUG__.getSnapshot().reducedMotion,
    })`);
    session.assert('a11y-largeText-reducedMotion-apply',
      a11yCheck.largeText && a11yCheck.reducedCss && a11yCheck.worldReduced,
      JSON.stringify(a11yCheck));
    await session.setCheckbox('[data-testid="setting-large-text"]', false);
    await session.setCheckbox('[data-testid="setting-reduced-motion"]', false);
    await session.closeModal();

    // Switch to Mobile Touch Viewport (390x844, DPR 2, touch enabled)
    await session.setViewport(390, 844, 2, true);
    await sleep(300);
    const mobileAudit = await session.eval(`(() => {
      const touchBtns = Array.from(document.querySelectorAll('[data-testid="touch-controls"] button'))
        .filter((b) => getComputedStyle(b).display !== 'none')
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            testid: b.getAttribute('data-testid') || b.getAttribute('data-touch-move') || b.textContent?.trim(),
            w: Math.round(r.width * 10) / 10,
            h: Math.round(r.height * 10) / 10,
          };
        });
      const sideBtns = Array.from(document.querySelectorAll('.side-tools button'))
        .filter((b) => getComputedStyle(b).display !== 'none')
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            testid: b.getAttribute('data-testid'),
            w: Math.round(r.width * 10) / 10,
            h: Math.round(r.height * 10) / 10,
          };
        });
      return {
        touchVisible: !document.getElementById('touch-controls')?.hidden && getComputedStyle(document.getElementById('touch-controls')).display !== 'none',
        touchBtns,
        sideBtns,
      };
    })()`);
    console.log('[e2e] Mobile 390x844 button geometry:', JSON.stringify(mobileAudit, null, 2));
    session.assert('mobile-touch-controls-visible-ge-44x44',
      mobileAudit.touchVisible &&
      mobileAudit.touchBtns.length >= 6 &&
      mobileAudit.touchBtns.every((b) => b.w >= 44 && b.h >= 44),
      JSON.stringify(mobileAudit.touchBtns));

    // Touch move forward via real CDP TouchEvent on [data-touch-move="forward"]
    const touchPos0 = (await session.snap()).actors.astronaut.position;
    const fwdBtn = await session.eval(`(() => {
      const r = document.querySelector('[data-touch-move="forward"]').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    await session.page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: fwdBtn.x, y: fwdBtn.y, id: 1 }],
    });
    await sleep(500);
    await session.page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await sleep(120);
    const touchPos1 = (await session.snap()).actors.astronaut.position;
    session.assert('mobile-touch-dpad-moves-astronaut',
      Math.hypot(touchPos1.x - touchPos0.x, touchPos1.z - touchPos0.z) > 0.3,
      `before=${JSON.stringify(touchPos0)}, after=${JSON.stringify(touchPos1)}`);

    await session.capture('06-mobile-touch-hud.png');

    // Final Network & Runtime Error Audit
    session.assert('zero-uncaught-js-exceptions', session.exceptions.length === 0, JSON.stringify(session.exceptions));
    session.assert('zero-console-errors', session.consoleErrors.length === 0, JSON.stringify(session.consoleErrors));
    session.assert('zero-external-network-requests', session.externalRequests.length === 0, JSON.stringify(session.externalRequests));
    session.assert('zero-network-loading-failures', session.loadingFailures.length === 0, JSON.stringify(session.loadingFailures));
    session.assert('zero-http-4xx-5xx-responses', session.badResponses.length === 0, JSON.stringify(session.badResponses));

    // Summary Output
    console.log('\n==================== ASTRA E2E SUMMARY ====================');
    console.log(`Passed checks (${session.passes.length}):`, session.passes.join(', '));
    console.log(`Captures saved (${session.captures.length}):`, session.captures.join(', '));
    if (session.assertFailures.length > 0) {
      console.error(`\nFAILED CHECKS (${session.assertFailures.length}):`);
      for (const f of session.assertFailures) console.error(' -', f);
      process.exitCode = 1;
    } else {
      console.log('\nALL REAL-BROWSER CHROME/WEBGL2 E2E CHECKS PASSED!');
    }
  } finally {
    if (browserCtx) await browserCtx.cleanup(browserCtx.browser);
    server.close();
  }
}

runAll().catch((err) => {
  console.error('[e2e] Fatal runner error:', err);
  process.exit(1);
});
