import { router } from 'expo-router';

import { BrandIllustration, BrandLogo } from '../shared/branding/Brand';
import { Button } from '../shared/components/Button';
import { Card, Copy, Screen } from '../shared/components/Screen';
import { useSettingsStore } from '../store/settingsStore';

export default function Onboarding() {
  const update = useSettingsStore((state) => state.update);
  const finish = (): void => {
    update({ onboarded: true });
    router.dismissTo('/devices');
  };
  return (
    <Screen
      title="Let’s connect your TV."
      subtitle="Your phone can be your remote. We’ll help you get connected."
    >
      <BrandLogo width={240} />
      <BrandIllustration kind="discovering" width={200} />
      <Card>
        <Copy>Turn on your TV. No remote? Use your TV’s own power button.</Copy>
        <Copy>
          Connect your phone and TV to the same home Wi-Fi. We’ll search for
          your TV automatically.
        </Copy>
        <Copy>If a code appears on your TV, enter it on your phone.</Copy>
      </Card>
      <Button label="Find my TV" onPress={finish} />
      <Copy muted>
        Works with compatible Android TV and Google TV devices. Available
        controls depend on your TV and the app it is showing.
      </Copy>
    </Screen>
  );
}
