# KDE Plasma 6 "FATTO" Desktop Widget

A native KDE Plasma 6 plasmoid for tracking tasks and recording time spent using the FATTO web application.

## Features

- **Today's Schedule**: Automatically displays all cards scheduled for the current date.
- **Domain & Workspace Switching**:
  - **Domain Switcher**: Seamlessly toggle between multiple domains (e.g. `fsoft`, `pig`) directly from the widget header bar without re-entering credentials.
  - **Workspace Filtering**: Filter scheduled cards by workspace within the active domain, or choose **All Workspaces** to aggregate all cards.
  - Selected domain and workspace are automatically remembered and persisted across sessions.
- **Responsive Layout & Boundary Containment**:
  - Fluidly adapts to any dimensions, from compact panel popups (down to ~240px width) to wide desktop widgets.
  - Adaptive two-row header with automatic text elision to prevent horizontal overflow.
  - Dynamic `ActiveCardHero` component that automatically switches between stacked (narrow) and inline (wide) timer metrics and controls.
  - Strict clipping and elision on card items to ensure visual boundary containment without clipping artifacts.
- **Prominent Timer**: Single-click Start and Pause with local real-time second ticking and pulsing animation.
- **Personal Time Tracking (Option A)**:
  - **Today (Yours)**: Time spent today by the authenticated user on this card.
  - **Total (Yours)**: Total cumulative time spent by the authenticated user on this card.
  - **All**: Total collaborative time spent by all team members across all sessions on this card.
- **Independent Timers & Notifications**: Live banner showing any concurrent running tasks across FATTO with direct one-click pause actions.
- **Adaptive Representations**:
  - **Compact**: Panel-friendly layout displaying active card code and elapsed time with pulsing running indicator. Clicking expands the full popup.
  - **Full**: Rich desktop widget or popup showing active card hero, live notification banner, workspace selector, and scheduled cards list.

## Installation

Run the installation script to run tests and install or upgrade the plasmoid for the current user:

```bash
./install.sh
```

Alternatively, install manually using `kpackagetool6`:

```bash
# New installation:
kpackagetool6 --type Plasma/Applet --install .

# Or upgrade existing:
kpackagetool6 --type Plasma/Applet --upgrade .
```

## Configuration

Right-click the widget and select **Configure FATTO...** to open the settings dialog:

- **Server URL**: The base URL of your FATTO instance (e.g., `https://fatto.example.com`).
- **Username**: Your FATTO username or email.
- **Password**: Your FATTO account password.
- **Polling Interval (seconds)**: Background refresh interval (minimum 10 seconds, default 60 seconds).
- **Workspace**: Current selected workspace filter (can be adjusted directly from the widget header or config; defaults to "All Workspaces").

Settings are stored via standard KDE `KConfigXT` (`plasma-org.kde.fatto-appletsrc`).

## Testing & Preview

### Interactive Widget Preview
Launch the widget in a standalone test window:

```bash
plasmawindowed org.kde.fatto
```

### Unit & Integration Test Suite
Run the automated test suite powered by Node.js built-in test runner:

```bash
node --test tests/*.test.js
```

## Project Structure

```
├── metadata.json                    # Plasma 6 package metadata (org.kde.fatto)
├── install.sh                       # Test and installation script
├── contents/
│   ├── config/
│   │   ├── main.xml                 # KConfigXT schema definition
│   │   └── config.qml               # Plasma configuration categories
│   └── ui/
│       ├── main.qml                 # Root PlasmoidItem and state coordinator
│       ├── CompactRepresentation.qml# Panel representation
│       ├── FullRepresentation.qml   # Desktop/popup representation with workspace selector
│       ├── ActiveCardHero.qml       # Responsive active card hero component with timer
│       ├── RunningTimersBanner.qml  # Concurrent running timers notification banner
│       ├── CardListItem.qml         # Scheduled card list item
│       ├── ConfigGeneral.qml        # Settings configuration UI
│       └── js/
│           ├── FattoRestClient.js   # REST API client for FATTO backend
│           └── TimeUtils.js         # Date and duration formatting utilities
└── tests/                           # Node.js automated test suite
```
