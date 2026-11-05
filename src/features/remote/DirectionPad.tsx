import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { RemoteCommand, TVCapabilities } from '../../core/tv/types';
import { useTheme } from '../../shared/theme';
import { RemoteButton } from './RemoteButton';

export function DirectionPad({
  capabilities,
  send,
}: {
  capabilities: TVCapabilities;
  send: (command: RemoteCommand) => void;
}) {
  const { colors } = useTheme();
  const longPress = capabilities.longPress === 'supported';
  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        <View style={styles.spacer} />
        <RemoteButton
          label="Up"
          icon={<ChevronUp color={colors.text} />}
          commandKey="up"
          send={send}
          disabled={capabilities.keys.up !== 'supported'}
          longPress={longPress}
        />
        <View style={styles.spacer} />
      </View>
      <View style={styles.row}>
        <RemoteButton
          label="Left"
          icon={<ChevronLeft color={colors.text} />}
          commandKey="left"
          send={send}
          disabled={capabilities.keys.left !== 'supported'}
          longPress={longPress}
        />
        <RemoteButton
          label="OK"
          commandKey="select"
          primary
          send={send}
          disabled={capabilities.keys.select !== 'supported'}
          longPress={longPress}
        />
        <RemoteButton
          label="Right"
          icon={<ChevronRight color={colors.text} />}
          commandKey="right"
          send={send}
          disabled={capabilities.keys.right !== 'supported'}
          longPress={longPress}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.spacer} />
        <RemoteButton
          label="Down"
          icon={<ChevronDown color={colors.text} />}
          commandKey="down"
          send={send}
          disabled={capabilities.keys.down !== 'supported'}
          longPress={longPress}
        />
        <View style={styles.spacer} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  pad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  spacer: { flex: 1 },
});
