import { failure, TVError } from '../../core/tv/errors';
import { REMOTE_KEYS } from '../../core/tv/types';
import type {
  PairingChallenge,
  TVCapabilities,
  TVEvent,
  TVSession,
  TVTarget,
} from '../../core/tv/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new TVError('protocolFailure');
  return value;
}
export function string(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096)
    throw new TVError('protocolFailure');
  return value;
}
function integer(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new TVError('protocolFailure');
  return value;
}
export function target(value: unknown): TVTarget {
  const item = record(value);
  if (item.protocol !== 'android-tv-v2') throw new TVError('protocolFailure');
  const decoded: TVTarget = {
    id: string(item.id),
    protocol: item.protocol,
    name: string(item.name),
    host: string(item.host),
    port: integer(item.port, 1, 65535),
    pairingPort: integer(item.pairingPort, 1, 65535),
    serviceName: string(item.serviceName),
  };
  if (item.identity === 'authenticated') decoded.identity = 'authenticated';
  return decoded;
}
export function capabilities(value: unknown): TVCapabilities {
  const item = record(value);
  const keys = record(item.keys);
  const result: TVCapabilities = {
    keys: {},
    text: 'unverified',
    longPress: 'unverified',
  };
  for (const key of REMOTE_KEYS) {
    const status = keys[key];
    if (
      status === 'supported' ||
      status === 'unsupported' ||
      status === 'unverified'
    )
      result.keys[key] = status;
  }
  for (const key of ['text', 'longPress'] as const) {
    const status = item[key];
    if (
      status === 'supported' ||
      status === 'unsupported' ||
      status === 'unverified'
    )
      result[key] = status;
  }
  return result;
}
export function session(value: unknown): TVSession {
  const item = record(value);
  return {
    sessionId: string(item.sessionId),
    deviceId: string(item.deviceId),
    capabilities: capabilities(item.capabilities),
  };
}
export function challenge(value: unknown): PairingChallenge {
  const item = record(value);
  if (item.encoding !== 'hex' || item.length !== 6)
    throw new TVError('protocolFailure');
  const expiry = item.expiresAt;
  if (
    typeof expiry !== 'number' ||
    !Number.isFinite(expiry) ||
    expiry < Date.now() ||
    expiry > Number.MAX_SAFE_INTEGER
  )
    throw new TVError('protocolFailure');
  return {
    pairingId: string(item.pairingId),
    encoding: 'hex',
    length: 6,
    expiresAt: Math.floor(expiry),
  };
}
export function event(value: unknown): TVEvent {
  const item = record(value);
  switch (item.type) {
    case 'discoveryReady':
      return { type: item.type };
    case 'error':
      return { type: item.type, error: failure(item.error) };
    case 'deviceFound':
      return { type: item.type, target: target(item.target) };
    case 'deviceLost':
      return { type: item.type, deviceId: string(item.deviceId) };
    case 'discoveryStopped':
      return { type: item.type };
    case 'networkChanged':
      if (typeof item.available !== 'boolean')
        throw new TVError('protocolFailure');
      return { type: item.type, available: item.available };
    case 'disconnected':
      return {
        type: item.type,
        sessionId: string(item.sessionId),
        error: {
          code: 'connectionLost',
          message: new TVError('connectionLost').message,
          retryable: true,
        },
      };
    case 'capabilities':
      return {
        type: item.type,
        sessionId: string(item.sessionId),
        capabilities: capabilities(item.capabilities),
      };
    case 'inputContext':
      if (typeof item.available !== 'boolean')
        throw new TVError('protocolFailure');
      return {
        type: item.type,
        sessionId: string(item.sessionId),
        available: item.available,
      };
    case 'volume':
      if (typeof item.muted !== 'boolean') throw new TVError('protocolFailure');
      return {
        type: item.type,
        sessionId: string(item.sessionId),
        level: integer(item.level, 0, integer(item.max, 1, 10000)),
        max: integer(item.max, 1, 10000),
        muted: item.muted,
      };
    default:
      throw new TVError('protocolFailure');
  }
}
