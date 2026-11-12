# KDE Plasma 6 "FATTO" Desktop Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native KDE Plasma 6 Plasmoid that connects directly to FATTO via native REST endpoints, displaying today's scheduled tasks, providing a prominent single-click timer, dual personal time tracking (today vs total on task), and concurrent timer notifications.

**Architecture:** Pure QML/JavaScript native KDE Plasma 6 package using standard `XMLHttpRequest` to call FATTO's REST endpoints (`/api/user/login`, `/api/kanban/schedule/list`, `/api/kanban/timer/*`). The widget features an adaptive presentation (compact chip in panel, full dashboard on desktop/popup), reactive personal-focused session calculation, and smooth 1-second client-side clock ticking without polling overhead.

**Tech Stack:** KDE Plasma 6, QtQuick 2, Kirigami, PlasmaComponents 3, QML, JavaScript, KConfigXT, Node.js (for offline unit test suite).

## Global Constraints

- Platform: KDE Plasma 6 (`X-Plasma-API-Minimum-Version: 6.0`)
- Frameworks: QtQuick, QtQuick.Layouts, org.kde.plasma.plasmoid, org.kde.kirigami, org.kde.plasma.components
- API Communication: Pure REST over HTTPS (standard `GET` and `POST` calls with JSON)
- Authentication: Session JWT obtained via `POST /api/user/login` using username and password
- Timer UX: Personal-focused metrics (User today seconds, User total on card, secondary global card total), independent timers with "Other Running Timers" banner and quick-pause controls

---

### Task 1: Package Scaffolding & Configuration Schema

**Files:**
- Create: `metadata.json`
- Create: `contents/config/main.xml`
- Create: `contents/config/config.qml`
- Test: `tests/package-metadata.test.js`

**Interfaces:**
- Produces: Plasma 6 package metadata (`org.kde.fatto`) and KConfigXT keys (`serverUrl`, `username`, `password`, `pollInterval`).

- [ ] **Step 1: Write the failing package validation test**

Create `tests/package-metadata.test.js`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('metadata.json exists and is valid Plasma 6 metadata', () => {
  assert.ok(fs.existsSync('metadata.json'), 'metadata.json must exist');
  const metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));

  assert.equal(metadata.KPackageStructure, 'Plasma/Applet');
  assert.equal(metadata['X-Plasma-API-Minimum-Version'], '6.0');
  assert.equal(metadata.KPlugin.Id, 'org.kde.fatto');
  assert.ok(metadata.KPlugin.Name, 'Plugin must have a Name');
  assert.ok(metadata.KPlugin.Icon, 'Plugin must have an Icon');
});

test('contents/config/main.xml defines required KConfigXT entries', () => {
  assert.ok(fs.existsSync('contents/config/main.xml'), 'main.xml must exist');
  const xml = fs.readFileSync('contents/config/main.xml', 'utf8');

  assert.match(xml, /entry name="serverUrl"/);
  assert.match(xml, /entry name="username"/);
  assert.match(xml, /entry name="password"/);
  assert.match(xml, /entry name="pollInterval"/);
});

