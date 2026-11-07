import { router } from 'expo-router';
import { ArrowRight, RefreshCw, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { failure } from '../../core/tv/errors';
import type { TVTarget } from '../../core/tv/types';
import { manualTarget } from '../../core/tv/validation';
import { useDiscovery } from '../../features/discovery/useDiscovery';
import { connection, report } from '../../features/runtime';
import { userMessage } from '../../features/help/presentation';
import { helpTopics } from '../../features/help/content';
import { BrandIllustration, BrandMark } from '../../shared/branding/Brand';
import { Disclosure } from '../../shared/components/Disclosure';
import { Button } from '../../shared/components/Button';
import { Card, Copy, Screen } from '../../shared/components/Screen';
import { useTheme } from '../../shared/theme';
import { useDeviceStore } from '../../store/deviceStore';

export default function Devices() {
  const { colors } = useTheme();
  const discovery = useDiscovery();
  const current = useDeviceStore((state) => state.connection);
  const [manual, setManual] = useState(false);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const select = (target: TVTarget): void => {
    useDeviceStore.setState({ selected: target });
    router.push('/pairing');
    void connection.select(target).catch(report);
  };
  const connectManually = (): void => {
    try {
      const target = manualTarget(address);
      Keyboard.dismiss();
      setError(null);
      select(target);
    } catch (error) {
      setError(userMessage(failure(error)));
    }
  };
  return (
    <Screen
      tabbed
      title="Find your TV."
      subtitle="We’ll look for compatible TVs on your home network. Tap yours to connect."
    >
      {current.status === 'connected' && (
        <Button
          label="Open connected remote"
          onPress={() => router.navigate('/remote')}
        />
      )}
      <View style={styles.status}>
        <Wifi size={18} color={colors.accentText} />
        <Text style={{ color: colors.muted }}>Local Wi-Fi connection</Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.muted }]}>
          NEARBY TELEVISIONS
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh devices"
          onPress={discovery.refresh}
          style={styles.refresh}
        >
          <RefreshCw size={20} color={colors.accentText} />
        </Pressable>
      </View>
      {(discovery.status === 'searching' || discovery.status === 'idle') && (
        <Card>
          <BrandIllustration kind="discovering" width={200} />
          <ActivityIndicator
            color={colors.accentText}
            accessibilityLabel="Searching for your TV"
          />
          <Copy>Searching for your TV…</Copy>
          <Copy muted>
            Make sure your TV is on and connected to the same network.
          </Copy>
        </Card>
      )}
      {discovery.devices.map((target) => (
        <Pressable
          key={target.id}
          accessibilityRole="button"
          accessibilityLabel={`Connect to ${target.name}`}
          onPress={() => select(target)}
        >
          <Card>
            <View style={styles.device}>
              <View
                style={[styles.deviceIcon, { backgroundColor: colors.raised }]}
              >
                <BrandMark size={48} />
              </View>
              <View style={styles.deviceName}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 19,
                    fontWeight: '600',
                  }}
                >
                  {target.name}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 6 }}>
                  Android TV · Available
                </Text>
              </View>
              <ArrowRight size={20} color={colors.muted} />
            </View>
          </Card>
        </Pressable>
      ))}
      {discovery.status === 'empty' && (
        <Card>
          <BrandIllustration kind="no-tv" width={200} />
          <Copy>We couldn’t find your TV.</Copy>
          <Copy muted>Let’s check a few things so we can get connected.</Copy>
          {helpTopics.network.checklist.map((item) => (
            <Copy key={item}>• {item}</Copy>
          ))}
          <Button label="Search again" onPress={discovery.refresh} />
        </Card>
      )}
      {discovery.error && (
        <Card>
          <BrandIllustration kind="no-tv" width={200} />
          <Copy>{userMessage(discovery.error)}</Copy>
          <Button
            label={
              discovery.error.code === 'permissionDenied'
                ? 'Open settings'
                : 'Try again'
            }
            secondary
            onPress={() =>
              discovery.error?.code === 'permissionDenied'
                ? void Linking.openSettings().catch(report)
                : discovery.refresh()
            }
          />
        </Card>
      )}
      <Button
        label="Need help?"
        secondary
        onPress={() =>
          router.push({
            pathname: '/help',
            params: {
              topic:
                discovery.error?.code === 'permissionDenied'
                  ? 'permissions'
                  : 'tv-off',
            },
          })
        }
      />
      <Disclosure title="Advanced connection options">
        <Copy muted>
          Most people won’t need this. Try searching for your TV first.
        </Copy>
        {!manual && (
          <Button
            label="Connect using IP address"
            secondary
            onPress={() => setManual(true)}
          />
        )}
        {manual && (
          <Card>
            <Copy>Connect using your TV’s IP address</Copy>
            <Copy muted>
              An IP address is a number that helps your phone find your TV on
              your home network. Pairing is still required.
            </Copy>
            <TextInput
              accessibilityLabel="TV IP address"
              placeholder="192.168.1.25"
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              returnKeyType="go"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={connectManually}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.line },
              ]}
            />
            {error && (
              <Text accessibilityRole="alert" style={{ color: colors.error }}>
                {error}
              </Text>
            )}
            <Button label="Connect to this address" onPress={connectManually} />
            <Button
              label="Help me find the address"
              secondary
              onPress={() =>
                router.push({
                  pathname: '/help',
                  params: { topic: 'ip-address' },
                })
              }
            />
            <Button
              label="Cancel manual connection"
              secondary
              onPress={() => {
                Keyboard.dismiss();
                setManual(false);
                setAddress('');
                setError(null);
              }}
            />
          </Card>
        )}
      </Disclosure>
      <Copy muted>
        Your TV may be connected by Ethernet, as long as it shares the same
        local network.
      </Copy>
    </Screen>
  );
}
const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 11, letterSpacing: 1.8, fontWeight: '600' },
  refresh: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  device: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  deviceIcon: {
    height: 60,
    width: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { flex: 1 },
  input: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    fontSize: 18,
    minHeight: 56,
  },
});
