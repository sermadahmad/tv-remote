import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(
  root,
  'modules/tv-remote-native/ios/Core/Sources/TVRemoteCore/Generated',
);
const protoc = process.env.TV_PROTOC ?? 'protoc';
const plugin = process.env.TV_PROTOC_GEN_SWIFT ?? 'protoc-gen-swift';
for (const [binary, args, expected] of [
  [protoc, ['--version'], '36.2'],
  [plugin, ['--version'], '1.39.0'],
]) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout.includes(expected))
    throw new Error(
      `Install the pinned compiler ${binary} (${expected}) before regenerating schemas.`,
    );
}
mkdirSync(output, { recursive: true });
const result = spawnSync(
  protoc,
  [
    `--proto_path=${resolve(root, 'modules/tv-remote-native/proto')}`,
    `--plugin=protoc-gen-swift=${plugin}`,
    `--swift_out=${output}`,
    '--swift_opt=Visibility=Internal',
    'polo.proto',
    'remotemessage.proto',
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
