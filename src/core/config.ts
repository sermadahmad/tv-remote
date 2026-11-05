export const CONNECTION_TIMEOUT_MS = 10_000;
export const DISCOVERY_TIMEOUT_MS = 15_000;
export const RECONNECT_DELAYS_MS = [
  1_000, 2_000, 4_000, 8_000, 15_000,
] as const;
export const PAIRING_TTL_MS = 120_000;
