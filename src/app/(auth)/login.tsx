import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/brand/brand-lockup';
import { Button } from '@/components/ui/button';
import {
  Input,
  type InputRef,
} from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { supabase } from '@/lib/supabase';
import { REMEMBER_SESSION_KEY } from '@/providers/auth-provider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<InputRef>(null);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(REMEMBER_SESSION_KEY)
      .then((value) => {
        if (active && value === 'false') {
          setRememberMe(false);
        }
      })
      .catch(() => {
        // A missing preference simply keeps the default.
      });

    return () => {
      active = false;
    };
  }, []);

  function validateForm() {
    let valid = true;

    setEmailError('');
    setPasswordError('');
    setFormError('');

    if (!email.trim()) {
      setEmailError('Email address is required.');
      valid = false;
    } else if (!email.includes('@')) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }

    return valid;
  }

  async function handleLogin() {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      await AsyncStorage.setItem(
        REMEMBER_SESSION_KEY,
        rememberMe ? 'true' : 'false'
      );

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (!data.user) {
        setFormError('Could not sign in. Please try again.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_blocked')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        setFormError('Your profile could not be loaded.');
        return;
      }

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setFormError(
          'Your account has been blocked. Please contact TheFarmYard support.'
        );
        return;
      }

      if (profile?.role === 'buyer' || profile?.role === 'farmer') {
        if (router.canDismiss()) {
          router.dismissAll();
        }

        router.replace('/');
        return;
      }

      if (profile?.role === 'admin') {
        await supabase.auth.signOut();
        setFormError(
          'Admin accounts are not available in the mobile app yet.'
        );
        return;
      }

      await supabase.auth.signOut();
      setFormError('Your account role could not be verified.');
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
            <Text style={styles.heroTitle}>Welcome back</Text>

            <Text style={styles.heroSubtitle}>
              Sign in to continue to your account.
            </Text>
          </View>

          {formError ? (
            <View style={styles.errorBox}>
              <Text
                variant="caption"
                tone="danger"
                style={styles.errorText}
              >
                {formError}
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
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordRef.current?.focus();
              }}
              error={emailError}
            />

            <Input
              ref={passwordRef}
              icon="lock-closed-outline"
              shape="pill"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleLogin();
              }}
              error={passwordError}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={6}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showPassword ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              }
            />

            <View style={styles.rememberRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Remember me"
                accessibilityHint="Keeps you signed in on this device"
                onPress={() => setRememberMe((current) => !current)}
                hitSlop={8}
                style={styles.rememberControl}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.white}
                    />
                  ) : null}
                </View>

                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>

              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </Link>
            </View>

            <Button
              title="Sign In"
              loading={loading}
              onPress={() => {
                void handleLogin();
              }}
              style={styles.loginButton}
            />
          </View>

          <View style={styles.signupRow}>
            <Text variant="body" tone="muted">
              Don&apos;t have an account?
            </Text>

            <Link href="/(auth)/signup" asChild>
              <Pressable hitSlop={8}>
                <Text variant="body" style={styles.signupText}>
                  Sign up
                </Text>
              </Pressable>
            </Link>
          </View>
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
    paddingBottom: spacing.xxl,
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

  errorText: {
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

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  rememberControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    borderColor: colors.farmGreen,
    backgroundColor: colors.farmGreen,
  },

  rememberText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  forgotText: {
    color: colors.farmGreen,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  loginButton: {
    minHeight: 54,
    marginTop: spacing.xs,
  },

  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },

  signupText: {
    color: colors.farmGreen,
    fontWeight: '700',
  },
});
