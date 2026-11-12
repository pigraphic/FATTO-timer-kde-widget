import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('metadata.json exists and is valid Plasma 6 metadata', () => {
  assert.ok(fs.existsSync('metadata.json'), 'metadata.json must exist');
  const metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));

  assert.equal(metadata.KPackageStructure, 'Plasma/Applet');
  assert.equal(metadata['X-Plasma-API-Minimum-Version'], '6.0');
  assert.equal(metadata.KPlugin.Id, 'org.kde.fatto');
  assert.ok(metadata.KPlugin.Name, 'Plugin must have a Name');
  assert.ok(metadata.KPlugin.Icon, 'Plugin must have an Icon');
});

test('contents/config/main.xml defines required KConfigXT entries', () => {
  assert.ok(fs.existsSync('contents/config/main.xml'), 'main.xml must exist');
  const xml = fs.readFileSync('contents/config/main.xml', 'utf8');

  assert.match(xml, /entry name="serverUrl"/);
  assert.match(xml, /entry name="username"/);
  assert.match(xml, /entry name="password"/);
  assert.match(xml, /entry name="pollInterval"/);
});

test('contents/config/main.xml defines selectedWorkspace entry', () => {
  const xml = fs.readFileSync('contents/config/main.xml', 'utf8');
  assert.match(xml, /entry name="selectedWorkspace"/);
});

test('contents/config/config.qml registers General config category', () => {
  assert.ok(fs.existsSync('contents/config/config.qml'), 'config.qml must exist');
  const qml = fs.readFileSync('contents/config/config.qml', 'utf8');

  assert.match(qml, /ConfigModel/);
  assert.match(qml, /ConfigCategory/);
  assert.match(qml, /ConfigGeneral\.qml/);
});
