import type { TVErrorCode, TVFailure } from './types';

const messages: Record<TVErrorCode, string> = {
  invalidAddress: 'Enter a private local IP address, such as 192.168.1.25.',
  networkUnavailable: 'Connect your phone and TV to the same Wi-Fi network.',
  permissionDenied:
    'Allow local network access in Settings to find and connect to your TV.',
  notFound:
    'This TV is unavailable. Check that it is on and connected to your network.',
  discoveryTimeout:
    'No TVs found. Check the network or enter the TV’s IP address.',
  pairingRejected:
    'The TV rejected pairing. Start again and enter the code shown on the TV.',
  pairingTimeout: 'Pairing expired. Start again to get a new code.',
  invalidCode: 'Enter the six characters shown on the TV, using 0–9 and A–F.',
  authenticationFailed:
    'Pair this TV again to renew its connection credentials.',
  identityChanged: 'The TV’s identity changed. Pair again to verify it.',
  connectionLost: 'The connection was interrupted.',
  connectionTimeout: 'The TV did not respond. Check that it is on.',
  commandTimeout: 'The command could not be sent in time. Try again.',
  unsupportedCommand:
    'This control is not supported by the current connection.',
  nativeUnavailable:
    'Install a development or release build to use TV connections. Expo Go is not supported.',
  cancelled: 'The operation was cancelled.',
  queueFull:
    'Controls are arriving too quickly. Release the button and try again.',
  protocolFailure: 'The TV returned an unexpected response. Try reconnecting.',
  storageFailure: 'Device details could not be saved securely. Try again.',
};

const transient = new Set<TVErrorCode>([
  'notFound',
  'connectionLost',
  'connectionTimeout',
  'networkUnavailable',
]);

export class TVError extends Error implements TVFailure {
  readonly code: TVErrorCode;
  readonly retryable: boolean;

  constructor(code: TVErrorCode) {
    super(messages[code]);
    this.name = 'TVError';
    this.code = code;
    this.retryable = transient.has(code);
  }
}

export function failure(error: unknown): TVFailure {
  if (error instanceof TVError)
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const normalized = error.code.replace(/^ERR_/, '');
    if (Object.hasOwn(messages, normalized)) {
      const code = Object.keys(messages).find(
        (key): key is TVErrorCode => key === normalized,
      );
      if (code) return failure(new TVError(code));
    }
  }
  return failure(new TVError('protocolFailure'));
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new TVError('cancelled');
}
