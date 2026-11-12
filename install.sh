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
