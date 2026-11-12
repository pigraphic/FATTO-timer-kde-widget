# Design Specification: KDE Plasma 6 "FATTO" Desktop Widget (REST API)

## 1. Overview
The **KDE "FATTO" Desktop Widget** is a native KDE Plasma 6 Plasmoid designed to streamline daily task execution and time tracking. It connects directly to the FATTO web application via its native REST API (`/api/kanban/...` and `/api/user/...`). It authenticates using standard username and password credentials, automatically displays tasks scheduled for the current day, allows switching between tasks, displays personal time spent today versus total time spent on the selected task, and provides immediate controls to start or pause the active timer.

---

## 2. Goals and Requirements

### 2.1 Core Functional Requirements
1. **Direct REST Integration**: Connect directly to FATTO's REST endpoints without intermediate proxies or MCP servers.
2. **Session Authentication**: Authenticate via `POST /api/user/login` using username and password, storing the session JWT token and automatically refreshing it via `POST /api/user/token/refresh`.
3. **Scheduled Tasks Polling**: Periodically fetch cards scheduled for the current date (`YYYY-MM-DD`) via `GET /api/kanban/schedule/list`.
4. **Card Review & Selection**: Allow the user to review the day's scheduled tasks and select the active card to work on.
5. **Timer Control**: Prominent, single-click Start/Pause button for the selected card via `POST /api/kanban/timer/start` and `POST /api/kanban/timer/pause`.
6. **Dual Time Tracking (Option A - Personal-focused)**:
   - **Time Spent Today (Yours)**: Sum of the current user's timer sessions for the active card during the current calendar day.
   - **User's Total Time (Yours)**: Sum of all of the current user's timer sessions for the active card across all time.
   - **Card Global Total**: (Secondary metric) Total cumulative time spent by all collaborators on the card.
7. **Concurrent / Independent Timers**:
   - Timers run independently on the backend.
   - If other cards currently have running timer sessions for the user, a notification banner displays the other active tasks with their live elapsed times and quick-pause buttons.
8. **Adaptive Form Factor**:
   - **Panel Representation**: Compact widget showing active card code, live ticking timer, and play/pause toggle. Clicking opens the popup.
   - **Desktop / Popup Representation**: Full dashboard with active timer hero view, other running timers banner, and the scheduled cards list.
9. **Smooth Client-side Ticking**: An internal 1-second timer increments open session counters smoothly in real time without querying the backend every second.

### 2.2 Constraints & Technology Stack
* **KDE Plasma 6**: Written using QML, QtQuick, Kirigami, and PlasmaComponents 3.
* **Pure REST API**: Standard HTTP `GET` and `POST` calls with `Authorization: Bearer <jwt_token>`.
* **Zero Backend Code Changes**: Relies exclusively on FATTO's existing, verified REST API routes.

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
│   │                    └── FattoRestClient.js           │   │
│   └───────────────────────────┬─────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────┘
                                │ HTTPS REST Calls
                                │ Bearer <jwt_token>
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   FATTO REST API Backend                    │
│                                                             │
│   Auth:                                                     │
│   ├── POST /api/user/login                                  │
│   └── POST /api/user/token/refresh                          │
│                                                             │
│   Kanban & Timers:                                          │
│   ├── GET  /api/kanban/schedule/list                        │
│   ├── GET  /api/kanban/timer/mine                           │
│   ├── GET  /api/kanban/timer/get                            │
│   ├── GET  /api/kanban/timer/sessions                       │
│   ├── POST /api/kanban/timer/start                          │
│   └── POST /api/kanban/timer/pause                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Plasmoid Package Layout (`/data2/liwe/fatto-widget`)
```
fatto-widget/
├── metadata.json                          # KDE Plasma 6 applet metadata (org.kde.fatto)
├── contents/
│   ├── config/
│   │   ├── main.xml                       # KConfigXT schema (serverUrl, username, password, pollInterval)
│   │   └── config.qml                     # Plasma settings dialog registration
│   └── ui/
│       ├── main.qml                       # Root Plasma applet & coordinator
│       ├── CompactRepresentation.qml      # Panel view: active task chip + timer + play/pause
│       ├── FullRepresentation.qml         # Full view: header, active card hero, banner, schedule list
│       ├── ActiveCardHero.qml             # Large timer, today's time, total card time, start/pause
│       ├── RunningTimersBanner.qml        # Notification & list of other active running timers
│       ├── CardListItem.qml               # Scheduled card row item
│       ├── ConfigGeneral.qml              # Settings page UI (Server URL, Username, Password, Refresh Rate)
│       └── js/
│           ├── FattoRestClient.js         # HTTP REST client using QML XMLHttpRequest
│           └── TimeUtils.js               # Formatting (HH:MM:SS) and date helpers
```

