import { Redirect } from 'expo-router';

import { useSettingsStore } from '../store/settingsStore';

export default function Index() {
  const onboarded = useSettingsStore((state) => state.onboarded);
  return <Redirect href={onboarded ? '/devices' : '/onboarding'} />;
}
