# KDE Plasma 6 "FATTO" Desktop Widget

A native KDE Plasma 6 plasmoid for tracking tasks and recording time spent using the FATTO web application.

## Features

- **Today's Schedule**: Automatically displays all cards scheduled for the current date.
- **Prominent Timer**: Single-click Start and Pause with local real-time second ticking and pulsing animation.
- **Personal Time Tracking (Option A)**:
  - **Today (Yours)**: Time spent today by the authenticated user on this card.
  - **Total (Yours)**: Total cumulative time spent by the authenticated user on this card.
  - **All**: Total collaborative time spent by all team members across all sessions on this card.
- **Independent Timers & Notifications**: Live banner showing any concurrent running tasks across FATTO with direct one-click pause actions.
- **Adaptive Representations**:
  - **Compact**: Panel-friendly layout displaying active card code and elapsed time with pulsing running indicator. Clicking expands the full popup.
  - **Full**: Rich desktop widget or popup showing active card hero, live notification banner, and scheduled cards list.

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
│       ├── FullRepresentation.qml   # Desktop/popup representation
│       ├── ActiveCardHero.qml       # Active card hero component with timer
│       ├── RunningTimersBanner.qml  # Concurrent running timers notification banner
│       ├── CardListItem.qml         # Scheduled card list item
│       ├── ConfigGeneral.qml        # Settings configuration UI
│       └── js/
│           ├── FattoRestClient.js   # REST API client for FATTO backend
│           └── TimeUtils.js         # Date and duration formatting utilities
└── tests/                           # Node.js automated test suite
```