---

## 4. REST API Endpoints Specification

All endpoints communicate using standard JSON:

| Operation | Method & URL | Parameters / Body | Response Payload |
| --- | --- | --- | --- |
| **Login** | `POST /api/user/login` | Body: `{ "username": "...", "password": "..." }` | `{ "ok": true, "data": { "token": "...", "user": { "id": "...", ... } } }` |
| **Refresh Token** | `POST /api/user/token/refresh` | *(Bearer token in header)* | `{ "ok": true, "data": { "token": "..." } }` |
| **Scheduled Tasks** | `GET /api/kanban/schedule/list` | Query: `?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` | `{ "ok": true, "data": [ KanbanScheduledCardItem, ... ] }` |
| **My Active Timers** | `GET /api/kanban/timer/mine` | None | `{ "ok": true, "data": [ KanbanTimerMineItem, ... ] }` |
| **Card Timer State** | `GET /api/kanban/timer/get` | Query: `?id_card=...` | `{ "ok": true, "data": { "timer": KanbanCardTimer, ... } }` |
| **Card Timer Sessions** | `GET /api/kanban/timer/sessions` | Query: `?id_card=...` | `{ "ok": true, "data": [ KanbanTimerSessionItem, ... ] }` |
| **Start Timer** | `POST /api/kanban/timer/start` | Body: `{ "id_card": "..." }` | `{ "ok": true, "data": { "timer": ..., "session": ... } }` |
| **Pause Timer** | `POST /api/kanban/timer/pause` | Body: `{ "id_card": "..." }` | `{ "ok": true, "data": { "timer": ..., "session": ... } }` |

---

## 5. Data Flow & State Management

### 5.1 Configuration & Authentication
* **Settings**: User enters `serverUrl` (default: `https://fatto.os3.services`), `username`, `password`, and `pollInterval` (default: `60` seconds) in the widget settings.
* **Authentication Flow**:
  1. On plasmoid startup or when credentials change, `FattoRestClient.login(username, password)` calls `POST /api/user/login`.
  2. On success, the JWT token and `user.id` are stored in memory.
  3. If a 401 error is received during a request, `FattoRestClient` attempts a transparent login retry before surfacing an authentication error.

### 5.2 Polling & Data Sync
Every `pollInterval` seconds (QML `Timer`):
1. **Fetch Today's Schedule**:
   - Calls `GET /api/kanban/schedule/list?from_date=<today>&to_date=<today>`.
   - Populates `scheduleModel` with today's scheduled tasks.
2. **Fetch Active Timers**:
   - Calls `GET /api/kanban/timer/mine`.
   - Checks if the currently selected card has an open session (`isActiveCardRunning`).
   - Collects all other running sessions into `otherRunningTimers`.
3. **Fetch Active Card Sessions**:
   - For the selected card, calls `GET /api/kanban/timer/sessions?id_card=<card.id>`.
   - Computes **Today's Seconds**: Sum of duration of sessions where `id_user === currentUser.id` and `started` falls on today's date.
   - Computes **User Total Seconds**: Sum of all sessions where `id_user === currentUser.id`.
   - Computes **Card Global Total Seconds**: Sum of all sessions across all users.

### 5.3 Client-Side Real-Time Ticking
* An internal 1-second QML `Timer` runs while any timer is active:
  * If the active card is running:
    * Increments `activeCardTodaySeconds += 1`
    * Increments `activeCardUserTotalSeconds += 1`
    * Increments `activeCardGlobalTotalSeconds += 1`
  * Increments elapsed seconds on each session in `otherRunningTimers`.
