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

test('ConfigGeneral.qml has valid structure and KConfigXT bindings', () => {
  assert.ok(fs.existsSync('contents/ui/ConfigGeneral.qml'), 'ConfigGeneral.qml must exist');
  const content = fs.readFileSync('contents/ui/ConfigGeneral.qml', 'utf8');

  // Check KCM import and component
  assert.match(content, /import\s+org\.kde\.kcmutils/);
  assert.match(content, /SimpleKCM\s*\{/);

  // Check aliases to input controls
  assert.match(content, /property\s+alias\s+cfg_serverUrl:\s*serverUrlField\.text/);
  assert.match(content, /property\s+alias\s+cfg_username:\s*usernameField\.text/);
  assert.match(content, /property\s+alias\s+cfg_password:\s*passwordField\.text/);
  assert.match(content, /property\s+alias\s+cfg_pollInterval:\s*pollIntervalSpin\.value/);

  // Check password field hides characters
  assert.match(content, /echoMode:\s*TextInput\.Password/);

  // Check connection test button and FattoClient integration
  assert.match(content, /FattoClient\.login/);

  // Check basic balanced braces and brackets
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced');
});

test('CardListItem.qml exists and handles card properties', () => {
  assert.ok(fs.existsSync('contents/ui/CardListItem.qml'), 'CardListItem.qml must exist');
  const content = fs.readFileSync('contents/ui/CardListItem.qml', 'utf8');

  assert.match(content, /cardData/);
  assert.match(content, /isSelected/);
  assert.match(content, /cardClicked/);
});

test('CardListItem.qml has valid structure, imports, and visual states', () => {
  assert.ok(fs.existsSync('contents/ui/CardListItem.qml'), 'CardListItem.qml must exist');
  const content = fs.readFileSync('contents/ui/CardListItem.qml', 'utf8');

  // Verify imports
  assert.match(content, /import\s+QtQuick/);
  assert.match(content, /import\s+QtQuick\.Layouts/);
  assert.match(content, /import\s+QtQuick\.Controls\s+as\s+QQC2/);
  assert.match(content, /import\s+org\.kde\.kirigami\s+as\s+Kirigami/);

  // Verify properties and signals
  assert.match(content, /property\s+var\s+cardData/);
  assert.match(content, /property\s+bool\s+isSelected/);
  assert.match(content, /property\s+bool\s+isRunning/);
  assert.match(content, /signal\s+cardClicked\(\)/);

  // Verify MouseArea and click signal emission
  assert.match(content, /MouseArea\s*\{/);
  assert.match(content, /cardClicked\(\)/);

  // Verify running indicator and animations
  assert.match(content, /SequentialAnimation\s+on\s+opacity/);

  // Verify balanced braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced');
});


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

test('ActiveCardHero.qml has valid structure, bindings, and balanced braces', () => {
  assert.ok(fs.existsSync('contents/ui/ActiveCardHero.qml'), 'ActiveCardHero.qml must exist');
  const hero = fs.readFileSync('contents/ui/ActiveCardHero.qml', 'utf8');

  // Verify imports
  assert.match(hero, /import\s+QtQuick/);
  assert.match(hero, /import\s+QtQuick\.Layouts/);
  assert.match(hero, /import\s+QtQuick\.Controls\s+as\s+QQC2/);
  assert.match(hero, /import\s+org\.kde\.kirigami\s+as\s+Kirigami/);
  assert.match(hero, /import\s+"js\/TimeUtils\.js"\s+as\s+TimeUtils/);

  // Verify properties
  assert.match(hero, /property\s+var\s+activeCard/);
  assert.match(hero, /property\s+bool\s+isRunning/);
  assert.match(hero, /property\s+int\s+todaySeconds/);
  assert.match(hero, /property\s+int\s+userTotalSeconds/);
  assert.match(hero, /property\s+int\s+globalTotalSeconds/);

  // Verify signal
  assert.match(hero, /signal\s+toggleTimer\(\)/);

  // Verify TimeUtils usage
  assert.match(hero, /TimeUtils\.formatSeconds\(root\.todaySeconds\)/);
  assert.match(hero, /TimeUtils\.formatSeconds\(root\.userTotalSeconds\)/);
  assert.match(hero, /TimeUtils\.formatSeconds\(root\.globalTotalSeconds\)/);

  // Verify balanced braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < hero.length; i++) {
    const char = hero[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening in ActiveCardHero.qml');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening in ActiveCardHero.qml');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced in ActiveCardHero.qml');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced in ActiveCardHero.qml');
});

test('RunningTimersBanner.qml has valid structure, bindings, and balanced braces', () => {
  assert.ok(fs.existsSync('contents/ui/RunningTimersBanner.qml'), 'RunningTimersBanner.qml must exist');
  const banner = fs.readFileSync('contents/ui/RunningTimersBanner.qml', 'utf8');

  // Verify imports
  assert.match(banner, /import\s+QtQuick/);
  assert.match(banner, /import\s+QtQuick\.Layouts/);
  assert.match(banner, /import\s+QtQuick\.Controls\s+as\s+QQC2/);
  assert.match(banner, /import\s+org\.kde\.kirigami\s+as\s+Kirigami/);
  assert.match(banner, /import\s+"js\/TimeUtils\.js"\s+as\s+TimeUtils/);

  // Verify property and signal
  assert.match(banner, /property\s+var\s+runningTimers/);
  assert.match(banner, /signal\s+pauseRequested\(\s*string\s+cardId\s*\)/);

  // Verify Repeater and pause button
  assert.match(banner, /Repeater\s*\{/);
  assert.match(banner, /root\.pauseRequested\(modelData\.id_card\)/);
  assert.match(banner, /TimeUtils\.formatSeconds\(modelData\.elapsedSeconds/);

  // Verify balanced braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < banner.length; i++) {
    const char = banner[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening in RunningTimersBanner.qml');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening in RunningTimersBanner.qml');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced in RunningTimersBanner.qml');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced in RunningTimersBanner.qml');
});

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

test('CompactRepresentation.qml has valid structure, bindings, and balanced braces', () => {
  assert.ok(fs.existsSync('contents/ui/CompactRepresentation.qml'), 'CompactRepresentation.qml must exist');
  const compact = fs.readFileSync('contents/ui/CompactRepresentation.qml', 'utf8');

  // Verify imports
  assert.match(compact, /import\s+QtQuick/);
  assert.match(compact, /import\s+QtQuick\.Layouts/);
  assert.match(compact, /import\s+QtQuick\.Controls\s+as\s+QQC2/);
  assert.match(compact, /import\s+org\.kde\.kirigami\s+as\s+Kirigami/);
  assert.match(compact, /import\s+org\.kde\.plasma\.plasmoid/);
  assert.match(compact, /import\s+"js\/TimeUtils\.js"\s+as\s+TimeUtils/);

  // Verify Plasmoid.expanded toggle
  assert.match(compact, /Plasmoid\.expanded\s*=\s*!Plasmoid\.expanded/);

  // Verify pulsing animation
  assert.match(compact, /SequentialAnimation\s+on\s+opacity/);
  assert.match(compact, /plasmoidRoot\.isActiveCardRunning/);

  // Verify time formatting
  assert.match(compact, /TimeUtils\.formatSeconds\(plasmoidRoot\.activeCardTodaySeconds\)/);

  // Verify toggle button
  assert.match(compact, /plasmoidRoot\.toggleActiveCardTimer\(\)/);

  // Verify balanced braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < compact.length; i++) {
    const char = compact[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening in CompactRepresentation.qml');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening in CompactRepresentation.qml');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced in CompactRepresentation.qml');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced in CompactRepresentation.qml');
});

test('FullRepresentation.qml has valid structure, bindings, and balanced braces', () => {
  assert.ok(fs.existsSync('contents/ui/FullRepresentation.qml'), 'FullRepresentation.qml must exist');
  const full = fs.readFileSync('contents/ui/FullRepresentation.qml', 'utf8');

  // Verify imports
  assert.match(full, /import\s+QtQuick/);
  assert.match(full, /import\s+QtQuick\.Layouts/);
  assert.match(full, /import\s+QtQuick\.Controls\s+as\s+QQC2/);
  assert.match(full, /import\s+org\.kde\.kirigami\s+as\s+Kirigami/);
  assert.match(full, /import\s+org\.kde\.plasma\.plasmoid/);
  assert.match(full, /import\s+"js\/TimeUtils\.js"\s+as\s+TimeUtils/);

  // Verify header actions
  assert.match(full, /plasmoidRoot\.refreshData\(\)/);
  assert.match(full, /Plasmoid\.action\("configure"\)/);

  // Verify ActiveCardHero component usage
  assert.match(full, /ActiveCardHero\s*\{/);
  assert.match(full, /activeCard:\s*plasmoidRoot\.activeCard/);
  assert.match(full, /isRunning:\s*plasmoidRoot\.isActiveCardRunning/);
  assert.match(full, /todaySeconds:\s*plasmoidRoot\.activeCardTodaySeconds/);
  assert.match(full, /onToggleTimer:\s*plasmoidRoot\.toggleActiveCardTimer\(\)/);

  // Verify RunningTimersBanner component usage
  assert.match(full, /RunningTimersBanner\s*\{/);
  assert.match(full, /runningTimers:\s*plasmoidRoot\.otherRunningTimers/);
  assert.match(full, /plasmoidRoot\.pauseOtherCard\(cardId\)/);

  // Verify ListView and CardListItem delegate
  assert.match(full, /ListView\s*\{/);
  assert.match(full, /delegate:\s*CardListItem\s*\{/);
  assert.match(full, /cardData:\s*modelData/);
  assert.match(full, /plasmoidRoot\.selectCard\(modelData\)/);

  // Verify empty state and ScrollView visibility
  assert.match(full, /visible:\s*plasmoidRoot\.scheduleList\.length\s*>\s*0/);
  assert.match(full, /plasmoidRoot\.scheduleList\.length\s*===\s*0/);

  // Verify balanced braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < full.length; i++) {
    const char = full[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening in FullRepresentation.qml');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening in FullRepresentation.qml');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced in FullRepresentation.qml');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced in FullRepresentation.qml');
});

test('main.qml exists and defines required root properties and timers', () => {
  assert.ok(fs.existsSync('contents/ui/main.qml'), 'main.qml must exist');
  const main = fs.readFileSync('contents/ui/main.qml', 'utf8');

  assert.match(main, /PlasmoidItem/);
  assert.match(main, /compactRepresentation/);
  assert.match(main, /fullRepresentation/);
  assert.match(main, /pollTimer/);
  assert.match(main, /clockTickTimer/);
});

test('main.qml has valid structure, bindings, and balanced braces', () => {
  assert.ok(fs.existsSync('contents/ui/main.qml'), 'main.qml must exist');
  const main = fs.readFileSync('contents/ui/main.qml', 'utf8');

  // Verify imports
  assert.match(main, /import\s+QtQuick/);
  assert.match(main, /import\s+org\.kde\.plasma\.plasmoid/);
  assert.match(main, /import\s+org\.kde\.plasma\.core\s+as\s+PlasmaCore/);
  assert.match(main, /import\s+"js\/FattoRestClient\.js"\s+as\s+FattoClient/);
  assert.match(main, /import\s+"js\/TimeUtils\.js"\s+as\s+TimeUtils/);

  // Verify representation selection
  assert.match(main, /preferredRepresentation:\s*Plasmoid\.formFactor/);

  // Verify core properties
  assert.match(main, /property\s+string\s+authToken/);
  assert.match(main, /property\s+var\s+currentUser/);
  assert.match(main, /property\s+var\s+activeCard/);
  assert.match(main, /property\s+bool\s+isActiveCardRunning/);
  assert.match(main, /property\s+int\s+activeCardTodaySeconds/);
  assert.match(main, /property\s+int\s+activeCardUserTotalSeconds/);
  assert.match(main, /property\s+int\s+activeCardGlobalTotalSeconds/);
  assert.match(main, /property\s+var\s+scheduleList/);
  assert.match(main, /property\s+var\s+otherRunningTimers/);

  // Verify core functions
  assert.match(main, /function\s+handleApiError/);
  assert.match(main, /function\s+ensureAuthenticated/);
  assert.match(main, /function\s+refreshData/);
  assert.match(main, /function\s+selectCard/);
  assert.match(main, /function\s+updateRunningTimers/);
  assert.match(main, /function\s+loadActiveCardSessions/);
  assert.match(main, /function\s+toggleActiveCardTimer/);
  assert.match(main, /function\s+pauseOtherCard/);

  // Verify polish: immediate state update and metric zeroing in selectCard
  assert.match(main, /isActiveCardRunning\s*=\s*isCardIdRunning\(card\.id_card\)/);
  assert.match(main, /activeCardTodaySeconds\s*=\s*0/);
  assert.match(main, /activeCardUserTotalSeconds\s*=\s*0/);
  assert.match(main, /activeCardGlobalTotalSeconds\s*=\s*0/);

  // Verify polish: clearing authToken on 401 error
  assert.match(main, /authToken\s*=\s*""/);

  // Verify balanced braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  for (let i = 0; i < main.length; i++) {
    const char = main[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    assert.ok(braceCount >= 0, 'Braces must not close before opening in main.qml');
    assert.ok(parenCount >= 0, 'Parentheses must not close before opening in main.qml');
  }
  assert.strictEqual(braceCount, 0, 'Braces must be balanced in main.qml');
  assert.strictEqual(parenCount, 0, 'Parentheses must be balanced in main.qml');
});

test('ActiveCardHero.qml handles narrow width responsively without overflow', () => {
  const content = fs.readFileSync('contents/ui/ActiveCardHero.qml', 'utf8');
  assert.match(content, /isNarrow/);
  assert.match(content, /clip:\s*true/);
  assert.match(content, /Layout\.fillWidth:\s*true/);
  assert.match(content, /readonly\s+property\s+bool\s+isNarrow:\s*width\s*<\s*Kirigami\.Units\.gridUnit\s*\*\s*18/);
  assert.match(content, /implicitHeight:\s*isNarrow\s*\?\s*\(Kirigami\.Units\.gridUnit\s*\*\s*9\.5\)\s*:\s*\(Kirigami\.Units\.gridUnit\s*\*\s*7\)/);
});

test('CardListItem.qml contains clipping and text elision for boundary containment', () => {
  const content = fs.readFileSync('contents/ui/CardListItem.qml', 'utf8');
  assert.match(content, /clip:\s*true/);
  assert.match(content, /elide:\s*Text\.ElideRight/);
});
