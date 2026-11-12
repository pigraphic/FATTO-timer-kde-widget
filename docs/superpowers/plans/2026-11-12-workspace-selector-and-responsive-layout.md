# Workspace Selector & Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a workspace selection dropdown to the FATTO KDE widget allowing users to filter scheduled tasks by workspace (or "All Workspaces"), and fix responsive layout issues so all components (specifically the Start/Pause timer button, card headers, and texts) are strictly contained inside the widget without overflowing at narrow widths. Zero changes to the main FATTO project.

**Architecture:** Pure QML/JavaScript updates inside `fatto-widget`. Add `getWorkspaces`, `getBoards`, and `id_boards` filtering to `FattoRestClient.js`. Add `selectedWorkspace` KConfigXT entry in `main.xml`. Add workspace list state, board resolution, and filter logic in `main.qml`. Update `FullRepresentation.qml` with a responsive header containing a workspace `QQC2.ComboBox`. Update `ActiveCardHero.qml` to dynamically switch between side-by-side and stacked layout when width is narrow so the Start/Pause button never overflows.

**Tech Stack:** KDE Plasma 6, QtQuick, Kirigami, PlasmaComponents 3, QML, JavaScript, KConfigXT, Node.js.

## Global Constraints

- **STRICT PROJECT BOUNDARY**: All changes must be strictly within `/data2/liwe/fatto-widget`. Do NOT edit or modify any file in the main `fatto` project (`/data2/liwe/cf-liwe3/fatto`).
- Platform: KDE Plasma 6 (`X-Plasma-API-Minimum-Version: 6.0`).
- QML JavaScript files must retain `.pragma library` at line 1 and conditional `module.exports` at the bottom for Node.js test suites.
- Layouts must be responsive and contained: no element may overflow horizontally when resizing width down to narrow dimensions.

---

### Task 1: REST Client Workspace & Board Endpoints

**Files:**
- Modify: `contents/ui/js/FattoRestClient.js`
- Test: `tests/fatto-rest-client.test.js`

**Interfaces:**
- Produces:
  - `getWorkspaces(baseUrl, token, callback)` -> `GET /api/kanban/workspace/list`
  - `getBoards(baseUrl, token, workspaceId, callback)` -> `GET /api/kanban/board/list?id_workspace=<id>`
  - `getSchedule(baseUrl, token, dateStr, boardIds, callback)` -> `GET /api/kanban/schedule/list?from_date=...&to_date=...[&id_boards=...]`

- [ ] **Step 1: Write the failing tests in `tests/fatto-rest-client.test.js`**

Add tests to `tests/fatto-rest-client.test.js` verifying `getWorkspaces`, `getBoards`, and `getSchedule` with board filtering:
```javascript
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
```

