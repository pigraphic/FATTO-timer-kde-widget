# Design Specification: KDE Plasma 6 "FATTO" Desktop Widget

## 1. Overview
The **KDE "FATTO" Desktop Widget** is a native KDE Plasma 6 Plasmoid designed to streamline daily task execution and time tracking. It connects to the FATTO web application via MCP JSON-RPC using an API key (`fatto_...`). It automatically displays all tasks scheduled for the current day, allows switching between tasks, displays personal time spent today versus total time spent on the selected task, and provides immediate controls to start or pause the active timer.

---

## 2. Goals and Requirements

### 2.1 Core Functional Requirements
1. **Scheduled Tasks Polling**: Periodically fetch cards scheduled for the current date (`YYYY-MM-DD`).
2. **Card Review & Selection**: Allow the user to review the day's scheduled tasks and select the active card to work on.
3. **Timer Control**: Prominent, single-click Start/Pause button for the selected card.
4. **Dual Time Tracking (Option A - Personal-focused)**:
   - **Time Spent Today**: Sum of the current user's timer sessions for the active card during the current calendar day.
   - **User's Total Time**: Sum of all of the current user's timer sessions for the active card across all time.
   - **Card Global Total**: (Secondary display) Total cumulative time spent by all collaborators on the card.
5. **Concurrent / Independent Timers**:
   - Timers run independently.
   - If other cards currently have running timers for the user, a notification banner displays the other active tasks with their elapsed times and a quick-pause action.
6. **Adaptive Form Factor**:
   - **Panel Representation**: Compact widget showing active card code, live ticking timer, and play/pause toggle. Clicking opens the popup.
   - **Desktop / Popup Representation**: Full dashboard with active timer hero view, other running timers banner, and the scheduled cards list.
7. **Smooth Client-side Ticking**: An internal 1-second timer increments open session counters smoothly in real time without querying the backend every second.

### 2.2 Constraints & Integration
* Authenticate using the user's personal API Key (`Authorization: Bearer fatto_...`).
* Extend the FATTO backend MCP server (`/data2/liwe/cf-liwe3/fatto/liwe3/modules/mcpkanban`) to expose `kanban_schedule_list`.
* Connect via HTTP JSON-RPC 2.0 to `<host>/api/mcp-kanban`.

---

## 3. Architecture & Components

```
┌─────────────────────────────────────────────────────────────┐
│                    KDE Plasma 6 Shell                       │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 org.kde.fatto                       │   │
│   │  ┌────────────────────────┐  ┌────────────────────┐ │   │
│   │  │  CompactRepresentation │  │ FullRepresentation │ │   │
│   │  │  (Panel mode)          │  │ (Desktop / Popup)  │ │   │
│   │  └───────────┬────────────┘  └─────────┬──────────┘ │   │
│   │              │                         │            │   │
│   │              └────────────┬────────────┘            │   │
│   │                           ▼                         │   │
│   │                   main.qml (State)                  │   │
│   │                    ├── Active Card                  │   │
│   │                    ├── Schedule Model               │   │
│   │                    ├── 1s Ticking Timer             │   │
│   │                    └── FattoMcpClient.js            │   │
│   └───────────────────────────┬─────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────┘
                                │ JSON-RPC 2.0 (HTTPS)
                                │ Bearer fatto_...
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   FATTO Backend API                         │
│             (/api/mcp-kanban Endpoint)                      │
│                                                             │
│   Tools:                                                    │
│   ├── kanban_schedule_list (New)                            │
│   ├── kanban_timer_mine                                     │
│   ├── kanban_timer_get                                      │
│   ├── kanban_timer_sessions                                 │
│   ├── kanban_timer_start                                    │
│   └── kanban_timer_pause                                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Backend Extension (`/data2/liwe/cf-liwe3/fatto`)
The FATTO backend already implements `kanban_schedule_list` in `liwe3/modules/kanban/backend/src/methods/kanban-schedule-list.ts`.
We register this tool in `liwe3/modules/mcpkanban/backend/src/tools.ts`:
* **Name**: `kanban_schedule_list`
* **Description**: Lists scheduled card items for calendar views filtering by date range, optional boards, and user.
* **Module**: `'kanban'`
* **Call**: `'kanban.call.schedule.list'`
* **Gate**: `LOGGED`
* **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "from_date": { "type": "string", "description": "Start date (YYYY-MM-DD)" },
      "to_date": { "type": "string", "description": "End date (YYYY-MM-DD)" },
      "id_boards": { "type": "array", "items": { "type": "string" }, "description": "Optional board IDs filter" },
      "id_user": { "type": "string", "description": "Optional user ID filter" }
    },
    "required": ["from_date", "to_date"],
    "additionalProperties": false
  }
  ```

