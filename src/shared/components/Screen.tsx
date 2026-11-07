import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useRef, type ComponentRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens, useTheme } from '../theme';

export function Screen({
  title,
  eyebrow = 'UNIVERSAL TV REMOTE',
  subtitle,
  children,
  back = false,
  tabbed = false,
  compact = false,
  accessory,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
  back?: boolean;
  tabbed?: boolean;
  compact?: boolean;
  accessory?: ReactNode;
}) {
  const { colors } = useTheme();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const viewportHeight = useRef(0);
  const revealFocusedInput = useRef<(() => void) | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let frame: number | undefined;
      let keyboardTop = Keyboard.metrics()?.screenY ?? null;
      let measuring = false;
      let pending = false;
      const reveal = (): void => {
        if (measuring) {
          pending = true;
          return;
        }
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const input = TextInput.State.currentlyFocusedInput();
          if (!active || keyboardTop === null || !input) return;
          measuring = true;
          input.measureInWindow((_x, top, _width, height) => {
            if (
              active &&
              keyboardTop !== null &&
              input === TextInput.State.currentlyFocusedInput()
            ) {
              // Window coordinates include safe areas and the fixture banner. Re-measure after
              // viewport/content changes so discovery results cannot push the form under the IME.
              const actionSpace = Math.min(
                // Leave room for wrapped validation text and the primary action at larger font sizes.
                tokens.target * 4,
                Math.max(
                  0,
                  viewportHeight.current - height - tokens.space.card,
                ),
              );
              const overlap = top + height + actionSpace - keyboardTop;
              if (overlap > 1)
                scroll.current?.scrollTo({
                  y: offset.current + overlap,
                  animated: false,
                });
            }
            measuring = false;
            if (active && pending) {
              pending = false;
              reveal();
            }
          });
        });
      };
      revealFocusedInput.current = reveal;
      const shown = Keyboard.addListener('keyboardDidShow', (event) => {
        keyboardTop = event.endCoordinates.screenY;
        reveal();
      });
      const hidden = Keyboard.addListener('keyboardDidHide', () => {
        keyboardTop = null;
      });
      return () => {
        active = false;
        revealFocusedInput.current = null;
        shown.remove();
        hidden.remove();
        if (frame !== undefined) cancelAnimationFrame(frame);
      };
    }, []),
  );
  return (
    <SafeAreaView
      edges={
        tabbed ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']
      }
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <ScrollView
          ref={scroll}
          style={styles.root}
          onScroll={(event) => {
            offset.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onLayout={(event) => {
            viewportHeight.current = event.nativeEvent.layout.height;
            revealFocusedInput.current?.();
          }}
          onContentSizeChange={() => revealFocusedInput.current?.()}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.content,
            compact && styles.compactContent,
          ]}
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
          <Text
            style={[
              styles.eyebrow,
              compact && styles.compactEyebrow,
              { color: colors.muted },
            ]}
          >
            {eyebrow}
          </Text>
          <View style={styles.heading}>
            <Text
              accessibilityRole="header"
              style={[
                styles.title,
                compact && styles.compactTitle,
                { color: colors.text },
              ]}
            >
              {title}
            </Text>
            {accessory && <View style={styles.accessory}>{accessory}</View>}
          </View>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                compact && styles.compactSubtitle,
                { color: colors.muted },
              ]}
            >
              {subtitle}
            </Text>
          )}
          <View style={[styles.body, compact && styles.compactBody]}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        compact && styles.compactCard,
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
  compactContent: { padding: tokens.space.card },
  heading: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  accessory: { width: tokens.target },
  compactEyebrow: { marginTop: tokens.space.xs },
  compactTitle: {
    fontSize: tokens.type.compactTitle,
    marginTop: tokens.space.sm,
  },
  compactSubtitle: {
    fontSize: 14,
    lineHeight: tokens.space.lg,
    marginTop: tokens.space.sm,
  },
  compactBody: { marginTop: tokens.space.lg, gap: tokens.space.md },
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
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.1,
    marginTop: 12,
  },
  subtitle: { fontSize: tokens.type.body, lineHeight: 24, marginTop: 12 },
  body: { marginTop: 28, gap: tokens.space.card },
  card: {
    padding: tokens.space.lg,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    gap: tokens.space.card,
  },
  compactCard: { padding: tokens.space.md, gap: tokens.space.md },
  copy: { fontSize: tokens.type.body, lineHeight: 24 },
});