And in the mock HTTP server setup inside `tests/fatto-rest-client.test.js`, add mock route handlers:
- `/api/kanban/workspace/list`: returns `[{ id: 'ws_1', name: 'Default Workspace' }, { id: 'ws_2', name: 'Projects' }]`
- `/api/kanban/board/list`: checks query parameter `id_workspace` and returns boards.
- `/api/kanban/schedule/list`: checks query parameter `id_boards`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/fatto-rest-client.test.js`
Expected: FAIL (`getWorkspaces` and `getBoards` are not functions).

- [ ] **Step 3: Implement `getWorkspaces`, `getBoards`, and update `getSchedule` in `FattoRestClient.js`**

Update `contents/ui/js/FattoRestClient.js`:
```javascript
function getWorkspaces(baseUrl, token, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/workspace/list";
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

function getBoards(baseUrl, token, workspaceId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/board/list";
    if (workspaceId) {
        url += "?id_workspace=" + encodeURIComponent(workspaceId);
    }
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

function getSchedule(baseUrl, token, dateStr, boardIds, callback) {
    // Support optional boardIds parameter
    var cb = typeof boardIds === "function" ? boardIds : callback;
    var bIds = typeof boardIds === "function" ? null : boardIds;

    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/schedule/list?from_date=" +
              encodeURIComponent(dateStr) + "&to_date=" + encodeURIComponent(dateStr);

    if (bIds) {
        if (Array.isArray(bIds) && bIds.length > 0) {
            url += "&id_boards=" + encodeURIComponent(bIds.join(","));
        } else if (typeof bIds === "string" && bIds.trim().length > 0) {
            url += "&id_boards=" + encodeURIComponent(bIds.trim());
        }
    }

    request("GET", url, { "Authorization": "Bearer " + token }, null, cb);
}
```
Update CommonJS exports block to include `getWorkspaces` and `getBoards`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/fatto-rest-client.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/js/FattoRestClient.js tests/fatto-rest-client.test.js
git commit -m "feat(client): add getWorkspaces and getBoards endpoints with boardIds schedule filtering"
```

---

### Task 2: Responsive ActiveCardHero Layout & Overflow Fixes

**Files:**
- Modify: `contents/ui/ActiveCardHero.qml`
- Modify: `contents/ui/CardListItem.qml`
- Test: `tests/qml-syntax.test.js`

**Interfaces:**
- Produces:
  - `ActiveCardHero.qml` with dynamic responsive layout: stacks vertically and sets `Layout.fillWidth: true` on action button when widget is narrow, side-by-side when wide.
  - `clip: true` and elisions to guarantee strict containment within widget boundaries.

- [ ] **Step 1: Write test for responsive layout in `tests/qml-syntax.test.js`**

Add tests verifying responsive properties in `ActiveCardHero.qml`:
```javascript
test('ActiveCardHero.qml handles narrow width responsively without overflow', () => {
  const content = fs.readFileSync('contents/ui/ActiveCardHero.qml', 'utf8');
  assert.match(content, /isNarrow/);
  assert.match(content, /clip:\s*true/);
  assert.match(content, /Layout\.fillWidth:\s*true/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL.

- [ ] **Step 3: Update `ActiveCardHero.qml` with responsive layout and clipping**

Modify `contents/ui/ActiveCardHero.qml`:
- Add `clip: true` on root.
- Add `readonly property bool isNarrow: width < Kirigami.Units.gridUnit * 18`
- Calculate `implicitHeight` based on `isNarrow`:
  `implicitHeight: isNarrow ? (Kirigami.Units.gridUnit * 9.5) : (Kirigami.Units.gridUnit * 7)`
- Inside the hero:
  - Title row has `Layout.fillWidth: true`, card title has `elide: Text.ElideRight`.
  - Timer and button container:
    Use `GridLayout` or conditionally structured layout:
    ```qml
    GridLayout {
        Layout.fillWidth: true
        columns: root.isNarrow ? 1 : 2
        columnSpacing: Kirigami.Units.gridUnit
        rowSpacing: Kirigami.Units.smallSpacing

        // Dual time counters (ColumnLayout)
        ColumnLayout {
            Layout.fillWidth: true
            ...
        }

        // Action Button
        QQC2.Button {
            id: actionButton
            enabled: !!root.activeCard
            Layout.fillWidth: root.isNarrow
            Layout.preferredHeight: Kirigami.Units.gridUnit * 2.5
            Layout.preferredWidth: root.isNarrow ? -1 : Kirigami.Units.gridUnit * 5.5
            text: root.isRunning ? i18n("Pause") : i18n("Start")
            icon.name: root.isRunning ? "media-playback-pause" : "media-playback-start"
            onClicked: root.toggleTimer()
        }
    }
    ```
- In `contents/ui/CardListItem.qml`, ensure `clip: true` on root and `elide: Text.ElideRight` on labels.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/ActiveCardHero.qml contents/ui/CardListItem.qml tests/qml-syntax.test.js
git commit -m "fix(ui): make ActiveCardHero responsive to prevent Start button overflow"
```

---

### Task 3: Workspace State & Board Resolution in Applet Coordinator

**Files:**
- Modify: `contents/config/main.xml`
- Modify: `contents/ui/main.qml`
- Test: `tests/package-metadata.test.js` and `tests/qml-syntax.test.js`

**Interfaces:**
- Produces:
  - `selectedWorkspace` KConfigXT configuration entry.
  - `workspaceList`: array of `{ id: string, name: string }`.
  - `selectedWorkspaceId`: string ID of currently active workspace (or `""` for all).
  - `selectWorkspace(wsId)`: switches workspace, fetches boards if needed, and refreshes the schedule.

- [ ] **Step 1: Write test for `selectedWorkspace` config in `tests/package-metadata.test.js`**

Add assertion in `tests/package-metadata.test.js`:
```javascript
test('contents/config/main.xml defines selectedWorkspace entry', () => {
  const xml = fs.readFileSync('contents/config/main.xml', 'utf8');
  assert.match(xml, /entry name="selectedWorkspace"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/package-metadata.test.js`
Expected: FAIL.

- [ ] **Step 3: Update `contents/config/main.xml` and `contents/ui/main.qml`**

1. In `contents/config/main.xml`, add:
```xml
    <entry name="selectedWorkspace" type="String">
      <default></default>
    </entry>
```

2. In `contents/ui/main.qml`:
Add properties:
```qml
    property var workspaceList: []
    property string selectedWorkspaceId: Plasmoid.configuration.selectedWorkspace || ""
```
Add functions:
```qml
    function selectWorkspace(wsId) {
        selectedWorkspaceId = wsId || "";
        Plasmoid.configuration.selectedWorkspace = selectedWorkspaceId;
        refreshData();
    }

    function loadWorkspaces(token, callback) {
        var sUrl = Plasmoid.configuration.serverUrl;
        FattoClient.getWorkspaces(sUrl, token, function(err, items) {
            if (!err && Array.isArray(items)) {
                var list = [{ id: "", name: i18n("All Workspaces") }];
                for (var i = 0; i < items.length; i++) {
                    list.push({ id: items[i].id, name: items[i].name });
                }
                workspaceList = list;
            }
            if (typeof callback === "function") callback(err, workspaceList);
        });
    }
```
Update `refreshData()`:
If `selectedWorkspaceId !== ""` (a specific workspace is selected):
Call `FattoClient.getBoards(sUrl, token, selectedWorkspaceId, function(bErr, boards) { ... })`, extract board IDs, and pass them to `FattoClient.getSchedule(sUrl, token, todayStr, boardIds, ...)`.
If `selectedWorkspaceId === ""`, call `FattoClient.getSchedule(sUrl, token, todayStr, null, ...)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/package-metadata.test.js tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/config/main.xml contents/ui/main.qml tests/package-metadata.test.js
git commit -m "feat(coordinator): manage workspace selection, board mapping, and schedule query filtering"
```

---

### Task 4: Header Workspace Selector UI in FullRepresentation

**Files:**
- Modify: `contents/ui/FullRepresentation.qml`
- Test: `tests/qml-syntax.test.js`

**Interfaces:**
- Produces:
  - Header bar incorporating a workspace `QQC2.ComboBox` with responsive sizing and text elision.
  - Interlocking signal: changing combo box calls `plasmoidRoot.selectWorkspace(modelData.id)`.

- [ ] **Step 1: Write test for workspace selector in `tests/qml-syntax.test.js`**

Add test to `tests/qml-syntax.test.js`:
```javascript
test('FullRepresentation.qml contains workspace selector ComboBox with responsive layout', () => {
  const content = fs.readFileSync('contents/ui/FullRepresentation.qml', 'utf8');
  assert.match(content, /workspaceComboBox/);
  assert.match(content, /selectWorkspace/);
  assert.match(content, /clip:\s*true/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/qml-syntax.test.js`
Expected: FAIL.

- [ ] **Step 3: Update `contents/ui/FullRepresentation.qml`**

Modify `contents/ui/FullRepresentation.qml`:
- Set `clip: true` on root and main column.
- In header section:
  Use a responsive 2-row layout or flexible single-row with `Layout.fillWidth: true` ComboBox:
  ```qml
  // Header bar row 1: Icon, Title, Date, Refresh, Settings
  RowLayout {
      Layout.fillWidth: true
      spacing: Kirigami.Units.smallSpacing

      Kirigami.Icon { ... }
      ColumnLayout {
          Layout.fillWidth: true
          ...
      }
      QQC2.ToolButton { ... } // Refresh
      QQC2.ToolButton { ... } // Configure
  }

  // Header bar row 2: Workspace selector combobox
  RowLayout {
      Layout.fillWidth: true
      spacing: Kirigami.Units.smallSpacing
      visible: plasmoidRoot.workspaceList && plasmoidRoot.workspaceList.length > 1

      Kirigami.Icon {
          source: "folder-symbolic"
          implicitWidth: 16
          implicitHeight: 16
          opacity: 0.7
      }

      QQC2.ComboBox {
          id: workspaceComboBox
          Layout.fillWidth: true
          model: plasmoidRoot.workspaceList
          textRole: "name"
          valueRole: "id"

          currentIndex: {
              for (var i = 0; i < plasmoidRoot.workspaceList.length; i++) {
                  if (plasmoidRoot.workspaceList[i].id === plasmoidRoot.selectedWorkspaceId) return i;
              }
              return 0;
          }

          onActivated: function(index) {
              var item = plasmoidRoot.workspaceList[index];
              if (item) plasmoidRoot.selectWorkspace(item.id);
          }
      }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/qml-syntax.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contents/ui/FullRepresentation.qml tests/qml-syntax.test.js
git commit -m "feat(ui): add responsive workspace selector combobox to widget header"
```

---

### Task 5: End-to-End Test Suite Verification & Package Upgrade

**Files:**
- Modify: `README.md`
- Test: Full test suite (`tests/*.test.js`) and `./install.sh`

**Interfaces:**
- Produces: Clean pass across all unit tests, upgraded package in Plasma, verified width responsiveness in `plasmawindowed`.

- [ ] **Step 1: Run the full automated test suite**

Run: `node --test tests/*.test.js`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Update `README.md` documentation**

Document the workspace selector and responsive features in `README.md`.

- [ ] **Step 3: Execute `install.sh` to update the plasmoid in KDE**

Run: `./install.sh`
Expected: Tests pass and package upgrades cleanly via `kpackagetool6`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document workspace selection and responsive layout features"
```
