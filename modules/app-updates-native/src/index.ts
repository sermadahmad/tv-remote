import { NativeModule, requireOptionalNativeModule } from 'expo';

export declare class NativeUpdatesBridge extends NativeModule<{
  onUpdateState: (event: unknown) => void;
}> {
  check(): Promise<unknown>;
  start(): Promise<unknown>;
  complete(): Promise<void>;
}
export function getUpdatesBridge(): NativeUpdatesBridge | null {
  return requireOptionalNativeModule<NativeUpdatesBridge>('AppUpdatesNative');
}
