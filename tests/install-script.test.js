import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('install.sh exists, is executable, and contains required installation commands', () => {
  assert.ok(fs.existsSync('install.sh'), 'install.sh must exist');
  
  // Verify executable bit
  try {
    fs.accessSync('install.sh', fs.constants.X_OK);
  } catch (err) {
    assert.fail('install.sh must be executable');
  }

  const script = fs.readFileSync('install.sh', 'utf8');
  assert.match(script, /^#!\/bin\/bash/);
  assert.match(script, /set\s+-e/);
  assert.match(script, /node\s+--test\s+tests\/\*\.test\.js/);
  assert.match(script, /kpackagetool6\s+--type\s+Plasma\/Applet\s+--list/);
  assert.match(script, /kpackagetool6\s+--type\s+Plasma\/Applet\s+--upgrade\s+\./);
  assert.match(script, /kpackagetool6\s+--type\s+Plasma\/Applet\s+--install\s+\./);
  assert.match(script, /plasmawindowed\s+org\.kde\.fatto/);
});

test('README.md exists and contains features, installation, configuration, and preview', () => {
  assert.ok(fs.existsSync('README.md'), 'README.md must exist');
  const readme = fs.readFileSync('README.md', 'utf8');

  assert.match(readme, /#\s+KDE Plasma 6 "FATTO" Desktop Widget/);
  assert.match(readme, /##\s+Features/);
  assert.match(readme, /##\s+Installation/);
  assert.match(readme, /\.\/install\.sh/);
  assert.match(readme, /##\s+Configuration/);
  assert.match(readme, /##\s+Testing & Preview/);
  assert.match(readme, /plasmawindowed\s+org\.kde\.fatto/);
  assert.match(readme, /node\s+--test\s+tests\/\*\.test\.js/);
});
