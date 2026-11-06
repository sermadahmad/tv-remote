import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getConfig } = require('expo/config');
const identity = JSON.parse(
  readFileSync(
    new URL('../src/core/buildIdentity.json', import.meta.url),
    'utf8',
  ),
);
const eas = JSON.parse(
  readFileSync(new URL('../eas.json', import.meta.url), 'utf8'),
);
const originalVariant = process.env.APP_VARIANT;
const originalTarget = process.env.ANDROID_TARGET_SDK;
try {
  process.env.ANDROID_TARGET_SDK = '36';
  for (const variant of ['production', 'ui-test', 'development']) {
    process.env.APP_VARIANT = variant;
    const { exp } = getConfig(process.cwd());
    const testing = variant === 'ui-test';
    const development = variant === 'development';
    const applicationId = testing
      ? identity.uiTestApplicationId
      : development
        ? identity.developmentApplicationId
        : identity.applicationId;
    assert.equal(exp.owner, identity.owner);
    assert.equal(exp.slug, identity.slug);
    assert.equal(exp.extra.eas.projectId, identity.projectId);
    assert.equal(exp.android.package, applicationId);
    assert.equal(exp.ios.bundleIdentifier, applicationId);
    assert.equal(exp.extra.uiTest, testing);
    for (const permission of [
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
        exp.android.blockedPermissions.includes(permission),
        `Unused permission must be blocked: ${permission}`,
      );
    assert.equal(
      exp.scheme,
      testing
        ? 'universaltvremote-uitest'
        : development
          ? 'universaltvremote-dev'
          : 'universaltvremote',
    );
    const devClient = exp.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-dev-client',
    );
    assert.equal(devClient?.[1]?.addGeneratedScheme, false);
    if (!testing && !development)
      assert.equal(devClient[1].defaultLaunchURL, undefined);
  }
  assert.notEqual(identity.applicationId, identity.uiTestApplicationId);
  assert.equal(eas.cli.appVersionSource, 'remote');
  assert.equal(eas.build.production.autoIncrement, true);
  assert.equal(eas.build.production.env.APP_VARIANT, 'production');
  assert.equal(eas.build.production.env.ANDROID_TARGET_SDK, '36');
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.submit.internal.android.track, 'internal');
  assert.equal(eas.submit.internal.android.releaseStatus, 'completed');
  console.log(
    'Verified linked Expo identity, isolated test variant, signed-build profile and internal-only submission configuration.',
  );
} finally {
  if (originalVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = originalVariant;
  if (originalTarget === undefined) delete process.env.ANDROID_TARGET_SDK;
  else process.env.ANDROID_TARGET_SDK = originalTarget;
}
