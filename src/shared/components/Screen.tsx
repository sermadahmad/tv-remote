import { router } from 'expo-router';
import { ArrowLeft, Bookmark, Radio, Settings2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens, useTheme } from '../theme';

export function Screen({
  title,
  eyebrow = 'UNIVERSAL TV REMOTE',
  subtitle,
  children,
  back = false,
  navigation = true,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
  back?: boolean;
  navigation?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/devices')
            }
            style={styles.back}
          >
            <ArrowLeft color={colors.text} />
          </Pressable>
        )}
        <Text style={[styles.eyebrow, { color: colors.muted }]}>{eyebrow}</Text>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        )}
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {navigation && (
        <View style={[styles.navigation, { borderTopColor: colors.line }]}>
          {[
            { label: 'Connect', route: '/devices', Icon: Radio },
            { label: 'Saved', route: '/saved', Icon: Bookmark },
            { label: 'Settings', route: '/settings', Icon: Settings2 },
          ].map(({ label, route, Icon }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => {
                if (route === '/devices') router.replace('/devices');
                else if (route === '/saved') router.replace('/saved');
                else router.replace('/settings');
              }}
              style={styles.navItem}
            >
              <Icon size={22} color={colors.muted} />
              <Text
                style={{ color: colors.muted, fontSize: tokens.type.caption }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
export function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      {children}
    </View>
  );
}
export function Copy({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {children}
    </Text>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: tokens.space.page, paddingBottom: 32, flexGrow: 1 },
  back: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '600',
    marginTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.1,
    marginTop: 12,
  },
  subtitle: { fontSize: tokens.type.body, lineHeight: 24, marginTop: 12 },
  body: { marginTop: 28, gap: tokens.space.card },
  navigation: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1 },
  navItem: {
    flex: 1,
    minHeight: tokens.target,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  card: {
    padding: tokens.space.lg,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.card,
  },
  copy: { fontSize: tokens.type.body, lineHeight: 24 },
});
