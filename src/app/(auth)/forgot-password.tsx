import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotanicalFooter } from '@/components/brand/botanical-footer';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function validateEmail() {
    setEmailError('');
    setFormError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setEmailError('Email address is required.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      return false;
    }

    return true;
  }

  async function handleResetPassword() {
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'thefarmyard://reset-password',
        }
      );

      if (error) {
        setFormError(error.message);
        return;
      }

      setSuccessMessage(
        'If an account exists for this email, a password reset link has been sent.'
      );
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
            <Text style={styles.heroTitle}>Forgot password?</Text>

            <Text style={styles.heroSubtitle}>
              Enter your email address and we&apos;ll send you a link to
              reset your password.
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
              icon="mail-outline"
              shape="pill"
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={() => {
                void handleResetPassword();
              }}
              error={emailError}
            />

            <Button
              title="Send reset link"
              loading={loading}
              onPress={() => {
                void handleResetPassword();
              }}
              style={styles.resetButton}
            />
          </View>

          <View style={styles.backRow}>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={10}>
                <Text style={styles.backText}>Back to sign in</Text>
              </Pressable>
            </Link>
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
    maxWidth: 340,
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
    gap: spacing.xl,
  },

  resetButton: {
    minHeight: 54,
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
