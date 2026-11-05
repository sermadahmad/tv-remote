import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const manifest = require.resolve('expo-modules-autolinking/package.json');
const { bin } = JSON.parse(readFileSync(manifest, 'utf8'));
const cli = path.join(
  path.dirname(manifest),
  typeof bin === 'string' ? bin : bin['expo-modules-autolinking'],
);

for (const platform of ['apple', 'android']) {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, 'resolve', '--platform', platform, '--json'],
      { encoding: 'utf8' },
    ),
  );
  const module = result.modules.find(
    (entry) => entry.packageName === 'tv-remote-native',
  );
  if (!module || !JSON.stringify(module).includes('TVRemoteNativeModule')) {
    throw new Error(
      `The TV remote native module is not registered for ${platform}.`,
    );
  }
  if (
    platform === 'apple' &&
    !module.pods.some((pod) => pod.podName === 'TVRemoteNative')
  ) {
    throw new Error('The iOS TV remote podspec was not resolved.');
  }
  process.stdout.write(`TV remote native registration verified: ${platform}\n`);
}
