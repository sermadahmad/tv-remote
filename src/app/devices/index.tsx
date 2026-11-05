import { router } from 'expo-router';
import { ArrowRight, Radio, RefreshCw, Tv, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
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
  return (
    <Screen
      title="Make yourself at home."
      subtitle="Choose a TV on your Wi-Fi network to get started."
    >
      {current.status === 'connected' && (
        <Button
          label="Open connected remote"
          onPress={() => router.push('/remote')}
        />
      )}
      <View style={styles.status}>
        <Wifi size={18} color={colors.accent} />
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
          <RefreshCw size={20} color={colors.accent} />
        </Pressable>
      </View>
      {(discovery.status === 'searching' || discovery.status === 'idle') && (
        <Card>
          <ActivityIndicator color={colors.accent} />
          <Copy>Looking for your TV…</Copy>
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
                <Tv color={colors.accent} size={28} />
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
          <Radio color={colors.accent} />
          <Copy>No TVs found yet</Copy>
          <Copy muted>
            Check your TV’s network connection. Guest Wi-Fi and router isolation
            can prevent discovery.
          </Copy>
          <Button label="Search again" secondary onPress={discovery.refresh} />
        </Card>
      )}
      {discovery.error && (
        <Card>
          <Copy>{discovery.error.message}</Copy>
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
        label={manual ? 'Hide manual connection' : 'Enter TV IP address'}
        secondary
        onPress={() => setManual(!manual)}
      />
      {manual && (
        <Card>
          <Copy>Find the TV’s IP address in its network settings.</Copy>
          <TextInput
            accessibilityLabel="TV IP address"
            placeholder="192.168.1.25"
            placeholderTextColor={colors.muted}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
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
          <Button
            label="Connect to this address"
            onPress={() => {
              try {
                select(manualTarget(address));
              } catch (error) {
                setError(failure(error).message);
              }
            }}
          />
        </Card>
      )}
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
