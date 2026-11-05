import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { TVTarget } from '../../../src/core/tv/types';

export declare class NativeTVBridge extends NativeModule<{
  onTVEvent: (event: unknown) => void;
}> {
  ensureLocalNetworkPermission(): Promise<void>;
  startDiscovery(operationId: string): Promise<void>;
  stopDiscovery(): Promise<void>;
  beginPairing(operationId: string, target: TVTarget): Promise<unknown>;
  submitPairingCode(pairingId: string, code: string): Promise<unknown>;
  cancelPairing(pairingId: string): Promise<void>;
  connect(
    operationId: string,
    target: TVTarget,
    credentialRef: string,
  ): Promise<unknown>;
  cancelOperation(operationId: string): Promise<void>;
  send(sessionId: string, commandId: string, command: string): Promise<void>;
  releaseKeys(sessionId: string): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
  forgetCredentials(deviceId: string): Promise<void>;
}

export function getNativeBridge(): NativeTVBridge | null {
  return requireOptionalNativeModule<NativeTVBridge>('TVRemoteNative');
}
