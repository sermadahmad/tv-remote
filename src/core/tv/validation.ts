import { TVError } from './errors';
import { REMOTE_KEYS } from './types';
import type { RemoteCommand, TVCapabilities, TVTarget } from './types';

export function pairingCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(normalized)) throw new TVError('invalidCode');
  return normalized;
}

export function privateIPv4(value: string): string {
  const input = value.trim();
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(input))
    throw new TVError('invalidAddress');
  const octets = input.split('.').map(Number);
  if (
    octets.some(
      (part, index) => part > 255 || String(part) !== input.split('.')[index],
    )
  )
    throw new TVError('invalidAddress');
  const [a, b] = octets;
  if (!(
    a === 10 ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  ))
    throw new TVError('invalidAddress');
  return input;
}

export function manualTarget(address: string): TVTarget {
  const host = privateIPv4(address);
  return {
    id: `manual:${host}`,
    protocol: 'android-tv-v2',
    name: 'Android TV',
    host,
    port: 6466,
    pairingPort: 6467,
    serviceName: '',
  };
}

export function validateCommand(
  command: RemoteCommand,
  capabilities: TVCapabilities,
): void {
  if (command.type === 'text') {
    if (capabilities.text !== 'supported')
      throw new TVError('unsupportedCommand');
    if (!command.text || new TextEncoder().encode(command.text).length > 4096)
      throw new TVError('unsupportedCommand');
    return;
  }
  if (
    !REMOTE_KEYS.includes(command.key) ||
    capabilities.keys[command.key] !== 'supported'
  )
    throw new TVError('unsupportedCommand');
  if (command.action !== 'tap' && capabilities.longPress !== 'supported')
    throw new TVError('unsupportedCommand');
}
