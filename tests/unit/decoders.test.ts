import {
  challenge,
  event,
  record,
  session,
  target,
} from '../../src/infrastructure/android-tv/decoders';
import { television, testSession } from '../mocks/FakeTVAdapter';

test('validates native and persisted device records', () => {
  expect(target(television)).toEqual(television);
  for (const value of [
    null,
    [],
    'device',
    { ...television, port: 0 },
    { ...television, port: 65536 },
    { ...television, protocol: 'other' },
    { ...television, name: 3 },
  ])
    expect(() => target(value)).toThrow();
  expect(() => record([])).toThrow();
});
test('unknown native capability fields cannot enable controls', () => {
  const decoded = session({
    ...testSession,
    capabilities: { keys: { power: true }, text: 'invented', longPress: null },
  });
  expect(decoded.capabilities).toEqual({
    keys: {},
    text: 'unverified',
    longPress: 'unverified',
  });
});
test('validates pairing format and expiry', () => {
  const nativeExpiry = Date.now() + 10000.125;
  expect(
    challenge({
      pairingId: 'id',
      encoding: 'hex',
      length: 6,
      expiresAt: nativeExpiry,
    }).expiresAt,
  ).toBe(Math.floor(nativeExpiry));
  for (const expiresAt of [
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    'future',
  ])
    expect(() =>
      challenge({ pairingId: 'id', encoding: 'hex', length: 6, expiresAt }),
    ).toThrow();
  expect(
    challenge({
      pairingId: 'id',
      encoding: 'hex',
      length: 6,
      expiresAt: Date.now() + 10000,
    }).length,
  ).toBe(6);
  expect(() =>
    challenge({
      pairingId: 'id',
      encoding: 'numeric',
      length: 6,
      expiresAt: Date.now() + 10000,
    }),
  ).toThrow();
  expect(() =>
    challenge({ pairingId: 'id', encoding: 'hex', length: 6, expiresAt: 0 }),
  ).toThrow();
});
test('maps native events and redacts native errors', () => {
  expect(event({ type: 'deviceFound', target: television })).toEqual({
    type: 'deviceFound',
    target: television,
  });
  expect(event({ type: 'deviceLost', deviceId: television.id })).toMatchObject({
    deviceId: television.id,
  });
  expect(event({ type: 'discoveryStopped' })).toEqual({
    type: 'discoveryStopped',
  });
  expect(
    event({
      type: 'error',
      error: { code: 'permissionDenied', message: 'secret code' },
    }),
  ).toMatchObject({ error: { code: 'permissionDenied' } });
  expect(
    JSON.stringify(
      event({
        type: 'error',
        error: { code: 'permissionDenied', message: 'secret code' },
      }),
    ),
  ).not.toContain('secret code');
  expect(() => event({ type: 'unrecognized' })).toThrow();
});
test('bounds TV-originated volume and validates booleans', () => {
  expect(() =>
    event({
      type: 'volume',
      sessionId: 'id',
      level: 11,
      max: 10,
      muted: false,
    }),
  ).toThrow();
  expect(
    event({
      type: 'volume',
      sessionId: 'id',
      level: 10,
      max: 100,
      muted: false,
    }),
  ).toMatchObject({ level: 10 });
  expect(() =>
    event({
      type: 'volume',
      sessionId: 'id',
      level: -1,
      max: 100,
      muted: false,
    }),
  ).toThrow();
  expect(() => event({ type: 'networkChanged', available: 'yes' })).toThrow();
  expect(() =>
    event({ type: 'inputContext', sessionId: 'id', available: null }),
  ).toThrow();
});
