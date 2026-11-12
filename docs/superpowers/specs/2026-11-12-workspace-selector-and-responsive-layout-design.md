# Design Specification: Workspace Selector & Responsive Layout for FATTO Widget

## 1. Overview
This specification defines the additions to the KDE Plasma 6 "FATTO" Desktop Widget (`org.kde.fatto`) to:
1. Allow the user to select from which workspace to fetch scheduled cards via an integrated header dropdown ("All Workspaces" or a specific workspace).
2. Fix responsive layout overflow issues so that all components (especially the Start/Pause timer button, headers, and card titles) are strictly contained inside the widget when its width is reduced.
3. Keep all implementation 100% self-contained in `fatto-widget`, without editing or modifying any files in the main `fatto` project.

---

## 2. Requirements & Constraints

### 2.1 Workspace Selector
- **Discovery**: Call `GET /api/kanban/workspace/list` upon login/refresh to retrieve all workspaces visible to the logged-in user.
- **Header Selection**: In `FullRepresentation.qml`, display a `QQC2.ComboBox` dropdown:
  - First entry: "All Workspaces" (id: `""`).
  - Remaining entries: List of user's workspaces (`{ id: ws.id, name: ws.name }`).
- **Scoping / Filtering**:
  - When "All Workspaces" is selected: `GET /api/kanban/schedule/list` is called without board filtering, returning all scheduled tasks.
  - When a specific workspace is selected: Call `GET /api/kanban/board/list?id_workspace=<id>` to retrieve the board IDs of that workspace, then call `GET /api/kanban/schedule/list` passing `id_boards=<ids>`.
- **Persistence**: Persist the selected workspace ID in `Plasmoid.configuration.selectedWorkspace` so the widget remembers the selection across sessions.

### 2.2 Responsive Layout & Overflow Prevention
- **Adaptive Timer Hero**:
  - In `ActiveCardHero.qml`, replace the rigid horizontal-only row with a responsive layout:
    - Normal width (`width >= Kirigami.Units.gridUnit * 18`): Side-by-side (counters on left, Start/Pause button on right).
    - Compact width (`width < Kirigami.Units.gridUnit * 18`): Stacks vertically, with the Start/Pause button expanding to full width (`Layout.fillWidth: true`).
- **Boundary Containment**:
  - Set `clip: true` on containers.
  - Set `elide: Text.ElideRight` on text labels (card titles, card codes, header texts).
  - Ensure `Layout.fillWidth: true` with appropriate `Layout.minimumWidth` on layouts to prevent child elements from expanding beyond the widget parent boundary.

---

## 3. Architecture & File Changes (100% in `fatto-widget`)

### 3.1 `contents/config/main.xml`
Add KConfigXT entry:
```xml
<entry name="selectedWorkspace" type="String">
  <default></default>
</entry>
```

### 3.2 `contents/ui/js/FattoRestClient.js`
Add methods and update `getSchedule`:
- `getWorkspaces(baseUrl, token, callback)` -> `GET /api/kanban/workspace/list`
- `getBoards(baseUrl, token, workspaceId, callback)` -> `GET /api/kanban/board/list?id_workspace=<workspaceId>`
- `getSchedule(baseUrl, token, dateStr, boardIds, callback)` -> `GET /api/kanban/schedule/list?from_date=...&to_date=...` (and optionally `&id_boards=...`)

### 3.3 `contents/ui/main.qml`
- Properties:
  - `property var workspaceList: []`
  - `property string selectedWorkspaceId: Plasmoid.configuration.selectedWorkspace || ""`
- Functions:
  - `loadWorkspaces()`: calls `FattoClient.getWorkspaces` and populates `workspaceList`.
  - `selectWorkspace(wsId)`: updates `selectedWorkspaceId`, saves to configuration, and re-fetches scheduled cards accordingly.
  - `refreshData()`: chains workspace loading and schedule fetching.

### 3.4 `contents/ui/FullRepresentation.qml`
- Responsive header with `QQC2.ComboBox` for workspace selection.
- Text elision and flexible sizing.

### 3.5 `contents/ui/ActiveCardHero.qml`
- Responsive layout adapting between side-by-side and stacked layout based on width.
- Bounded Start/Pause button that never overflows.

---

## 4. Testing & Verification
- Unit tests in `tests/fatto-rest-client.test.js` verifying `getWorkspaces`, `getBoards`, and `getSchedule` with `boardIds`.
- Unit tests in `tests/qml-syntax.test.js` verifying responsive bindings and workspace ComboBox in `FullRepresentation.qml`.
- Test package execution via `plasmawindowed org.kde.fatto` while resizing window width from narrow (200px) to wide (600px).
