import type {
  CommandReceipt,
  PairingChallenge,
  RemoteCommand,
  TVEvent,
  TVSession,
  TVTarget,
} from './types';

export interface TVAdapter {
  subscribe(listener: (event: TVEvent) => void): () => void;
  startDiscovery(signal: AbortSignal): Promise<void>;
  stopDiscovery(): Promise<void>;
  beginPairing(
    target: TVTarget,
    signal: AbortSignal,
  ): Promise<PairingChallenge>;
  submitPairingCode(pairingId: string, code: string): Promise<TVTarget>;
  cancelPairing(pairingId: string): Promise<void>;
  connect(target: TVTarget, signal: AbortSignal): Promise<TVSession>;
  send(sessionId: string, command: RemoteCommand): Promise<CommandReceipt>;
  releaseKeys(sessionId: string): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
  forgetCredentials(deviceId: string): Promise<void>;
}
