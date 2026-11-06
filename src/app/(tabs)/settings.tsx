import * as Application from 'expo-application';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Linking, Switch, View } from 'react-native';

import { report } from '../../features/runtime';
import { Button } from '../../shared/components/Button';
import { Card, Copy, Screen } from '../../shared/components/Screen';
import { useTheme } from '../../shared/theme';
import { useSettingsStore } from '../../store/settingsStore';

export default function Settings() {
  const { colors } = useTheme();
  const settings = useSettingsStore();
  return (
    <Screen
      tabbed
      title="Just the way you like."
      subtitle="A few thoughtful adjustments."
    >
      <Card>
        <Copy>Appearance</Copy>
        {(['system', 'light', 'dark'] as const).map((theme) => (
          <Button
            key={theme}
            label={`${theme === 'system' ? 'Match system' : theme === 'light' ? 'Light' : 'Dark'}${settings.theme === theme ? ' · Selected' : ''}`}
            secondary={settings.theme !== theme}
            onPress={() => settings.update({ theme })}
          />
        ))}
      </Card>
      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Copy>Haptic feedback</Copy>
          <Switch
            accessibilityLabel="Haptic feedback"
            hitSlop={12}
            value={settings.haptics}
            onValueChange={(haptics) => settings.update({ haptics })}
            trackColor={{ true: colors.accent }}
          />
        </View>
      </Card>
      <Button
        label="Manage saved TVs"
        secondary
        onPress={() => router.navigate('/saved')}
      />
      <Card>
        <ShieldCheck color={colors.accent} />
        <Copy>Private, by design</Copy>
        <Copy muted>
          TV control happens on your local network. No account, analytics,
          advertising, or cloud service is used. Pairing keys stay in your
          phone’s protected native storage.
        </Copy>
      </Card>
      <Card>
        <Copy>Troubleshooting</Copy>
        <Copy muted>
          Keep both devices on the same network. Guest Wi-Fi, VPNs, and router
          isolation can block discovery. Try entering your TV’s IP address. A TV
          in standby may stop accepting network connections.
        </Copy>
        <Button
          label="Open app permissions"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(report);
          }}
        />
      </Card>
      <Card>
        <Copy>About Universal TV Remote</Copy>
        <Copy muted>
          Version {Application.nativeApplicationVersion ?? '0.1.0'} · Android TV
          Remote v2
        </Copy>
        <Copy muted>
          TV text input is unavailable. Control support depends on your TV’s
          model, firmware and active app.
        </Copy>
        <Button
          label="Read introduction again"
          secondary
          onPress={() => router.push('/onboarding')}
        />
      </Card>
    </Screen>
  );
}
