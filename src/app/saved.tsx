import { router } from 'expo-router';
import { Bookmark, Tv } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';

import {
  connection,
  refreshSaved,
  report,
  repository,
} from '../features/runtime';
import { Button } from '../shared/components/Button';
import { Card, Copy, Screen } from '../shared/components/Screen';
import { useTheme } from '../shared/theme';
import { useDeviceStore } from '../store/deviceStore';

export default function Saved() {
  const { colors } = useTheme();
  const saved = useDeviceStore((state) => state.saved);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [forgetting, setForgetting] = useState<string | null>(null);
  return (
    <Screen
      title="Your familiar places."
      subtitle="Your paired TVs, ready for next time."
    >
      {!saved.length && (
        <Card>
          <Bookmark color={colors.accent} />
          <Copy>No saved TVs yet.</Copy>
          <Copy muted>Pair a TV and it will appear here.</Copy>
          <Button
            label="Find a TV"
            onPress={() => router.replace('/devices')}
          />
        </Card>
      )}
      {saved.map(({ target, nickname }) => (
        <Card key={target.id}>
          <Tv color={colors.accent} />
          <Copy>{nickname}</Copy>
          <Copy muted>{target.host}</Copy>
          <Button
            label={`Connect to ${nickname}`}
            disabled={forgetting !== null}
            onPress={() => {
              useDeviceStore.setState({
                selected: { ...target, name: nickname },
              });
              router.push('/pairing');
              void connection.select(target).catch(report);
            }}
          />
          {editing === target.id ? (
            <>
              <TextInput
                accessibilityLabel="Device name"
                value={name}
                onChangeText={setName}
                maxLength={60}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.line },
                ]}
              />
              <Button
                label="Save name"
                secondary
                onPress={() => {
                  try {
                    repository.rename(target.id, name);
                    refreshSaved();
                    const selected = useDeviceStore.getState().selected;
                    const updated = useDeviceStore
                      .getState()
                      .saved.find((device) => device.target.id === target.id);
                    if (selected?.id === target.id && updated)
                      useDeviceStore.setState({
                        selected: { ...updated.target, name: updated.nickname },
                      });
                    setEditing(null);
                  } catch (error) {
                    report(error);
                  }
                }}
              />
            </>
          ) : (
            <Button
              label={`Rename ${nickname}`}
              disabled={forgetting !== null}
              secondary
              onPress={() => {
                setName(nickname);
                setEditing(target.id);
              }}
            />
          )}
          <Button
            label={`Forget ${nickname}`}
            disabled={forgetting !== null}
            loading={forgetting === target.id}
            secondary
            onPress={() =>
              Alert.alert(
                'Forget this TV?',
                'This removes its credentials from this phone. Remove the remote on your TV too if you want to revoke its authorization there.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Forget TV',
                    style: 'destructive',
                    onPress: () => {
                      setForgetting(target.id);
                      void connection
                        .forget(target.id)
                        .then(() => {
                          refreshSaved();
                          const state = connection.snapshot();
                          if (
                            useDeviceStore.getState().selected?.id ===
                              target.id &&
                            (state.status === 'disconnected' ||
                              state.status === 'error')
                          )
                            useDeviceStore.setState({ selected: null });
                        })
                        .catch(report)
                        .finally(() => setForgetting(null));
                    },
                  },
                ],
              )
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    minHeight: 52,
    fontSize: 18,
  },
});
