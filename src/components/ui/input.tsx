import type {
  ComponentProps,
  ComponentRef,
  ReactNode,
  Ref,
} from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '@/constants/tokens';
import { Text } from './text';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type InputRef = ComponentRef<typeof TextInput>;

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  icon?: IoniconName;
  rightAccessory?: ReactNode;
  /**
   * `field` is the compact form control used inside the app.
   * `pill` matches the capsule fields on the welcome/auth screens.
   */
  shape?: 'field' | 'pill';
  ref?: Ref<InputRef>;
};

export function Input({
  label,
  error,
  icon,
  rightAccessory,
  shape = 'field',
  style,
  ref,
  ...rest
}: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text
          variant="caption"
          tone="muted"
          style={styles.label}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.shell,
          shape === 'pill' && styles.shellPill,
          error ? styles.shellError : null,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={colors.muted}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          selectionColor={colors.farmGreen}
          style={[styles.input, style]}
          {...rest}
        />

        {rightAccessory ? (
          <View style={styles.accessory}>
            {rightAccessory}
          </View>
        ) : null}
      </View>

      {error ? (
        <Text
          variant="caption"
          tone="danger"
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },

  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  shell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },

  shellPill: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },

  shellError: {
    borderColor: colors.danger,
  },

  icon: {
    marginRight: spacing.sm,
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },

  accessory: {
    marginLeft: spacing.xs,
  },

  error: {
    marginTop: 2,
  },
});
