export const REMOTE_KEYS = [
  'up',
  'down',
  'left',
  'right',
  'select',
  'back',
  'home',
  'volumeUp',
  'volumeDown',
  'mute',
  'power',
  'playPause',
  'play',
  'pause',
  'next',
  'previous',
  'fastForward',
  'rewind',
] as const;

export type RemoteKey = (typeof REMOTE_KEYS)[number];
export type CapabilityStatus = 'supported' | 'unsupported' | 'unverified';
export type TVCapabilities = {
  keys: Partial<Record<RemoteKey, CapabilityStatus>>;
  text: CapabilityStatus;
  longPress: CapabilityStatus;
};

export interface TVTarget {
  id: string;
  identity?: 'authenticated';
  protocol: 'android-tv-v2';
  name: string;
  host: string;
  port: number;
  pairingPort: number;
  serviceName: string;
}

export interface SavedDevice {
  target: TVTarget;
  nickname: string;
  lastConnectedAt: number;
}

export interface PairingChallenge {
  pairingId: string;
  encoding: 'hex';
  length: 6;
  expiresAt: number;
}

export interface TVSession {
  sessionId: string;
  deviceId: string;
  capabilities: TVCapabilities;
}

export type RemoteCommand =
  | { type: 'key'; key: RemoteKey; action: 'tap' | 'press' | 'release' }
  | { type: 'text'; text: string };

export interface CommandReceipt {
  commandId: string;
  status: 'written';
  confirmation: 'unavailable';
}

export type TVErrorCode =
  | 'networkUnavailable'
  | 'invalidAddress'
  | 'permissionDenied'
  | 'notFound'
  | 'discoveryTimeout'
  | 'pairingRejected'
  | 'pairingTimeout'
  | 'invalidCode'
  | 'authenticationFailed'
  | 'identityChanged'
  | 'connectionLost'
  | 'connectionTimeout'
  | 'commandTimeout'
  | 'unsupportedCommand'
  | 'nativeUnavailable'
  | 'cancelled'
  | 'queueFull'
  | 'protocolFailure'
  | 'storageFailure';

export interface TVFailure {
  code: TVErrorCode;
  message: string;
  retryable: boolean;
}

export type TVEvent =
  | { type: 'discoveryReady' }
  | { type: 'deviceFound'; target: TVTarget }
  | { type: 'deviceLost'; deviceId: string }
  | { type: 'discoveryStopped' }
  | { type: 'networkChanged'; available: boolean }
  | { type: 'disconnected'; sessionId: string; error: TVFailure }
  | { type: 'capabilities'; sessionId: string; capabilities: TVCapabilities }
  | {
      type: 'volume';
      sessionId: string;
      level: number;
      max: number;
      muted: boolean;
    }
  | { type: 'inputContext'; sessionId: string; available: boolean }
  | { type: 'error'; error: TVFailure };

export type ConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting'; deviceId: string; attempt: number }
  | { status: 'pairing'; deviceId: string; challenge: PairingChallenge }
  | { status: 'connected'; session: TVSession }
  | { status: 'reconnecting'; deviceId: string; attempt: number }
  | { status: 'error'; deviceId: string | null; error: TVFailure };

export type DiscoveryState = 'idle' | 'searching' | 'found' | 'empty' | 'error';