test('contents/config/config.qml registers General config category', () => {
  assert.ok(fs.existsSync('contents/config/config.qml'), 'config.qml must exist');
  const qml = fs.readFileSync('contents/config/config.qml', 'utf8');

  assert.match(qml, /ConfigModel/);
  assert.match(qml, /ConfigCategory/);
  assert.match(qml, /ConfigGeneral\.qml/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/package-metadata.test.js`
Expected: FAIL (files missing).

- [ ] **Step 3: Implement `metadata.json`, `main.xml`, and `config.qml`**

Create `metadata.json`:
```json
{
  "KPackageStructure": "Plasma/Applet",
  "KPlugin": {
    "Authors": [
      {
        "Name": "FATTO Team"
      }
    ],
    "Category": "Utilities",
    "Description": "Daily scheduled tasks and time tracking widget for FATTO",
    "Icon": "chronometer",
    "Id": "org.kde.fatto",
    "Name": "FATTO Tasks & Timer",
    "Version": "1.0.0",
    "Website": "https://fatto.os3.services"
  },
  "X-Plasma-API-Minimum-Version": "6.0"
}
```

Create `contents/config/main.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<kcfg xmlns="http://www.kde.org/standards/kcfg/1.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.kde.org/standards/kcfg/1.0
      http://www.kde.org/standards/kcfg/1.0/kcfg.xsd">
  <kcfgfile name=""/>
  <group name="General">
    <entry name="serverUrl" type="String">
      <default>https://fatto.os3.services</default>
    </entry>
    <entry name="username" type="String">
      <default></default>
    </entry>
    <entry name="password" type="String">
      <default></default>
    </entry>
    <entry name="pollInterval" type="Int">
      <default>60</default>
    </entry>
  </group>
</kcfg>
```

Create `contents/config/config.qml`:
```qml
import QtQuick
import org.kde.plasma.configuration

ConfigModel {
    ConfigCategory {
        name: i18n("General")
        icon: "configure"
        source: "ConfigGeneral.qml"
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/package-metadata.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add metadata.json contents/config/main.xml contents/config/config.qml tests/package-metadata.test.js
git commit -m "feat: scaffold plasma 6 metadata and config schema"
```

---

### Task 2: Date and Time Utilities (`TimeUtils.js`)

**Files:**
- Create: `contents/ui/js/TimeUtils.js`
- Test: `tests/time-utils.test.js`

**Interfaces:**
- Produces:
  - `formatSeconds(seconds: number): string` -> `"HH:MM:SS"`
  - `formatDateIso(date: Date): string` -> `"YYYY-MM-DD"`
  - `formatHeaderDate(date: Date): string` -> `"Thursday, 12 Nov"`
  - `isSameDay(date1: Date|string|number, date2: Date|string|number): boolean`
  - `calculateSessionSeconds(started: number, ended?: number|null, now?: number): number`

- [ ] **Step 1: Write the failing tests for `TimeUtils.js`**

Create `tests/time-utils.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/time-utils.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `contents/ui/js/TimeUtils.js`**

Create `contents/ui/js/TimeUtils.js`:
```javascript
// TimeUtils.js - Pure helper functions for formatting and date calculations

/**
 * Formats seconds into HH:MM:SS string
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatSeconds(totalSeconds) {
    var secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var hours = Math.floor(secs / 3600);
    var minutes = Math.floor((secs % 3600) / 60);
    var seconds = secs % 60;

    var pad = function(num) {
        return num < 10 ? "0" + num : "" + num;
    };

    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
}

/**
 * Formats a Date object into YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDateIso(date) {
    if (!date) date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    var pad = function(num) {
        return num < 10 ? "0" + num : "" + num;
    };

    return year + "-" + pad(month) + "-" + pad(day);
}

/**
 * Formats a Date object into a readable header, e.g. "Thursday, 12 Nov"
 * @param {Date} date
 * @returns {string}
 */
export function formatHeaderDate(date) {
    if (!date) date = new Date();
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()];
}

/**
 * Checks if two timestamps/dates represent the same calendar day
 * @param {Date|number|string} d1
 * @param {Date|number|string} d2
 * @returns {boolean}
 */
export function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    var a = d1 instanceof Date ? d1 : new Date(d1);
    var b = d2 instanceof Date ? d2 : new Date(d2);

    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

/**
 * Calculates duration of a session in seconds
 * @param {number} started Epoch ms
 * @param {number|null} ended Epoch ms
 * @param {number} [now] Epoch ms
 * @returns {number}
 */
export function calculateSessionSeconds(started, ended, now) {
    var startNum = Number(started);
    var endNum = (ended !== null && ended !== undefined) ? Number(ended) : (Number(now) || Date.now());
    return Math.max(0, Math.floor((endNum - startNum) / 1000));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/time-utils.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/js/TimeUtils.js tests/time-utils.test.js
git commit -m "feat: add date and time utility functions"
```

---

### Task 3: FATTO REST Client (`FattoRestClient.js`)

**Files:**
- Create: `contents/ui/js/FattoRestClient.js`
- Test: `tests/fatto-rest-client.test.js`

**Interfaces:**
- Produces:
  - `login(baseUrl, username, password, callback)`
  - `getSchedule(baseUrl, token, dateStr, callback)`
  - `getMyTimers(baseUrl, token, callback)`
  - `getCardSessions(baseUrl, token, cardId, callback)`
  - `startTimer(baseUrl, token, cardId, callback)`
  - `pauseTimer(baseUrl, token, cardId, callback)`

- [ ] **Step 1: Write mock server test for `FattoRestClient.js`**

Create `tests/fatto-rest-client.test.js`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as Client from '../contents/ui/js/FattoRestClient.js';

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

      if (req.url.startsWith('/api/kanban/schedule/list') && req.method === 'GET') {
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

      if (req.url.startsWith('/api/kanban/timer/sessions') && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify({
          ok: true,
          data: [{ id: 'sess_1', id_card: 'c_1', id_user: 'usr_123', started: Date.now() - 50000, seconds: 50 }]
        }));
      }

      if (req.url === '/api/kanban/timer/start' && req.method === 'POST') {
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { timer: { state: 'running' } } }));
      }

      if (req.url === '/api/kanban/timer/pause' && req.method === 'POST') {
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { timer: { state: 'paused' } } }));
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

test('login succeeds with correct credentials and fails on invalid', async () => {
  const success = await new Promise(resolve => {
    Client.login(baseUrl, 'testuser', 'secret', (err, data) => {
      resolve({ err, data });
    });
  });
  assert.equal(success.err, null);
  assert.equal(success.data.token, 'jwt.mock.token');
  assert.equal(success.data.user.id, 'usr_123');

  const failure = await new Promise(resolve => {
    Client.login(baseUrl, 'testuser', 'wrong', (err, data) => {
      resolve({ err, data });
    });
  });
  assert.ok(failure.err !== null);
});

test('getSchedule fetches scheduled items', async () => {
  const res = await new Promise(resolve => {
    Client.getSchedule(baseUrl, 'jwt.mock.token', '2026-11-12', (err, items) => {
      resolve({ err, items });
    });
  });
  assert.equal(res.err, null);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].card_code, 'FATTO-10');
});

