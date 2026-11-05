import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (process.platform !== 'darwin')
  throw new Error('iOS credential tests require macOS and Xcode.');
const listing = JSON.parse(
  execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], {
    encoding: 'utf8',
  }),
);
const phones = Object.values(listing.devices)
  .flat()
  .filter((device) => device.name.startsWith('iPhone'));
const simulator =
  process.env.SIMULATOR_ID ??
  (phones.find((device) => device.state === 'Booted') ?? phones[0])?.udid;
if (!simulator)
  throw new Error('Install an iOS simulator runtime with an iPhone device.');
const host = mkdtempSync(path.join(tmpdir(), 'tvremote-test-host-'));
execFileSync('ruby', ['scripts/create-ios-test-host.rb', host], {
  stdio: 'inherit',
});
execFileSync(
  'xcodebuild',
  [
    '-project',
    path.join(host, 'NativeCredentialTests.xcodeproj'),
    '-scheme',
    'NativeCredentialTests',
    '-destination',
    `platform=iOS Simulator,id=${simulator}`,
    '-derivedDataPath',
    process.env.TVREMOTE_TEST_DERIVED_DATA ??
      path.join(tmpdir(), 'tvremote-credential-build'),
    '-jobs',
    '4',
    '-parallel-testing-enabled',
    'NO',
    'test',
  ],
  { stdio: 'inherit' },
);