### 3.2 Plasmoid Package Layout (`/data2/liwe/fatto-widget`)
```
fatto-widget/
├── metadata.json                          # KDE Plasma 6 applet metadata (org.kde.fatto)
├── contents/
│   ├── config/
│   │   ├── main.xml                       # KConfigXT schema for plasmoid configuration
│   │   └── config.qml                     # Plasma settings dialog pages
│   └── ui/
│       ├── main.qml                       # Root Plasma applet & coordinator
│       ├── CompactRepresentation.qml      # Panel view: active task chip + timer + play/pause
│       ├── FullRepresentation.qml         # Full view: header, active card hero, banner, schedule list
│       ├── ActiveCardHero.qml             # Large timer, today's time, total card time, start/pause
│       ├── RunningTimersBanner.qml        # Notification & list of other active running timers
│       ├── CardListItem.qml               # Scheduled card row item
│       ├── ConfigGeneral.qml              # Settings page UI (Server URL, API Key, Refresh Rate)
│       └── js/
│           ├── FattoMcpClient.js          # JSON-RPC 2.0 network client via XMLHttpRequest
│           └── TimeUtils.js               # Formatting (HH:MM:SS) and date calculations
```

---

## 4. Data Flow & State Management

### 4.1 Configuration State
Managed via Plasma KConfigXT (`contents/config/main.xml`):
* `serverUrl`: Base URL of FATTO (Default: `https://fatto.os3.services`).
* `apiKey`: Bearer token (e.g., `fatto_...`).
* `pollInterval`: Polling interval in seconds (Default: `60`, Range: 10 - 600).

### 4.2 Data Fetching & Syncing
1. **Periodic Refresh**: Triggered every `pollInterval` seconds by a QML `Timer`.
2. **Fetch Today's Schedule**:
   - Calls `kanban_schedule_list` with `from_date = today` and `to_date = today` (in local `YYYY-MM-DD` format).
   - Updates `scheduleModel` with the list of cards scheduled for today.
   - Extracts current user ID from `id_user` in the schedule response (or active sessions).
3. **Fetch Active Timers**:
   - Calls `kanban_timer_mine` to retrieve all currently running sessions for the user.
   - If the active card has an open session, sets `isActiveCardRunning = true`.
   - Identifies any *other* cards with open sessions to populate `otherRunningTimers`.
4. **Fetch Active Card Sessions**:
   - For the selected card, calls `kanban_timer_sessions({ id_card: activeCard.id })`.
   - **Today's Seconds**: Sum of `session.seconds` where `session.id_user === currentUserId` and session date is today.
   - **User Total Seconds**: Sum of all `session.seconds` where `session.id_user === currentUserId`.
   - **Global Total Seconds**: Total of all sessions regardless of user.

### 4.3 Client-Side Smooth Clock Ticking
* An internal 1-second QML `Timer` runs whenever at least one timer is active:
  * If the selected card is currently running:
    * Increments `activeCardTodaySeconds += 1`
    * Increments `activeCardUserTotalSeconds += 1`
    * Increments `activeCardGlobalTotalSeconds += 1`
  * Increments elapsed seconds on each item in `otherRunningTimers`.
* Guarantees zero UI lag without flooding the backend API.

### 4.4 User Actions
* **Start Timer**:
  * Calls `kanban_timer_start({ id_card: activeCard.id })`.
  * Optimistically marks `isActiveCardRunning = true`, starts the local 1s ticker, and appends to open sessions.
