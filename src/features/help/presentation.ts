import type { TVFailure, TVErrorCode } from '../../core/tv/types';

const messages: Record<TVErrorCode, string> = {
  invalidAddress:
    'Enter four numbers separated by dots, like 192.168.1.25. Use your TV’s home-network address.',
  networkUnavailable:
    'Connect your phone to Wi-Fi and check that your TV is on the same home network.',
  permissionDenied:
    'Allow the app to find devices on your network in your phone’s settings.',
  notFound:
    'We couldn’t reach your TV. Check that it is on and connected to your home network.',
  discoveryTimeout:
    'We couldn’t find your TV. Check that it is on and try searching again.',
  pairingRejected:
    'That code did not work. Start again and enter the new code shown on your TV.',
  pairingTimeout: 'The code expired. Start again to get a new code on your TV.',
  invalidCode:
    'Enter the six characters shown on your TV, using numbers 0–9 and letters A–F.',
  authenticationFailed:
    'Your TV needs to pair with this phone again. Choose Pair again and use the code on your TV.',
  identityChanged:
    'We need to verify this TV again. Choose Pair again and check the code on its screen.',
  connectionLost:
    'Connection lost. Check that your TV is on and your phone is on the same home Wi-Fi.',
  connectionTimeout:
    'Your TV did not respond. Check that it is turned on and try again.',
  commandTimeout:
    'Your TV did not receive that control in time. Please try again.',
  unsupportedCommand:
    'This control is not available for your TV or the app it is showing.',
  nativeUnavailable:
    'This installation cannot connect to TVs. Install the full app to use your remote.',
  cancelled:
    'Connection cancelled. You can choose a TV whenever you are ready.',
  queueFull: 'Please release the control for a moment, then try again.',
  protocolFailure:
    'We couldn’t complete the connection. Check your TV and try connecting again.',
  storageFailure: 'We couldn’t save your TV securely. Please try again.',
};
export function userMessage(error: TVFailure): string {
  return messages[error.code];
}
