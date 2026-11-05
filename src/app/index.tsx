import { router } from 'expo-router';
import { Button } from '../shared/components/Button';
import { Copy, Screen } from '../shared/components/Screen';

export default function Foundation() {
  return (
    <Screen title="Universal TV Remote" subtitle="Application foundation">
      <Copy>
        The native protocol and full experience are scheduled for the next
        milestones.
      </Copy>
      <Button
        label="Device discovery"
        onPress={() => router.push('/devices')}
      />
      <Button
        label="Introduction"
        secondary
        onPress={() => router.push('/onboarding')}
      />
    </Screen>
  );
}