* **Pause Timer**:
  * Calls `kanban_timer_pause({ id_card: activeCard.id })`.
  * Optimistically marks `isActiveCardRunning = false`.
* **Switch Active Card**:
  * User clicks any card in the scheduled tasks list.
  * Widget sets `activeCard = selectedCard`, immediately loads its sessions via `kanban_timer_sessions`, and updates the dual timer view.
  * If the previous card's timer was running, it continues running in the background and immediately appears in the `otherRunningTimers` banner.
* **Quick Pause in Banner**:
  * User clicks pause icon on any item in `otherRunningTimers` banner: sends `kanban_timer_pause({ id_card: otherCard.id })` directly.

---

## 5. User Interface Specifications

### 5.1 Panel Representation (`CompactRepresentation.qml`)
* **Layout**: Horizontal row inside panel height.
* **Elements**:
  * Status indicator icon (Pulsing green dot if active timer running, subtle clock icon if paused).
  * Active Card Code (e.g., `FATTO-25`) styled in bold monospace.
  * Live ticking timer: `HH:MM:SS`.
  * Quick Play / Pause button.
  * Click on the rest of the widget toggles the full popup.

### 5.2 Desktop & Popup Representation (`FullRepresentation.qml`)
* **Header**:
  * Title: "FATTO Tasks"
  * Today's Date formatted (e.g., `Thursday, 12 Nov`).
  * Manual Refresh icon button (with spinning animation during sync).
  * Settings icon button (opens Plasma config).
* **Active Card Hero Section**:
  * Card title & code badge with board prefix.
  * Column/Status badge (e.g. `IN PROGRESS`).
  * Primary Start / Pause Button: Large, colored according to state (Kirigami theme positive/accent for Start, warning/neutral for Pause).
  * Dual Timer Display:
    * **Today (Yours)**: Large, high contrast text `01:24:10`.
    * **Total (Yours)**: Secondary text `Total: 04:52:30`.
    * **Card Total (Global)**: Small badge `Card All: 12:15:00`.
* **Other Running Timers Banner** (Visible only if other timers are running):
  * Amber warning/info strip: *"1 other task running"*.
  * Row for each running task: Code + Title + live timer + Quick Pause button.
* **Scheduled Today List**:
  * Scrollable `ListView`.
  * Items display: Code, Title, Board Name, Status Column, and whether a timer is currently running.
  * Visual highlight for the currently selected active card.
  * Empty state if list is empty: *"No tasks scheduled for today."*

---

## 6. Error Handling & Edge Cases

| Scenario | Handling |
| --- | --- |
| **Missing / Empty API Key** | Displays placeholder with *"Please configure your FATTO API Key"* and a direct button to open the settings dialog. |
| **Invalid API Key (401)** | Highlights auth error in header status: *"Unauthorized: check your API key in settings"*. |
| **Network Unavailable / 5xx** | Retains last known data, shows a subtle disconnected warning badge, retries on the next poll cycle. |
| **Date Rollover at Midnight** | Date watcher triggers schedule refresh for the new date and resets the today counter. |
| **Deleted / Archived Card** | If a scheduled card was deleted or archived, schedule list omits it or displays it disabled; if currently active, defaults back to the first available card. |

---

## 7. Testing & Verification

1. **Backend MCP Verification**:
   * Add automated test in `/data2/liwe/cf-liwe3/fatto/liwe3/modules/mcpkanban/tests/` verifying `kanban_schedule_list` works via JSON-RPC `tools/call`.
   * Verify schema synchronization test passes.
2. **Plasmoid Structure Verification**:
   * Validate `metadata.json` conforms to KDE Plasma 6 package specifications.
3. **Functional Plasmoid Test**:
   * Run the plasmoid in isolation using `/usr/bin/plasmawindowed org.kde.fatto`.
   * Test API key configuration, schedule retrieval, active card selection, start/pause timer toggling, and multi-timer banner.
4. **Panel and Desktop Simulation**:
   * Test compact representation and full representation rendering in `plasmawindowed`.
