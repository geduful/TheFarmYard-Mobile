import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotanicalFooter } from '@/components/brand/botanical-footer';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { Button } from '@/components/ui/button';
import {
  Input,
  type InputRef,
} from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<InputRef>(null);
  const confirmPasswordRef = useRef<InputRef>(null);

  function validateForm() {
    let valid = true;

    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');
    setSuccessMessage('');

    if (!password) {
      setPasswordError('New password is required.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must contain at least 6 characters.');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirm your new password.');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    }

    return valid;
  }

  async function handleResetPassword() {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setSuccessMessage('Your password has been updated successfully.');

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 800);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const visibilityToggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
      onPress={() => setShowPassword((current) => !current)}
      hitSlop={6}
      style={styles.eyeButton}
    >
      <Ionicons
        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={colors.muted}
      />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandHeader}>
            <BrandLockup variant="horizontal" size="md" />
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Reset password</Text>

            <Text style={styles.heroSubtitle}>
              Create a new password for your account.
            </Text>
          </View>

          {formError ? (
            <View style={styles.errorBox}>
              <Text
                variant="caption"
                tone="danger"
                style={styles.messageText}
              >
                {formError}
              </Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.emerald}
              />

              <Text variant="caption" style={styles.successText}>
                {successMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              ref={passwordRef}
              icon="lock-closed-outline"
              shape="pill"
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              returnKeyType="next"
              onSubmitEditing={() => {
                confirmPasswordRef.current?.focus();
              }}
              error={passwordError}
              rightAccessory={visibilityToggle}
            />

            <Input
              ref={confirmPasswordRef}
              icon="lock-closed-outline"
              shape="pill"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              error={confirmPasswordError}
              rightAccessory={visibilityToggle}
            />

            <Button
              title="Reset password"
              loading={loading}
              onPress={() => {
                void handleResetPassword();
              }}
              style={styles.resetButton}
            />
          </View>

          <View style={styles.backRow}>
            <Pressable
              hitSlop={10}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.backText}>Back to sign in</Text>
            </Pressable>
          </View>

          <BotanicalFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  root: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },

  brandHeader: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },

  hero: {
    marginBottom: spacing.xl,
  },

  heroTitle: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  heroSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  errorBox: {
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },

  messageText: {
    lineHeight: 18,
  },

  successText: {
    flex: 1,
    color: colors.emerald,
    lineHeight: 18,
  },

  form: {
    gap: spacing.md,
  },

  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetButton: {
    minHeight: 54,
    marginTop: spacing.lg,
  },

  backRow: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },

  backText: {
    color: colors.farmGreen,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
