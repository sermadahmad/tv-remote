import * as Application from 'expo-application';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Linking, Switch, View } from 'react-native';

import { report } from '../../features/runtime';
import { Button } from '../../shared/components/Button';
import { Card, Copy, Screen } from '../../shared/components/Screen';
import { useTheme } from '../../shared/theme';
import { UpdatesSettings } from '../../features/app-updates/UpdateUI';
import { BrandLogo } from '../../shared/branding/Brand';
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
            trackColor={{ true: colors.accentText, false: colors.line }}
            thumbColor={settings.haptics ? colors.onAccent : colors.text}
          />
        </View>
      </Card>
      <Button
        label="Manage saved TVs"
        secondary
        onPress={() => router.navigate('/saved')}
      />
      <Card>
        <ShieldCheck color={colors.accentText} />
        <Copy>Private, by design</Copy>
        <Copy muted>
          TV control happens on your local network. No app account, analytics,
          or advertising is used. Your saved TV connection is protected by your
          phone.
        </Copy>
      </Card>
      <Card>
        <Copy>Troubleshooting</Copy>
        <Copy muted>
          No remote, no TV found, or trouble connecting? We’ll walk you through
          a few simple checks.
        </Copy>
        <Button
          label="Connection help"
          secondary
          onPress={() => router.push('/help')}
        />
        <Button
          label="Open app permissions"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(report);
          }}
        />
      </Card>
      <UpdatesSettings />
      <Card>
        <BrandLogo width={260} />
        <Copy>About Universal TV Remote</Copy>
        <Copy muted>
          Version {Application.nativeApplicationVersion ?? '0.1.0'}
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
