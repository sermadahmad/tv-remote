jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const values = new Map<string, unknown>();
    return {
      getString: (key: string) => values.get(key),
      getBoolean: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
      remove: (key: string) => values.delete(key),
    };
  },
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));
