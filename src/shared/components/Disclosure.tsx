import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens, useTheme } from '../theme';

export function Disclosure({
  title,
  children,
  initiallyExpanded = false,
}: {
  title: string;
  children: ReactNode;
  initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const { colors } = useTheme();
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: pressed ? colors.raised : 'transparent' },
        ]}
      >
        <Text style={[styles.title, { color: colors.accentText }]}>
          {title}
        </Text>
        <Icon size={20} color={colors.accentText} accessible={false} />
      </Pressable>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}
const styles = StyleSheet.create({
  trigger: {
    minHeight: tokens.target,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  title: { flex: 1, fontSize: tokens.type.body, fontWeight: '600' },
  content: { gap: tokens.space.card, paddingBottom: tokens.space.card },
});