test('startTimer and pauseTimer call endpoints successfully', async () => {
  const start = await new Promise(resolve => {
    Client.startTimer(baseUrl, 'jwt.mock.token', 'c_1', (err, data) => resolve({ err, data }));
  });
  assert.equal(start.err, null);
  assert.equal(start.data.timer.state, 'running');

  const pause = await new Promise(resolve => {
    Client.pauseTimer(baseUrl, 'jwt.mock.token', 'c_1', (err, data) => resolve({ err, data }));
  });
  assert.equal(pause.err, null);
  assert.equal(pause.data.timer.state, 'paused');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/fatto-rest-client.test.js`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `contents/ui/js/FattoRestClient.js`**

Create `contents/ui/js/FattoRestClient.js` using QML / Browser / Node compatible `XMLHttpRequest` or standard fetch:
```javascript
// FattoRestClient.js - REST client for FATTO web application

function getCleanBaseUrl(url) {
    if (!url) return "";
    var trimmed = url.trim();
    if (trimmed.endsWith("/")) {
        return trimmed.slice(0, -1);
    }
    return trimmed;
}

function createXHR() {
    if (typeof XMLHttpRequest !== "undefined") {
        return new XMLHttpRequest();
    }
    // Node.js test environment compatibility
    try {
        var xhrMod = globalThis.XMLHttpRequest;
        if (xhrMod) return new xhrMod();
    } catch (e) {}
    return null;
}

function request(method, url, headers, body, callback) {
    var xhr = createXHR();
    if (xhr) {
        xhr.open(method, url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json");
        if (headers) {
            for (var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            }
        }
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var responseJson = null;
                try {
                    responseJson = JSON.parse(xhr.responseText || "{}");
                } catch (e) {
                    return callback(new Error("Invalid JSON response: " + xhr.responseText), null, xhr.status);
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    callback(null, responseJson.data !== undefined ? responseJson.data : responseJson, xhr.status);
                } else {
                    var errorMsg = (responseJson && responseJson.error) ?
                        (responseJson.error.message || responseJson.error) :
                        ("HTTP " + xhr.status + ": " + xhr.statusText);
                    callback(new Error(errorMsg), null, xhr.status);
                }
            }
        };
        xhr.onerror = function() {
            callback(new Error("Network connection error"), null, 0);
        };
        xhr.send(body ? JSON.stringify(body) : null);
    } else if (typeof fetch !== "undefined") {
        // Fallback for environments with global fetch
        var options = {
            method: method,
            headers: Object.assign({
                "Content-Type": "application/json",
                "Accept": "application/json"
            }, headers || {})
        };
        if (body) options.body = JSON.stringify(body);

        fetch(url, options)
            .then(function(res) {
                return res.json().then(function(json) {
                    if (res.ok) {
                        callback(null, json.data !== undefined ? json.data : json, res.status);
                    } else {
                        var msg = (json && json.error) ? (json.error.message || json.error) : ("HTTP " + res.status);
                        callback(new Error(msg), null, res.status);
                    }
                });
            })
            .catch(function(err) {
                callback(err, null, 0);
            });
    } else {
        callback(new Error("No HTTP transport available"), null, 0);
    }
}

export function login(baseUrl, username, password, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/user/login";
    request("POST", url, null, { username: username, password: password }, callback);
}

export function refreshToken(baseUrl, token, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/user/token/refresh";
    request("POST", url, { "Authorization": "Bearer " + token }, null, callback);
}

export function getSchedule(baseUrl, token, dateStr, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/schedule/list?from_date=" +
              encodeURIComponent(dateStr) + "&to_date=" + encodeURIComponent(dateStr);
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

export function getMyTimers(baseUrl, token, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/mine";
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

export function getCardTimer(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/get?id_card=" + encodeURIComponent(cardId);
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

export function getCardSessions(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/sessions?id_card=" + encodeURIComponent(cardId);
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

export function startTimer(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/start";
    request("POST", url, { "Authorization": "Bearer " + token }, { id_card: cardId }, callback);
}

export function pauseTimer(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/pause";
    request("POST", url, { "Authorization": "Bearer " + token }, { id_card: cardId }, callback);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/fatto-rest-client.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/js/FattoRestClient.js tests/fatto-rest-client.test.js
git commit -m "feat: implement REST API client for FATTO"
```

---

### Task 4: Configuration Settings UI (`ConfigGeneral.qml`)

**Files:**
- Create: `contents/ui/ConfigGeneral.qml`
- Test: Syntax check and structural verification via `tests/qml-syntax.test.js`

**Interfaces:**
- Consumes: `Plasmoid.configuration.serverUrl`, `username`, `password`, `pollInterval`.
- Produces: Plasma Settings page with FormLayout, TextFields, SpinBox, and test connection button.

- [ ] **Step 1: Write test for configuration UI presence**

Create `tests/qml-syntax.test.js`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('ConfigGeneral.qml exists and contains form fields for settings', () => {
  assert.ok(fs.existsSync('contents/ui/ConfigGeneral.qml'), 'ConfigGeneral.qml must exist');
  const content = fs.readFileSync('contents/ui/ConfigGeneral.qml', 'utf8');

  assert.match(content, /cfg_serverUrl/);
  assert.match(content, /cfg_username/);
  assert.match(content, /cfg_password/);
  assert.match(content, /cfg_pollInterval/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL (file missing).

- [ ] **Step 3: Implement `contents/ui/ConfigGeneral.qml`**

Create `contents/ui/ConfigGeneral.qml`:
```qml
import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM
import "js/FattoRestClient.js" as FattoClient

KCM.SimpleKCM {
    id: configPage

    property alias cfg_serverUrl: serverUrlField.text
    property alias cfg_username: usernameField.text
    property alias cfg_password: passwordField.text
    property alias cfg_pollInterval: pollIntervalSpin.value

    Kirigami.FormLayout {
        id: formLayout

        QQC2.TextField {
            id: serverUrlField
            Kirigami.FormData.label: i18n("FATTO Server URL:")
            placeholderText: "https://fatto.os3.services"
            Layout.fillWidth: true
        }

        QQC2.TextField {
            id: usernameField
            Kirigami.FormData.label: i18n("Username:")
            placeholderText: i18n("Username or email")
            Layout.fillWidth: true
        }

        QQC2.TextField {
            id: passwordField
            Kirigami.FormData.label: i18n("Password:")
            echoMode: TextInput.Password
            placeholderText: i18n("Your password")
            Layout.fillWidth: true
        }

        QQC2.SpinBox {
            id: pollIntervalSpin
            Kirigami.FormData.label: i18n("Poll Interval (seconds):")
            from: 10
            to: 600
            stepSize: 10
        }

        Item {
            Kirigami.FormData.isSection: true
        }

        RowLayout {
            Kirigami.FormData.label: i18n("Connection Test:")

            QQC2.Button {
                text: i18n("Test Credentials")
                icon.name: "network-connect"
                onClicked: {
                    statusLabel.text = i18n("Testing connection...");
                    statusLabel.color = Kirigami.Theme.textColor;
                    FattoClient.login(serverUrlField.text, usernameField.text, passwordField.text, function(err, data) {
                        if (err) {
                            statusLabel.text = i18n("Error: %1", err.message);
                            statusLabel.color = Kirigami.Theme.negativeTextColor;
                        } else {
                            statusLabel.text = i18n("Success! Connected as %1", data.user.username || data.user.id);
                            statusLabel.color = Kirigami.Theme.positiveTextColor;
                        }
                    });
                }
            }

            QQC2.Label {
                id: statusLabel
                text: ""
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/ConfigGeneral.qml tests/qml-syntax.test.js
git commit -m "feat: implement plasma settings configuration UI"
```

---

### Task 5: Scheduled Card List Item (`CardListItem.qml`)

**Files:**
- Create: `contents/ui/CardListItem.qml`
- Test: Update `tests/qml-syntax.test.js`

**Interfaces:**
- Consumes: Card model object (`id_card`, `card_code`, `card_title`, `board_name`, `column_name`, `is_done`).
- Produces: Clickable row with status badges and selection highlight.

- [ ] **Step 1: Write test for CardListItem**

Add to `tests/qml-syntax.test.js`:
```javascript
test('CardListItem.qml exists and handles card properties', () => {
  assert.ok(fs.existsSync('contents/ui/CardListItem.qml'), 'CardListItem.qml must exist');
  const content = fs.readFileSync('contents/ui/CardListItem.qml', 'utf8');

  assert.match(content, /cardData/);
  assert.match(content, /isSelected/);
  assert.match(content, /cardClicked/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `contents/ui/CardListItem.qml`**

Create `contents/ui/CardListItem.qml`:
```qml
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami

Rectangle {
    id: root

    property var cardData: null
    property bool isSelected: false
    property bool isRunning: false

    signal cardClicked()

    height: 52
    radius: Kirigami.Units.smallSpacing
    color: isSelected ?
           Kirigami.Theme.highlightColor :
           (mouseArea.containsMouse ? Kirigami.Theme.hoverColor : "transparent")

    border.color: isSelected ?
                  Kirigami.Theme.highlightColor :
                  Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.15)
    border.width: isSelected ? 2 : 1

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: root.cardClicked()
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing * 2
        spacing: Kirigami.Units.smallSpacing * 2

        // Running indicator dot
        Rectangle {
            width: 10
            height: 10
            radius: 5
            visible: root.isRunning
            color: Kirigami.Theme.positiveTextColor

            SequentialAnimation on opacity {
                running: root.isRunning
                loops: Animation.Infinite
                NumberAnimation { from: 1.0; to: 0.3; duration: 800 }
                NumberAnimation { from: 0.3; to: 1.0; duration: 800 }
            }
        }

        // Card Code Pill
        Rectangle {
            height: 22
            width: codeLabel.implicitWidth + 12
            radius: 4
            color: root.isSelected ?
                   Qt.rgba(255, 255, 255, 0.25) :
                   Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.1)

            QQC2.Label {
                id: codeLabel
                anchors.centerIn: parent
                text: root.cardData ? (root.cardData.card_code || "") : ""
                font.bold: true
                font.family: "Monospace"
                font.pixelSize: Kirigami.Units.gridUnit * 0.7
                color: root.isSelected ? Kirigami.Theme.highlightedTextColor : Kirigami.Theme.textColor
            }
        }

        // Card Title
        QQC2.Label {
            Layout.fillWidth: true
            text: root.cardData ? (root.cardData.card_title || "") : ""
            elide: Text.ElideRight
            font.weight: root.isSelected ? Font.Bold : Font.Normal
            color: root.isSelected ? Kirigami.Theme.highlightedTextColor : Kirigami.Theme.textColor
        }

        // Column / Board Badge
        QQC2.Label {
            text: root.cardData ? (root.cardData.column_name || "") : ""
            font.pixelSize: Kirigami.Units.gridUnit * 0.65
            opacity: 0.8
            color: root.isSelected ? Kirigami.Theme.highlightedTextColor : Kirigami.Theme.textColor
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/CardListItem.qml tests/qml-syntax.test.js
git commit -m "feat: implement scheduled card list item component"
```

---

### Task 6: Active Card Hero & Multi-Timer Banner

**Files:**
- Create: `contents/ui/ActiveCardHero.qml`
- Create: `contents/ui/RunningTimersBanner.qml`
- Test: Update `tests/qml-syntax.test.js`

**Interfaces:**
- Produces:
  - `ActiveCardHero`: Large start/pause button, today time, user total time, global total time.
  - `RunningTimersBanner`: Displays list of other running cards with live ticking and quick pause action.

- [ ] **Step 1: Write test for ActiveCardHero and RunningTimersBanner**

Add to `tests/qml-syntax.test.js`:
```javascript
test('ActiveCardHero.qml and RunningTimersBanner.qml exist', () => {
  assert.ok(fs.existsSync('contents/ui/ActiveCardHero.qml'), 'ActiveCardHero.qml must exist');
  assert.ok(fs.existsSync('contents/ui/RunningTimersBanner.qml'), 'RunningTimersBanner.qml must exist');

  const hero = fs.readFileSync('contents/ui/ActiveCardHero.qml', 'utf8');
  assert.match(hero, /todaySeconds/);
  assert.match(hero, /userTotalSeconds/);
  assert.match(hero, /toggleTimer/);

  const banner = fs.readFileSync('contents/ui/RunningTimersBanner.qml', 'utf8');
  assert.match(banner, /runningTimers/);
  assert.match(banner, /pauseRequested/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `ActiveCardHero.qml` and `RunningTimersBanner.qml`**

Create `contents/ui/ActiveCardHero.qml`:
```qml
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import "js/TimeUtils.js" as TimeUtils

Rectangle {
    id: root

    property var activeCard: null
    property bool isRunning: false
    property int todaySeconds: 0
    property int userTotalSeconds: 0
    property int globalTotalSeconds: 0

    signal toggleTimer()

    radius: Kirigami.Units.smallSpacing * 2
    color: Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.05)
    border.color: isRunning ?
                  Kirigami.Theme.positiveTextColor :
                  Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.15)
    border.width: isRunning ? 2 : 1

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.gridUnit
        spacing: Kirigami.Units.smallSpacing

        // Top info row
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            Rectangle {
                height: 24
                width: heroCode.implicitWidth + 14
                radius: 4
                color: Kirigami.Theme.highlightColor

                QQC2.Label {
                    id: heroCode
                    anchors.centerIn: parent
                    text: root.activeCard ? (root.activeCard.card_code || "") : "—"
                    font.bold: true
                    font.family: "Monospace"
                    color: Kirigami.Theme.highlightedTextColor
                }
            }

            QQC2.Label {
                Layout.fillWidth: true
                text: root.activeCard ? (root.activeCard.card_title || "") : i18n("No card selected")
                font.bold: true
                font.pixelSize: Kirigami.Units.gridUnit * 1.05
                elide: Text.ElideRight
            }

            QQC2.Label {
                text: root.activeCard ? (root.activeCard.column_name || "") : ""
                font.pixelSize: Kirigami.Units.gridUnit * 0.75
                opacity: 0.7
            }
        }

        Item { height: Kirigami.Units.smallSpacing }

        // Central timer and main action button
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.gridUnit

            // Dual time counters
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                RowLayout {
                    spacing: Kirigami.Units.smallSpacing
                    QQC2.Label {
                        text: i18n("Today (Yours):")
                        font.pixelSize: Kirigami.Units.gridUnit * 0.8
                        opacity: 0.75
                    }
                    QQC2.Label {
                        text: TimeUtils.formatSeconds(root.todaySeconds)
                        font.pixelSize: Kirigami.Units.gridUnit * 1.5
                        font.bold: true
                        font.family: "Monospace"
                        color: root.isRunning ? Kirigami.Theme.positiveTextColor : Kirigami.Theme.textColor
                    }
                }

                RowLayout {
                    spacing: Kirigami.Units.smallSpacing
                    QQC2.Label {
                        text: i18n("Total (Yours): %1", TimeUtils.formatSeconds(root.userTotalSeconds))
                        font.pixelSize: Kirigami.Units.gridUnit * 0.75
                        font.family: "Monospace"
                        opacity: 0.85
                    }
                    QQC2.Label {
                        text: i18n("• All: %1", TimeUtils.formatSeconds(root.globalTotalSeconds))
                        font.pixelSize: Kirigami.Units.gridUnit * 0.75
                        font.family: "Monospace"
                        opacity: 0.6
                    }
                }
            }

            // Big Start/Pause Button
            QQC2.Button {
                id: actionButton
                enabled: root.activeCard !== null
                Layout.preferredHeight: Kirigami.Units.gridUnit * 2.6
                Layout.preferredWidth: Kirigami.Units.gridUnit * 5.5
                text: root.isRunning ? i18n("Pause") : i18n("Start")
                icon.name: root.isRunning ? "media-playback-pause" : "media-playback-start"

                onClicked: root.toggleTimer()
            }
        }
    }
}
```

Create `contents/ui/RunningTimersBanner.qml`:
```qml
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import "js/TimeUtils.js" as TimeUtils

Rectangle {
    id: root

    property var runningTimers: []
    signal pauseRequested(string cardId)

    visible: runningTimers && runningTimers.length > 0
    height: visible ? columnLayout.implicitHeight + (Kirigami.Units.smallSpacing * 2) : 0
    radius: Kirigami.Units.smallSpacing
    color: Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.neutralTextColor, 0.15)
    border.color: Kirigami.Theme.neutralTextColor
    border.width: 1

    ColumnLayout {
        id: columnLayout
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing
        spacing: Kirigami.Units.smallSpacing

        RowLayout {
            Layout.fillWidth: true
            Kirigami.Icon {
                source: "dialog-warning"
                implicitWidth: 16
                implicitHeight: 16
                color: Kirigami.Theme.neutralTextColor
            }
            QQC2.Label {
                Layout.fillWidth: true
                text: i18n("%1 other task(s) currently running", root.runningTimers.length)
                font.bold: true
                font.pixelSize: Kirigami.Units.gridUnit * 0.75
                color: Kirigami.Theme.neutralTextColor
            }
        }

        Repeater {
            model: root.runningTimers

            delegate: RowLayout {
                Layout.fillWidth: true
                spacing: Kirigami.Units.smallSpacing

                QQC2.Label {
                    text: modelData.code || ""
                    font.family: "Monospace"
                    font.bold: true
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                }

                QQC2.Label {
                    Layout.fillWidth: true
                    text: modelData.title || ""
                    elide: Text.ElideRight
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                }

                QQC2.Label {
                    text: TimeUtils.formatSeconds(modelData.elapsedSeconds || 0)
                    font.family: "Monospace"
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                }

                QQC2.ToolButton {
                    icon.name: "media-playback-pause"
                    implicitWidth: 24
                    implicitHeight: 24
                    onClicked: root.pauseRequested(modelData.id_card)
                }
            }
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/ActiveCardHero.qml contents/ui/RunningTimersBanner.qml tests/qml-syntax.test.js
git commit -m "feat: implement active card hero and running timers banner"
```

---

### Task 7: Compact & Full Plasma Representations

**Files:**
- Create: `contents/ui/CompactRepresentation.qml`
- Create: `contents/ui/FullRepresentation.qml`
- Test: Update `tests/qml-syntax.test.js`

**Interfaces:**
- Consumes: Properties from `root` in `main.qml`: `activeCard`, `isActiveCardRunning`, `activeCardTodaySeconds`, `scheduleList`, `otherRunningTimers`, `refreshData()`, `toggleActiveCardTimer()`.

- [ ] **Step 1: Write test for CompactRepresentation and FullRepresentation**

Add to `tests/qml-syntax.test.js`:
```javascript
test('CompactRepresentation.qml and FullRepresentation.qml exist', () => {
  assert.ok(fs.existsSync('contents/ui/CompactRepresentation.qml'), 'CompactRepresentation.qml must exist');
  assert.ok(fs.existsSync('contents/ui/FullRepresentation.qml'), 'FullRepresentation.qml must exist');

  const compact = fs.readFileSync('contents/ui/CompactRepresentation.qml', 'utf8');
  assert.match(compact, /MouseArea/);

  const full = fs.readFileSync('contents/ui/FullRepresentation.qml', 'utf8');
  assert.match(full, /ActiveCardHero/);
  assert.match(full, /RunningTimersBanner/);
  assert.match(full, /ListView/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `CompactRepresentation.qml` and `FullRepresentation.qml`**

Create `contents/ui/CompactRepresentation.qml`:
```qml
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid
import "js/TimeUtils.js" as TimeUtils

Item {
    id: root

    Layout.minimumWidth: contentRow.implicitWidth + (Kirigami.Units.smallSpacing * 2)
    Layout.preferredWidth: contentRow.implicitWidth + (Kirigami.Units.smallSpacing * 2)

    MouseArea {
        anchors.fill: parent
        onClicked: Plasmoid.expanded = !Plasmoid.expanded
    }

    RowLayout {
        id: contentRow
        anchors.centerIn: parent
        spacing: Kirigami.Units.smallSpacing

        // Pulsing running dot
        Rectangle {
            width: 8
            height: 8
            radius: 4
            color: Kirigami.Theme.positiveTextColor
            visible: plasmoidRoot.isActiveCardRunning

            SequentialAnimation on opacity {
                running: plasmoidRoot.isActiveCardRunning
                loops: Animation.Infinite
                NumberAnimation { from: 1.0; to: 0.2; duration: 800 }
                NumberAnimation { from: 0.2; to: 1.0; duration: 800 }
            }
        }

        Kirigami.Icon {
            source: "chronometer"
            implicitWidth: 16
            implicitHeight: 16
            visible: !plasmoidRoot.isActiveCardRunning
        }

        // Active Card Code
        QQC2.Label {
            text: plasmoidRoot.activeCard ? plasmoidRoot.activeCard.card_code : "FATTO"
            font.bold: true
            font.family: "Monospace"
        }

        // Timer counter
        QQC2.Label {
            text: TimeUtils.formatSeconds(plasmoidRoot.activeCardTodaySeconds)
            font.family: "Monospace"
            font.bold: plasmoidRoot.isActiveCardRunning
            color: plasmoidRoot.isActiveCardRunning ? Kirigami.Theme.positiveTextColor : Kirigami.Theme.textColor
        }

        // Quick toggle
        QQC2.ToolButton {
            icon.name: plasmoidRoot.isActiveCardRunning ? "media-playback-pause" : "media-playback-start"
            enabled: plasmoidRoot.activeCard !== null
            implicitWidth: 24
            implicitHeight: 24
            onClicked: plasmoidRoot.toggleActiveCardTimer()
        }
    }
}
```

Create `contents/ui/FullRepresentation.qml`:
```qml
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid
import "js/TimeUtils.js" as TimeUtils

Item {
    id: root

    Layout.minimumWidth: Kirigami.Units.gridUnit * 22
    Layout.minimumHeight: Kirigami.Units.gridUnit * 26
    Layout.preferredWidth: Kirigami.Units.gridUnit * 24
    Layout.preferredHeight: Kirigami.Units.gridUnit * 28

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.gridUnit
        spacing: Kirigami.Units.smallSpacing * 2

        // Header bar
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            Kirigami.Icon {
                source: "chronometer"
                implicitWidth: 22
                implicitHeight: 22
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 0

                QQC2.Label {
                    text: i18n("FATTO Tasks")
                    font.bold: true
                    font.pixelSize: Kirigami.Units.gridUnit * 0.95
                }
                QQC2.Label {
                    text: TimeUtils.formatHeaderDate(new Date())
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                    opacity: 0.7
                }
            }

            QQC2.ToolButton {
                icon.name: "view-refresh"
                ToolTip.text: i18n("Refresh data")
                ToolTip.visible: hovered
                onClicked: plasmoidRoot.refreshData()
            }

            QQC2.ToolButton {
                icon.name: "configure"
                ToolTip.text: i18n("Configure FATTO widget")
                ToolTip.visible: hovered
                onClicked: Plasmoid.action("configure").trigger()
            }
        }

        // Active Card Hero
        ActiveCardHero {
            Layout.fillWidth: true
            Layout.preferredHeight: Kirigami.Units.gridUnit * 7
            activeCard: plasmoidRoot.activeCard
            isRunning: plasmoidRoot.isActiveCardRunning
            todaySeconds: plasmoidRoot.activeCardTodaySeconds
            userTotalSeconds: plasmoidRoot.activeCardUserTotalSeconds
            globalTotalSeconds: plasmoidRoot.activeCardGlobalTotalSeconds
            onToggleTimer: plasmoidRoot.toggleActiveCardTimer()
        }

        // Other running timers notification banner
        RunningTimersBanner {
            Layout.fillWidth: true
            runningTimers: plasmoidRoot.otherRunningTimers
            onPauseRequested: function(cardId) {
                plasmoidRoot.pauseOtherCard(cardId);
            }
        }

        // Scheduled task section header
        RowLayout {
            Layout.fillWidth: true
            QQC2.Label {
                text: i18n("Scheduled for Today")
                font.bold: true
                font.pixelSize: Kirigami.Units.gridUnit * 0.85
            }
            Item { Layout.fillWidth: true }
            QQC2.Label {
                text: i18n("%1 task(s)", plasmoidRoot.scheduleList.length)
                font.pixelSize: Kirigami.Units.gridUnit * 0.75
                opacity: 0.7
            }
        }

        // Cards list view
        QQC2.ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true

            ListView {
                id: listView
                model: plasmoidRoot.scheduleList
                spacing: Kirigami.Units.smallSpacing
                clip: true

                delegate: CardListItem {
                    width: listView.width
                    cardData: modelData
                    isSelected: plasmoidRoot.activeCard && (plasmoidRoot.activeCard.id_card === modelData.id_card)
                    isRunning: plasmoidRoot.isCardIdRunning(modelData.id_card)
                    onCardClicked: {
                        plasmoidRoot.selectCard(modelData);
                    }
                }
            }
        }

        // Empty state
        QQC2.Label {
            visible: plasmoidRoot.scheduleList.length === 0 && !plasmoidRoot.isSyncing
            Layout.alignment: Qt.AlignCenter
            text: plasmoidRoot.statusMessage || i18n("No tasks scheduled for today.")
            opacity: 0.6
            wrapMode: Text.WordWrap
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/CompactRepresentation.qml contents/ui/FullRepresentation.qml tests/qml-syntax.test.js
git commit -m "feat: implement compact and full plasma representations"
```

---

### Task 8: Applet Coordinator & Integration (`main.qml`)

**Files:**
- Create: `contents/ui/main.qml`
- Test: Update `tests/qml-syntax.test.js` and verify with `plasmawindowed`

**Interfaces:**
- Root entry point of Plasmoid. Connects state, polling loop, local 1-second ticking timer, representation selection, and REST client.

- [ ] **Step 1: Write integration test for main.qml structure**

Add to `tests/qml-syntax.test.js`:
```javascript
test('main.qml exists and defines required root properties and timers', () => {
  assert.ok(fs.existsSync('contents/ui/main.qml'), 'main.qml must exist');
  const main = fs.readFileSync('contents/ui/main.qml', 'utf8');

  assert.match(main, /PlasmoidItem/);
  assert.match(main, /compactRepresentation/);
  assert.match(main, /fullRepresentation/);
  assert.match(main, /pollTimer/);
  assert.match(main, /clockTickTimer/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `contents/ui/main.qml`**

Create `contents/ui/main.qml`:
```qml
import QtQuick
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import "js/FattoRestClient.js" as FattoClient
import "js/TimeUtils.js" as TimeUtils

PlasmoidItem {
    id: plasmoidRoot

    // Applet metadata and configuration
    preferredRepresentation: Plasmoid.formFactor === PlasmaCore.Types.Horizontal ||
                             Plasmoid.formFactor === PlasmaCore.Types.Vertical ?
                             compactRepresentation : fullRepresentation

    compactRepresentation: CompactRepresentation {}
    fullRepresentation: FullRepresentation {}

    // Authentication and user state
    property string authToken: ""
    property var currentUser: null
    property string statusMessage: ""
    property bool isSyncing: false

    // Card and timer state
    property var activeCard: null
    property bool isActiveCardRunning: false
    property int activeCardTodaySeconds: 0
    property int activeCardUserTotalSeconds: 0
    property int activeCardGlobalTotalSeconds: 0

    // Schedule and other running timers
    property var scheduleList: []
    property var otherRunningTimers: []

    // Helper functions
    function isCardIdRunning(cardId) {
        if (!cardId) return false;
        if (activeCard && activeCard.id_card === cardId && isActiveCardRunning) return true;
        for (var i = 0; i < otherRunningTimers.length; i++) {
            if (otherRunningTimers[i].id_card === cardId) return true;
        }
        return false;
    }

    function ensureAuthenticated(callback) {
        if (authToken && currentUser) {
            return callback(null, authToken);
        }

        var sUrl = Plasmoid.configuration.serverUrl;
        var uName = Plasmoid.configuration.username;
        var pWord = Plasmoid.configuration.password;

        if (!uName || !pWord) {
            statusMessage = i18n("Please configure username and password in settings.");
            return callback(new Error("Missing credentials"));
        }

        statusMessage = i18n("Authenticating...");
        FattoClient.login(sUrl, uName, pWord, function(err, data) {
            if (err) {
                statusMessage = i18n("Login failed: %1", err.message);
                return callback(err);
            }
            authToken = data.token;
            currentUser = data.user;
            statusMessage = "";
            callback(null, authToken);
        });
    }

    function refreshData() {
        if (isSyncing) return;
        isSyncing = true;

        ensureAuthenticated(function(err, token) {
            if (err) {
                isSyncing = false;
                return;
            }

            var sUrl = Plasmoid.configuration.serverUrl;
            var todayStr = TimeUtils.formatDateIso(new Date());

            // 1. Fetch today's schedule
            FattoClient.getSchedule(sUrl, token, todayStr, function(sErr, items) {
                if (!sErr && items) {
                    scheduleList = items;
                    // Auto-select first card if none active
                    if (!activeCard && items.length > 0) {
                        selectCard(items[0]);
                    }
                }

                // 2. Fetch my active timers
                FattoClient.getMyTimers(sUrl, token, function(tErr, myTimers) {
                    if (!tErr && myTimers) {
                        updateRunningTimers(myTimers);
                    }

                    // 3. Refresh sessions for active card if selected
                    if (activeCard) {
                        loadActiveCardSessions();
                    }

                    isSyncing = false;
                });
            });
        });
    }

    function selectCard(card) {
        activeCard = card;
        loadActiveCardSessions();
    }

    function updateRunningTimers(myTimers) {
        var activeId = activeCard ? activeCard.id_card : "";
        var others = [];
        var activeRunning = false;

        var now = Date.now();
        for (var i = 0; i < myTimers.length; i++) {
            var item = myTimers[i];
            item.elapsedSeconds = TimeUtils.calculateSessionSeconds(item.started, null, now);
            if (item.id_card === activeId) {
                activeRunning = true;
            } else {
                others.push(item);
            }
        }

        isActiveCardRunning = activeRunning;
        otherRunningTimers = others;
    }

    function loadActiveCardSessions() {
        if (!activeCard || !authToken) return;

        var sUrl = Plasmoid.configuration.serverUrl;
        FattoClient.getCardSessions(sUrl, authToken, activeCard.id_card, function(err, sessions) {
            if (err || !sessions) return;

            var today = new Date();
            var myUserId = currentUser ? currentUser.id : "";
            var todaySecs = 0;
            var userTotalSecs = 0;
            var globalTotalSecs = 0;
            var now = Date.now();

            for (var i = 0; i < sessions.length; i++) {
                var s = sessions[i];
                var sSecs = TimeUtils.calculateSessionSeconds(s.started, s.ended, now);
                globalTotalSecs += sSecs;

                if (myUserId && s.id_user === myUserId) {
                    userTotalSecs += sSecs;
                    if (TimeUtils.isSameDay(s.started, today)) {
                        todaySecs += sSecs;
                    }
                }
            }

            activeCardTodaySeconds = todaySecs;
            activeCardUserTotalSeconds = userTotalSecs;
            activeCardGlobalTotalSeconds = globalTotalSecs;
        });
    }

    function toggleActiveCardTimer() {
        if (!activeCard) return;

        ensureAuthenticated(function(err, token) {
            if (err) return;
            var sUrl = Plasmoid.configuration.serverUrl;
            var cardId = activeCard.id_card;

            if (isActiveCardRunning) {
                // Pause
                FattoClient.pauseTimer(sUrl, token, cardId, function(pErr) {
                    if (!pErr) {
                        isActiveCardRunning = false;
                        refreshData();
                    }
                });
            } else {
                // Start
                FattoClient.startTimer(sUrl, token, cardId, function(sErr) {
                    if (!sErr) {
                        isActiveCardRunning = true;
                        refreshData();
                    }
                });
            }
        });
    }

    function pauseOtherCard(cardId) {
        ensureAuthenticated(function(err, token) {
            if (err) return;
            var sUrl = Plasmoid.configuration.serverUrl;
            FattoClient.pauseTimer(sUrl, token, cardId, function(pErr) {
                if (!pErr) {
                    refreshData();
                }
            });
        });
    }

    // Local 1-second clock tick timer
    Timer {
        id: clockTickTimer
        interval: 1000
        repeat: true
        running: plasmoidRoot.isActiveCardRunning || (plasmoidRoot.otherRunningTimers.length > 0)
        onTriggered: {
            if (plasmoidRoot.isActiveCardRunning) {
                plasmoidRoot.activeCardTodaySeconds += 1;
                plasmoidRoot.activeCardUserTotalSeconds += 1;
                plasmoidRoot.activeCardGlobalTotalSeconds += 1;
            }

            // Tick other running timers
            if (plasmoidRoot.otherRunningTimers.length > 0) {
                var updated = [];
                for (var i = 0; i < plasmoidRoot.otherRunningTimers.length; i++) {
                    var item = plasmoidRoot.otherRunningTimers[i];
                    item.elapsedSeconds = (item.elapsedSeconds || 0) + 1;
                    updated.push(item);
                }
                plasmoidRoot.otherRunningTimers = updated;
            }
        }
    }

    // Polling timer
    Timer {
        id: pollTimer
        interval: Math.max(10, Plasmoid.configuration.pollInterval || 60) * 1000
        repeat: true
        running: true
        onTriggered: plasmoidRoot.refreshData()
    }

    Component.onCompleted: {
        refreshData();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Verify Plasmoid execution with plasmawindowed**

Run: `plasmawindowed org.kde.fatto` or test package loading with `kpackagetool6`.
Expected: Window opens showing FATTO Tasks widget representation.

- [ ] **Step 6: Commit**

```bash
git add contents/ui/main.qml tests/qml-syntax.test.js
git commit -m "feat: implement plasma widget root coordinator and integration"
```

---

### Task 9: Installation & Verification Script

**Files:**
- Create: `install.sh`
- Create: `README.md`
- Test: Verification of package install and uninstall workflow

**Interfaces:**
- Produces: Executable `install.sh` that installs or updates the plasmoid for current user (`kpackagetool6 -i .` or `-u .`) and launches `plasmawindowed`.

- [ ] **Step 1: Write `install.sh` and `README.md`**

Create `install.sh`:
```bash
#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=== Testing FATTO Widget Test Suite ==="
node --test tests/*.test.js

echo "=== Installing / Updating Plasma 6 Widget ==="
if kpackagetool6 --type Plasma/Applet --list | grep -q "org.kde.fatto"; then
    echo "Updating existing widget..."
    kpackagetool6 --type Plasma/Applet --upgrade .
else
    echo "Installing new widget..."
    kpackagetool6 --type Plasma/Applet --install .
fi

echo "=== Widget successfully installed! ==="
echo "You can add it to your desktop or panel via 'Add Widgets...', or test it directly with:"
echo "plasmawindowed org.kde.fatto"
```
Make executable: `chmod +x install.sh`

Create `README.md`:
```markdown
# KDE Plasma 6 "FATTO" Desktop Widget

A native KDE Plasma 6 plasmoid for tracking tasks and recording time spent using the FATTO web application.

## Features
- **Today's Schedule**: Displays all cards scheduled for the current date.
- **Prominent Timer**: Single-click Start and Pause.
- **Personal Time Tracking (Option A)**:
  - Today (Yours): Time spent today on this card.
  - Total (Yours): Total time spent by you on this card.
  - All: Total collaborative time spent by everyone on this card.
- **Independent Timers & Notifications**: Live banner showing any other concurrent running tasks with direct pause actions.
- **Adaptive**: Compact indicator for panel; rich dashboard for desktop and popup.

## Installation
```bash
./install.sh
```

## Testing & Preview
```bash
plasmawindowed org.kde.fatto
```
```

- [ ] **Step 2: Run test suite**

Run: `node --test tests/*.test.js`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add install.sh README.md
git commit -m "feat: add installation script and documentation"
```
