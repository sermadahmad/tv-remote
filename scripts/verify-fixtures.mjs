import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const reference = readFileSync(
  resolve(root, 'tests/fixtures/pairing.json'),
  'utf8',
);
for (const file of [
  'modules/tv-remote-native/android/src/test/resources/pairing.json',
  'modules/tv-remote-native/ios/Core/Tests/TVRemoteCoreTests/Fixtures/pairing.json',
]) {
  if (readFileSync(resolve(root, file), 'utf8') !== reference)
    throw new Error(`Protocol fixture drift: ${file}`);
}
