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
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

type SignupRole = 'buyer' | 'farmer';

export default function SignupScreen() {
  const [role, setRole] = useState<SignupRole>('buyer');

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [fullNameError, setFullNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fullNameRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);
  const phoneRef = useRef<InputRef>(null);
  const farmLocationRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);
  const confirmPasswordRef = useRef<InputRef>(null);

  function normalizePhone(value: string) {
    return value.replace(/\s+/g, '').replace(/-/g, '');
  }

  function isValidGhanaPhone(value: string) {
    const phone = normalizePhone(value);

    return (
      /^0\d{9}$/.test(phone) ||
      /^\+233\d{9}$/.test(phone) ||
      /^233\d{9}$/.test(phone)
    );
  }

  function validateForm() {
    let valid = true;

    setFullNameError('');
    setPhoneError('');
    setLocationError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setFullNameError('Your full name is required.');
      valid = false;
    } else if (fullName.trim().length < 2) {
      setFullNameError('Enter your full name.');
      valid = false;
    }

    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required.');
      valid = false;
    } else if (!isValidGhanaPhone(phoneNumber)) {
      setPhoneError('Enter a valid Ghana phone number.');
      valid = false;
    }

    if (role === 'farmer' && !farmLocation.trim()) {
      setLocationError('Farm location is required for farmers.');
      valid = false;
    }

    if (!email.trim()) {
      setEmailError('Email address is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must contain at least 6 characters.');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirm your password.');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    }

    return valid;
  }

  async function handleSignup() {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const cleanedPhone = normalizePhone(phoneNumber);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone_number: cleanedPhone,
            role,
            farm_location:
              role === 'farmer' ? farmLocation.trim() : null,
          },
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (!data.user) {
        setFormError('Account could not be created. Please try again.');
        return;
      }

      /*
       * If email confirmation is enabled in Supabase,
       * signUp may create the user without returning a session.
       */
      if (!data.session) {
        setSuccessMessage(
          'Account created. Check your email to confirm your account, then sign in.'
        );
        return;
      }

      if (router.canDismiss()) {
        router.dismissAll();
      }

      router.replace('/');
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
            <Text style={styles.heroTitle}>Create your account</Text>

            <Text style={styles.heroSubtitle}>
              Join TheFarmYard and be part of a bigger agricultural
              community.
            </Text>
          </View>

        <View style={styles.roleSection}>
          <View
            style={styles.roleSwitch}
            accessibilityRole="radiogroup"
            accessibilityLabel="Account type"
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: role === 'buyer' }}
              onPress={() => setRole('buyer')}
              style={[
                styles.roleOption,
                role === 'buyer' && styles.roleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'buyer' && styles.roleOptionTextActive,
                ]}
              >
                Buyer
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: role === 'farmer' }}
              onPress={() => setRole('farmer')}
              style={[
                styles.roleOption,
                role === 'farmer' && styles.roleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'farmer' && styles.roleOptionTextActive,
                ]}
              >
                Farmer
              </Text>
            </Pressable>
          </View>
        </View>

        {formError ? (
          <View style={styles.errorBox}>
            <Text variant="caption" tone="danger" style={styles.messageText}>
              {formError}
            </Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBox}>
            <Text variant="caption" style={styles.successText}>
              {successMessage}
            </Text>

            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              style={styles.successAction}
            >
              <Text variant="caption" style={styles.successActionText}>
                Go to sign in
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            ref={fullNameRef}
            icon="person-outline"
            shape="pill"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => {
              emailRef.current?.focus();
            }}
            error={fullNameError}
          />

          <Input
            ref={emailRef}
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
              phoneRef.current?.focus();
            }}
            error={emailError}
          />

          <Input
            ref={phoneRef}
            icon="call-outline"
            shape="pill"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            returnKeyType="next"
            onSubmitEditing={() => {
              if (role === 'farmer') {
                farmLocationRef.current?.focus();
              } else {
                passwordRef.current?.focus();
              }
            }}
            error={phoneError}
          />

          {role === 'farmer' ? (
            <Input
              ref={farmLocationRef}
              icon="location-outline"
              shape="pill"
              value={farmLocation}
              onChangeText={setFarmLocation}
              placeholder="Farm location"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordRef.current?.focus();
              }}
              error={locationError}
            />
          ) : null}

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
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => {
              confirmPasswordRef.current?.focus();
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

          <Input
            ref={confirmPasswordRef}
            icon="shield-checkmark-outline"
            shape="pill"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
            error={confirmPasswordError}
          />

          <Button
            title="Create account"
            loading={loading}
            onPress={() => {
              void handleSignup();
            }}
            style={styles.signupButton}
          />

          <Text variant="caption" tone="muted" style={styles.terms}>
            By creating an account, you agree to use TheFarmYard responsibly
            and provide accurate account information.
          </Text>
        </View>

        <View style={styles.loginRow}>
          <Text variant="body" tone="muted">
            Already have an account?
          </Text>

          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text variant="body" style={styles.loginText}>
                Sign in
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
    paddingTop: spacing.lg,
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
    maxWidth: 340,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  roleSection: {
    marginBottom: spacing.xl,
  },

  roleSwitch: {
    minHeight: 54,
    flexDirection: 'row',
    gap: spacing.sm,
  },

  roleOption: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },

  roleOptionActive: {
    borderColor: colors.farmGreen,
    backgroundColor: colors.farmGreen,
  },

  roleOptionText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },

  roleOptionTextActive: {
    color: colors.white,
  },

  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  successBox: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  messageText: {
    lineHeight: 18,
  },

  successText: {
    color: colors.emerald,
    lineHeight: 18,
  },

  successAction: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },

  successActionText: {
    color: colors.farmGreen,
    fontWeight: '700',
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

  signupButton: {
    minHeight: 54,
    marginTop: spacing.lg,
  },

  terms: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    fontSize: 11,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },

  loginText: {
    color: colors.farmGreen,
    fontWeight: '700',
  },
});