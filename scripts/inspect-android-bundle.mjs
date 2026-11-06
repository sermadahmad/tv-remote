import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [bundlePath, bundletoolPath] = process.argv.slice(2);
assert(
  bundlePath && bundletoolPath,
  'Usage: node scripts/inspect-android-bundle.mjs <production.aab> <bundletool.jar>',
);
const identity = JSON.parse(
  readFileSync(
    new URL('../src/core/buildIdentity.json', import.meta.url),
    'utf8',
  ),
);
const run = (command, args) =>
  execFileSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
const dump = (xpath) =>
  run('java', [
    '-jar',
    bundletoolPath,
    'dump',
    'manifest',
    `--bundle=${bundlePath}`,
    `--xpath=${xpath}`,
  ]);
run('java', ['-jar', bundletoolPath, 'validate', `--bundle=${bundlePath}`]);
const packageName = dump('/manifest/@package');
const versionCode = Number(dump('/manifest/@android:versionCode'));
const minSdk = Number(dump('/manifest/uses-sdk/@android:minSdkVersion'));
const targetSdk = Number(dump('/manifest/uses-sdk/@android:targetSdkVersion'));
const compileSdk = Number(dump('/manifest/@android:compileSdkVersion'));
assert.equal(
  packageName,
  identity.applicationId,
  'Only the production application may be submitted',
);
assert(
  Number.isSafeInteger(versionCode) && versionCode > 0,
  'Invalid version code',
);
assert.equal(minSdk, 24);
assert.equal(targetSdk, 36);
assert.equal(compileSdk, 37);
assert.equal(dump('/manifest/application/@android:allowBackup'), 'false');
const packagedConfig = JSON.parse(
  run('unzip', ['-p', bundlePath, 'base/assets/app.config']),
);
assert.equal(
  packagedConfig.extra.uiTest,
  false,
  'Simulated configuration must never ship to Play',
);
assert.equal(packagedConfig.android.package, identity.applicationId);
assert.equal(packagedConfig.extra.eas.projectId, identity.projectId);
const verified = run('jarsigner', [
  '-J-Duser.language=en',
  '-verify',
  bundlePath,
]);
assert(verified.includes('jar verified.'), 'AAB signature verification failed');
const certificate = run('keytool', [
  '-J-Duser.language=en',
  '-printcert',
  '-jarfile',
  bundlePath,
]);
assert(
  !certificate.includes('CN=Android Debug') &&
    !certificate.includes('CN=AndroidDebug'),
  'Debug signing is not accepted for store uploads',
);
const certificateSha256 = certificate.match(/SHA256:\s*([A-F0-9:]+)/)?.[1];
assert(certificateSha256, 'Signing certificate SHA-256 is missing');
if (process.env.EXPECTED_UPLOAD_CERT_SHA256)
  assert.equal(
    certificateSha256.replaceAll(':', '').toLowerCase(),
    process.env.EXPECTED_UPLOAD_CERT_SHA256.replaceAll(':', '').toLowerCase(),
  );
const manifest = run('java', [
  '-jar',
  bundletoolPath,
  'dump',
  'manifest',
  `--bundle=${bundlePath}`,
]);
const permissions = [
  ...manifest.matchAll(/<uses-permission\b[^>]*android:name="([^"]+)"/g),
].map((match) => match[1]);
for (const forbidden of [
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.USE_BIOMETRIC',
  'android.permission.USE_FINGERPRINT',
  'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
])
  assert(
    !permissions.includes(forbidden),
    `Unexpected permission: ${forbidden}`,
  );
console.log(
  JSON.stringify(
    {
      packageName,
      versionCode,
      minSdk,
      targetSdk,
      compileSdk,
      fixtureBuild: false,
      signature: 'verified',
      certificateSha256,
      permissions,
    },
    null,
    2,
  ),
);
