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
