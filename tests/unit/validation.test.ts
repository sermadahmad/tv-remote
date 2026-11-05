import { failure, throwIfAborted, TVError } from '../../src/core/tv/errors';
import {
  manualTarget,
  pairingCode,
  privateIPv4,
  validateCommand,
} from '../../src/core/tv/validation';
import { testSession } from '../mocks/FakeTVAdapter';

describe('pairing code', () => {
  test.each(['ABCDEF', '123456', 'a1b2c3', ' ab12ef '])(
    'accepts hexadecimal input %s',
    (code) => expect(pairingCode(code)).toBe(code.trim().toUpperCase()),
  );
  test.each(['12345', '1234567', 'G12345', '１２３４５６', '12 345', ''])(
    'rejects invalid input %s',
    (code) => expect(() => pairingCode(code)).toThrow(TVError),
  );
});
describe('manual LAN connection', () => {
  test.each(['10.0.0.1', '172.16.1.1', '172.31.255.254', '192.168.0.2'])(
    'accepts private address %s',
    (host) => expect(privateIPv4(host)).toBe(host),
  );
  test.each([
    '8.8.8.8',
    '127.0.0.1',
    'localhost',
    'https://192.168.1.1',
    '172.15.0.1',
    '172.32.0.1',
    '192.168.999.1',
    '192.168.01.1',
    '224.0.0.1',
    '0.0.0.0',
    '192.168.1.1:6466',
    '192.168.1.1/24',
  ])('rejects unsafe address %s', (host) =>
    expect(() => privateIPv4(host)).toThrow(TVError),
  );
  test('uses protocol defaults without scanning', () =>
    expect(manualTarget('10.0.0.2')).toMatchObject({
      host: '10.0.0.2',
      port: 6466,
      pairingPort: 6467,
      serviceName: '',
    }));
});
describe('capability validation', () => {
  test('allows supported keys and long-press semantics', () => {
    expect(() =>
      validateCommand(
        { type: 'key', key: 'up', action: 'press' },
        testSession.capabilities,
      ),
    ).not.toThrow();
  });
  test('rejects unknown capability', () =>
    expect(() =>
      validateCommand(
        { type: 'key', key: 'power', action: 'tap' },
        testSession.capabilities,
      ),
    ).toThrow(TVError));
  test('rejects unsupported long presses', () =>
    expect(() =>
      validateCommand(
        { type: 'key', key: 'up', action: 'press' },
        { ...testSession.capabilities, longPress: 'unsupported' },
      ),
    ).toThrow(TVError));
  test('rejects unverified text', () =>
    expect(() =>
      validateCommand(
        { type: 'text', text: 'hello' },
        testSession.capabilities,
      ),
    ).toThrow(TVError));
  test('allows validated Unicode text and rejects empty or oversized text', () => {
    const capabilities = {
      ...testSession.capabilities,
      text: 'supported' as const,
    };
    expect(() =>
      validateCommand({ type: 'text', text: '你好 👋' }, capabilities),
    ).not.toThrow();
    for (const text of ['', 'x'.repeat(4097)])
      expect(() =>
        validateCommand({ type: 'text', text }, capabilities),
      ).toThrow(TVError);
  });
});
describe('safe failures', () => {
  test('redacts unknown error messages and maps native codes', () => {
    expect(failure(new Error('sensitive input')).message).not.toContain(
      'sensitive',
    );
    expect(failure({ code: 'ERR_invalidCode', message: 'secret' }).code).toBe(
      'invalidCode',
    );
    expect(failure({ code: 'not-a-code' }).code).toBe('protocolFailure');
    expect(failure(new TVError('identityChanged')).retryable).toBe(false);
    expect(failure(new TVError('connectionLost')).retryable).toBe(true);
  });
  test('honors cancellation', () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(TVError);
  });
});
