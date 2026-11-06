import { router } from 'expo-router';
import { ArrowUpRight, ShieldCheck, Tv, Wifi } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../shared/components/Button';
import { Card, Copy, Screen } from '../shared/components/Screen';
import { useTheme } from '../shared/theme';
import { useSettingsStore } from '../store/settingsStore';

export default function Onboarding() {
  const { colors } = useTheme();
  const update = useSettingsStore((state) => state.update);
  const finish = (): void => {
    update({ onboarded: true });
    router.dismissTo('/devices');
  };
  return (
    <Screen
      title={'Your TV.\nCloser than ever.'}
      subtitle="A little less searching for the remote. A little more time for what you love."
    >
      <View style={[styles.illustration, { backgroundColor: colors.surface }]}>
        <Tv size={96} color={colors.accent} strokeWidth={1.25} />
        <View style={[styles.connection, { backgroundColor: colors.raised }]}>
          <Wifi size={22} color={colors.accent} />
          <Text style={{ color: colors.text }}>Connected by Wi-Fi</Text>
        </View>
      </View>
      <Card>
        <Wifi color={colors.accent} />
        <Copy>
          Connect your phone and Android TV or Google TV to the same Wi-Fi
          network.
        </Copy>
      </Card>
      <Card>
        <ShieldCheck color={colors.accent} />
        <Copy>
          Enter the code shown on your TV to pair. Your connection stays on your
          local network.
        </Copy>
      </Card>
      <Button
        label="Find my TV"
        onPress={finish}
        icon={<ArrowUpRight size={20} color={colors.onAccent} />}
      />
      <Button label="Skip introduction" secondary onPress={finish} />
      <Copy muted>
        Works with compatible Android TV Remote Service devices. Features vary
        by TV and application.
      </Copy>
    </Screen>
  );
}
const styles = StyleSheet.create({
  illustration: {
    minHeight: 210,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 30,
  },
});
