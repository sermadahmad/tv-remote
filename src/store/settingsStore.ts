import { create } from 'zustand';

import type { Preferences } from '../core/storage/contracts';
import { readPreferences, writePreferences } from '../infrastructure/storage';

interface SettingsStore extends Preferences {
  update: (patch: Partial<Preferences>) => void;
}
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...readPreferences(),
  update(patch) {
    const next = {
      theme: get().theme,
      haptics: get().haptics,
      onboarded: get().onboarded,
      ...patch,
    };
    writePreferences(next);
    set(next);
  },
}));
