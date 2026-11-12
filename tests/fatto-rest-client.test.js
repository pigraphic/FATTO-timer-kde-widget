import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

function loadRestClient(customGlobals = {}) {
  const filePath = fileURLToPath(new URL('../contents/ui/js/FattoRestClient.js', import.meta.url));
  let code = fs.readFileSync(filePath, 'utf8');
  // Strip .pragma library directive for Node.js execution
  code = code.replace(/^\s*\.pragma\s+[^\n]+/m, '');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    fetch: globalThis.fetch,
    URL: globalThis.URL,
    encodeURIComponent,
    JSON,
    Object,
    Error,
    Date,
    String,
    console,
    globalThis: {
      fetch: globalThis.fetch
    },
    ...customGlobals
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.module.exports;
}

let Client;
try {
  Client = loadRestClient();
} catch (e) {
  // If file doesn't exist yet, Client remains undefined so tests fail as expected in TDD
  Client = null;
}

let server;
let port;
let baseUrl;

test.before((_, done) => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/user/login' && req.method === 'POST') {
        const parsed = JSON.parse(body || '{}');
        if (parsed.username === 'testuser' && parsed.password === 'secret') {
          res.writeHead(200);
          return res.end(JSON.stringify({
            ok: true,
            data: { token: 'jwt.mock.token', user: { id: 'usr_123', username: 'testuser' } }
          }));
        }
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: 'Invalid credentials' }));
      }

      if (req.headers.authorization !== 'Bearer jwt.mock.token') {
        res.writeHead(401);
        return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }

      if (req.url === '/api/user/token/refresh' && req.method === 'POST') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: { token: 'jwt.mock.refreshed' }
        }));
      }

      if (req.url.startsWith('/api/kanban/workspace/list') && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: [
            { id: 'ws_1', name: 'Default Workspace' },
            { id: 'ws_2', name: 'Projects' }
          ]
        }));
      }

      if (req.url.startsWith('/api/kanban/board/list') && req.method === 'GET') {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const idWorkspace = urlObj.searchParams.get('id_workspace');
        if (idWorkspace === 'ws_1') {
          res.writeHead(200);
          return res.end(JSON.stringify({
            ok: true,
            data: [
              { id: 'b_1', name: 'Board 1', id_workspace: 'ws_1' },
              { id: 'b_2', name: 'Board 2', id_workspace: 'ws_1' }
            ]
          }));
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: [] }));
      }

      if (req.url.startsWith('/api/kanban/schedule/list') && req.method === 'GET') {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const idBoards = urlObj.searchParams.get('id_boards');
        if (idBoards) {
          const boards = idBoards.split(',');
          res.writeHead(200);
          return res.end(JSON.stringify({
            ok: true,
            data: [{ id: 'sch_filtered', id_card: 'c_1', card_code: 'FATTO-10', card_title: 'Task 1', id_board: boards[0], id_boards: idBoards }]
          }));
        }
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: [{ id: 'sch_1', id_card: 'c_1', card_code: 'FATTO-10', card_title: 'Task 1' }]
        }));
      }

      if (req.url === '/api/kanban/timer/mine' && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: [{ id: 'sess_1', id_card: 'c_2', code: 'FATTO-20', started: Date.now() - 60000 }]
        }));
      }

      if (req.url.startsWith('/api/kanban/timer/get') && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: { id_card: 'c_1', timer_running: true }
        }));
      }

      if (req.url.startsWith('/api/kanban/timer/sessions') && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: [{ id: 'sess_1', id_card: 'c_1', id_user: 'usr_123', started: Date.now() - 50000, seconds: 50 }]
        }));
      }

      if (req.url === '/api/kanban/timer/start' && req.method === 'POST') {
        const parsed = JSON.parse(body || '{}');
        if (parsed.id_card) {
          res.writeHead(200);
          return res.end(JSON.stringify({ ok: true, data: { timer: { state: 'running', id_card: parsed.id_card } } }));
        }
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: 'Missing id_card' }));
      }

      if (req.url === '/api/kanban/timer/pause' && req.method === 'POST') {
        const parsed = JSON.parse(body || '{}');
        if (parsed.id_card) {
          res.writeHead(200);
          return res.end(JSON.stringify({ ok: true, data: { timer: { state: 'paused', id_card: parsed.id_card } } }));
        }
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: 'Missing id_card' }));
      }

      res.writeHead(404);
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    });
  });

  server.listen(0, '127.0.0.1', () => {
    port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

test.after((_, done) => {
  server.close(done);
});

test('contents/ui/js/FattoRestClient.js contains .pragma library directive at top', () => {
  const filePath = fileURLToPath(new URL('../contents/ui/js/FattoRestClient.js', import.meta.url));
  const code = fs.readFileSync(filePath, 'utf8');
  assert.match(code.trim(), /^\.pragma\s+library/);
});

test('contents/ui/js/FattoRestClient.js does not contain ESM export keywords that break QML', () => {
  const filePath = fileURLToPath(new URL('../contents/ui/js/FattoRestClient.js', import.meta.url));
  const code = fs.readFileSync(filePath, 'utf8');
  assert.doesNotMatch(code, /\bexport\s+(function|const|var|let|default)\b/);
});

test('login succeeds with correct credentials and fails on invalid', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const success = await new Promise(resolve => {
    Client.login(baseUrl, 'testuser', 'secret', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(success.err, null);
  assert.equal(success.status, 200);
  assert.equal(success.data.token, 'jwt.mock.token');
  assert.equal(success.data.user.id, 'usr_123');

  const failure = await new Promise(resolve => {
    Client.login(baseUrl, 'testuser', 'wrong', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.ok(failure.err !== null);
  assert.equal(failure.status, 403);
  assert.match(failure.err.message, /Invalid credentials/);
});

test('refreshToken refreshes authentication token', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const res = await new Promise(resolve => {
    Client.refreshToken(baseUrl, 'jwt.mock.token', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(res.err, null);
  assert.equal(res.status, 200);
  assert.equal(res.data.token, 'jwt.mock.refreshed');
});

test('getSchedule fetches scheduled items', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const res = await new Promise(resolve => {
    Client.getSchedule(baseUrl, 'jwt.mock.token', '2026-11-12', (err, items, status) => {
      resolve({ err, items, status });
    });
  });
  assert.equal(res.err, null);
  assert.equal(res.status, 200);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].card_code, 'FATTO-10');
});

test('getMyTimers fetches current active user timers', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const res = await new Promise(resolve => {
    Client.getMyTimers(baseUrl, 'jwt.mock.token', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(res.err, null);
  assert.equal(res.status, 200);
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].code, 'FATTO-20');
});

test('getCardTimer and getCardSessions retrieve card timer status and sessions', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const timerRes = await new Promise(resolve => {
    Client.getCardTimer(baseUrl, 'jwt.mock.token', 'c_1', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(timerRes.err, null);
  assert.equal(timerRes.data.id_card, 'c_1');
  assert.equal(timerRes.data.timer_running, true);

  const sessionsRes = await new Promise(resolve => {
    Client.getCardSessions(baseUrl, 'jwt.mock.token', 'c_1', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(sessionsRes.err, null);
  assert.equal(sessionsRes.data.length, 1);
  assert.equal(sessionsRes.data[0].id_card, 'c_1');
  assert.equal(sessionsRes.data[0].seconds, 50);
});

test('startTimer and pauseTimer call endpoints successfully', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const start = await new Promise(resolve => {
    Client.startTimer(baseUrl, 'jwt.mock.token', 'c_1', (err, data, status) => resolve({ err, data, status }));
  });
  assert.equal(start.err, null);
  assert.equal(start.status, 200);
  assert.equal(start.data.timer.state, 'running');

  const pause = await new Promise(resolve => {
    Client.pauseTimer(baseUrl, 'jwt.mock.token', 'c_1', (err, data, status) => resolve({ err, data, status }));
  });
  assert.equal(pause.err, null);
  assert.equal(pause.status, 200);
  assert.equal(pause.data.timer.state, 'paused');
});

test('normalizes baseUrl with multiple trailing slashes', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const slashBaseUrl = baseUrl + '///';
  const res = await new Promise(resolve => {
    Client.getMyTimers(slashBaseUrl, 'jwt.mock.token', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(res.err, null);
  assert.equal(res.status, 200);
  assert.equal(res.data[0].code, 'FATTO-20');
});

test('getCleanBaseUrl prepends https:// when protocol is omitted and strips trailing slashes', () => {
  assert.ok(Client.getCleanBaseUrl, 'getCleanBaseUrl function must be exported');
  assert.equal(Client.getCleanBaseUrl('fatto.os3.services'), 'https://fatto.os3.services');
  assert.equal(Client.getCleanBaseUrl('fatto.os3.services/'), 'https://fatto.os3.services');
  assert.equal(Client.getCleanBaseUrl('http://custom.domain:8080///'), 'http://custom.domain:8080');
  assert.equal(Client.getCleanBaseUrl('https://custom.domain///'), 'https://custom.domain');
  assert.equal(Client.getCleanBaseUrl(''), '');
  assert.equal(Client.getCleanBaseUrl(null), '');
});

test('handles 401 Unauthorized properly', async () => {
  assert.ok(Client, 'FattoRestClient module must be loaded');
  const res = await new Promise(resolve => {
    Client.getMyTimers(baseUrl, 'invalid.token', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.ok(res.err !== null);
  assert.equal(res.status, 401);
  assert.match(res.err.message, /Unauthorized/);
});

test('works with XMLHttpRequest when available (QML runtime simulation)', async () => {
  // Simulate XMLHttpRequest as provided in Qt/QML runtime
  class MockXMLHttpRequest {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.headers = {};
    }
    open(method, url) {
      this.method = method;
      this.url = url;
      this.readyState = 1;
    }
    setRequestHeader(k, v) {
      this.headers[k] = v;
    }
    send(body) {
      // Use node http client to fulfill request against mock server
      const urlObj = new URL(this.url);
      const req = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: this.method,
        headers: this.headers
      }, res => {
        let respBody = '';
        res.on('data', chunk => { respBody += chunk; });
        res.on('end', () => {
          this.readyState = 4;
          this.status = res.statusCode;
          this.statusText = res.statusMessage || '';
          this.responseText = respBody;
          if (this.onreadystatechange) this.onreadystatechange();
        });
      });
      req.on('error', err => {
        if (this.onerror) this.onerror(err);
      });
      if (body) req.write(body);
      req.end();
    }
  }

  const QmlClient = loadRestClient({
    XMLHttpRequest: MockXMLHttpRequest,
    globalThis: { XMLHttpRequest: MockXMLHttpRequest }
  });

  const res = await new Promise(resolve => {
    QmlClient.login(baseUrl, 'testuser', 'secret', (err, data, status) => {
      resolve({ err, data, status });
    });
  });
  assert.equal(res.err, null);
  assert.equal(res.status, 200);
  assert.equal(res.data.token, 'jwt.mock.token');
});

test('getWorkspaces fetches visible workspaces list', async () => {
  const res = await new Promise(resolve => {
    Client.getWorkspaces(baseUrl, 'jwt.mock.token', (err, items) => resolve({ err, items }));
  });
  assert.equal(res.err, null);
  assert.ok(Array.isArray(res.items));
  assert.equal(res.items.length, 2);
  assert.equal(res.items[0].id, 'ws_1');
  assert.equal(res.items[0].name, 'Default Workspace');
});

test('getBoards fetches boards for a workspace', async () => {
  const res = await new Promise(resolve => {
    Client.getBoards(baseUrl, 'jwt.mock.token', 'ws_1', (err, items) => resolve({ err, items }));
  });
  assert.equal(res.err, null);
  assert.ok(Array.isArray(res.items));
  assert.equal(res.items.length, 2);
  assert.equal(res.items[0].id, 'b_1');
});

test('getSchedule supports boardIds filtering', async () => {
  const res = await new Promise(resolve => {
    Client.getSchedule(baseUrl, 'jwt.mock.token', '2026-11-12', ['b_1', 'b_2'], (err, items) => resolve({ err, items }));
  });
  assert.equal(res.err, null);
  assert.ok(Array.isArray(res.items));
});