* Updates the UI instantly and smoothly without firing network requests.

### 5.4 Actions & Independent Timers
* **Start Active Card**:
  - `POST /api/kanban/timer/start` with `{ id_card: activeCard.id }`.
  - Sets `isActiveCardRunning = true` and starts local ticking.
* **Pause Active Card**:
  - `POST /api/kanban/timer/pause` with `{ id_card: activeCard.id }`.
  - Sets `isActiveCardRunning = false`.
* **Switch Active Card**:
  - Clicking any card in the list sets it as the active card.
  - Fetches its session history immediately and updates the dual counter.
  - Any timer previously running on another card remains running and is tracked in the `otherRunningTimers` banner.
* **Quick Pause in Banner**:
  - Clicking the pause button on an item in the banner invokes `POST /api/kanban/timer/pause` for that card.

---

## 6. User Interface Specifications

### 6.1 Compact Representation (`CompactRepresentation.qml`)
* Displayed when the widget is placed in a KDE panel (horizontal or vertical).
* **Components**:
  * Running status indicator (pulsing accent dot if running, subtle clock icon if idle/paused).
  * Active card code (e.g., `FATTO-25`).
  * Real-time timer display (`HH:MM:SS`).
  * Inline quick play/pause button.
  * Clicking outside the button opens the full popup representation.

### 6.2 Full Representation (`FullRepresentation.qml`)
* Displayed directly on desktop or in panel popup.
* **Components**:
  1. **Header Bar**:
     * App Title ("FATTO").
     * Current Date ("Thursday, 12 Nov").
     * Sync Status & Manual Refresh Button.
     * Settings Shortcut Button.
  2. **Active Card Hero**:
     * Card Code badge & Title.
     * Column status indicator.
     * Prominent Start / Pause Button (Kirigami theme styled).
     * **Personal-Focused Dual Time Counters**:
       * **Today (Yours)**: Large, primary highlighted digits `01:45:20`.
       * **Total (Yours)**: Secondary counter `Total: 06:12:00`.
       * **Card Total (All Collaborators)**: Subtle badge `All: 14:30:15`.
  3. **Other Running Timers Banner** (Displayed when concurrent timers exist):
     * Info notification header: *"1 other task currently running"*.
     * Compact row per running task: Code + Title + live timer + Quick Pause button.
  4. **Scheduled Cards List**:
     * Scrollable `ListView` showing today's tasks.
     * Each item shows: Card Code, Title, Board Prefix, Status, and a running badge if active.
     * Clicking an item selects it as the active card.
     * Empty state if no tasks scheduled today.

### 6.3 Settings Dialog (`ConfigGeneral.qml`)
* Server URL input (default: `https://fatto.os3.services`).
* Username input.
* Password input (masked).
* Polling Interval slider/spinbox (10 to 600 seconds, default 60s).
* Connection Test / Status indicator.

---

## 7. Error Handling & Edge Cases

| Scenario | Handling |
| --- | --- |
| **Missing Credentials** | Empty state with message: *"Please enter your FATTO username and password in settings"* with button to open settings. |
| **Invalid Credentials (403/401)** | Header error badge: *"Login failed: check username/password in settings"*. |
| **Network Unavailable / Timeout** | Retains last known state, displays subtle offline warning, retries on next poll interval. |
| **Token Expiry** | Automatic transparent re-login via `POST /api/user/login` when an API request encounters 401. |
| **Midnight Rollover** | Automatic date monitor re-fetches the schedule when the calendar day changes. |

---

## 8. Verification & Testing

1. **REST Client Verification**:
   * Test curl requests against `https://fatto.os3.services/api/...` verifying `user/login`, `kanban/schedule/list`, `kanban/timer/*`.
2. **Package Validation**:
   * Verify `metadata.json` conforms to KDE Plasma 6 package specification.
3. **Plasma Desktop Execution**:
   * Run the widget with `/usr/bin/plasmawindowed org.kde.fatto`.
   * Test login, schedule loading, card selection, timer start/pause, and other running timers banner.
4. **Form Factor Testing**:
   * Verify compact representation in panel mode and full representation in desktop/popup mode.
