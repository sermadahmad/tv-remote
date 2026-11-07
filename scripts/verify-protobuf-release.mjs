import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const mappingPath =
  process.argv.find((arg, i) => i > 1 && !arg.startsWith('--')) ??
  'android/app/build/outputs/mapping/release/mapping.txt';
const mapping = readFileSync(mappingPath, 'utf8').split('\n');
const seeds = readFileSync(
  join(dirname(mappingPath), 'seeds.txt'),
  'utf8',
).split('\n');
const roots = [
  [
    'com.google.polo.wire.protobuf.PoloProto$OuterMessage',
    'com/google/polo/wire/protobuf/PoloProto.java',
    'OuterMessage',
  ],
  [
    'remote.Remotemessage$RemoteMessage',
    'remote/Remotemessage.java',
    'RemoteMessage',
  ],
];
for (const [name, file, message] of roots) {
  const source = readFileSync(
    `modules/tv-remote-native/android/build/generated/sources/proto/release/java/${file}`,
    'utf8',
  );
  const start = source.search(
    new RegExp(`public\\s+static\\s+final\\s+class\\s+${message}\\s+extends`),
  );
  assert(start >= 0, `Generated ${message} source not found`);
  const body = source
    .slice(start)
    .split(/public\s+static\s+final\s+class\s+Builder/)[0];
  const fields = [
    ...body.matchAll(
      /^\s*private\s+(?:volatile\s+)?[\w.$<>?,\[\] ]+\s+(\w+_)\s*[=;]/gm,
    ),
  ].map((match) => match[1]);
  assert(fields.length > 1, `No generated schema fields found for ${message}`);
  const at = mapping.findIndex((line) => line.startsWith(`${name} -> `));
  assert(at >= 0, `Minified mapping is missing ${name}`);
  assert.equal(
    mapping[at],
    `${name} -> ${name}:`,
    `${message} was renamed by R8`,
  );
  const members = [];
  for (
    let i = at + 1;
    i < mapping.length &&
    (/^\s/.test(mapping[i]) || mapping[i].startsWith('#'));
    i++
  )
    members.push(mapping[i]);
  for (const field of fields) {
    // R8 can omit identity field mappings. Its seeds report identifies members
    // retained by keep rules; any explicit mapping must also preserve the name.
    assert(
      seeds.some(
        (line) => line.startsWith(`${name}: `) && line.endsWith(` ${field}`),
      ),
      `${name}.${field} is not retained by a keep rule`,
    );
    assert(
      !members.some(
        (line) =>
          line.includes(` ${field} -> `) && !line.endsWith(` -> ${field}`),
      ),
      `${name}.${field} was renamed; Java Lite schema reflection will fail`,
    );
  }
  process.stdout.write(
    `Verified minified ${message}: ${fields.length} schema fields retained by name.\n`,
  );
}
