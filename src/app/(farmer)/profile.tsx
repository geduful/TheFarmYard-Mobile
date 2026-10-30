import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Input,
  type InputRef,
} from '@/components/ui/input';
import {
  LocationField,
  LocationPickerPanel,
} from '@/components/ui/location-picker';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import {
  formatLocationLabel,
} from '@/lib/ghana-locations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const profileBanner = require('../../../assets/images/welcome-farmland.jpg');

// Single source of truth for the avatar frame, its inner image and the
// amount by which the avatar overlaps the cover image.
const AVATAR_SIZE = 104;
const AVATAR_BORDER_WIDTH = 4;
const AVATAR_INNER_SIZE =
  AVATAR_SIZE - AVATAR_BORDER_WIDTH * 2;

function getInitials(name?: string | null) {
  if (!name?.trim()) {
    return 'TF';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join('');
}

function getAvatarUri(value?: string | null) {
  const uri = value?.trim();

  if (!uri) {
    return null;
  }

  const isSupportedUri =
    /^https?:\/\//i.test(uri) ||
    /^file:\/\//i.test(uri) ||
    /^content:\/\//i.test(uri) ||
    /^data:image\//i.test(uri);

  return isSupportedUri ? uri : null;
}

function isLikelyPhone(value: string) {
  const digits =
    value.replace(/\D/g, '');

  return digits.length >= 9;
}

export default function FarmerProfileScreen() {
  const {
    user,
    profile,
    refreshProfile,
    signOut,
  } = useAuth();

  const layout = useResponsiveLayout();
  const isPhone = layout.isPhone;

  const userId =
    user?.id ?? null;

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  const [
    failedAvatarUrl,
    setFailedAvatarUrl,
  ] = useState<string | null>(null);

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [
    phoneNumber,
    setPhoneNumber,
  ] = useState('');

  const [
    farmLocation,
    setFarmLocation,
  ] = useState('');

  const [
    fullNameError,
    setFullNameError,
  ] = useState('');

  const [
    phoneError,
    setPhoneError,
  ] = useState('');

  const [
    locationError,
    setLocationError,
  ] = useState('');

  const fullNameRef = useRef<InputRef>(null);
  const phoneRef = useRef<InputRef>(null);

  const [
    pickerOpen,
    setPickerOpen,
  ] = useState(false);

  const initials =
    getInitials(
      profile?.full_name
    );

  const avatarUri = getAvatarUri(
    profile?.avatar_url
  );

  const showAvatarImage =
    Boolean(avatarUri) &&
    avatarUri !== failedAvatarUrl;

  function clearErrors() {
    setFullNameError('');
    setPhoneError('');
    setLocationError('');
  }

  function openEditModal() {
    clearErrors();

    setFullName(
      profile?.full_name ?? ''
    );

    setPhoneNumber(
      profile?.phone_number ?? ''
    );

    setFarmLocation(
      profile?.farm_location ?? ''
    );

    setPickerOpen(false);
    setModalVisible(true);
  }

  function closeEditModal() {
    if (saving) {
      return;
    }

    setPickerOpen(false);
    setModalVisible(false);
    clearErrors();
  }

  function handleModalRequestClose() {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }

    closeEditModal();
  }

  function handleLocationConfirm(nextLocation: string) {
    setFarmLocation(nextLocation);
    setLocationError('');
    setPickerOpen(false);
  }

  function validateForm() {
    let valid = true;

    clearErrors();

    if (!fullName.trim()) {
      setFullNameError(
        'Enter your full name.'
      );

      valid = false;
    }

    if (!phoneNumber.trim()) {
      setPhoneError(
        'Enter your phone number.'
      );

      valid = false;
    } else if (
      !isLikelyPhone(
        phoneNumber
      )
    ) {
      setPhoneError(
        'Enter a valid phone number.'
      );

      valid = false;
    }

    if (!farmLocation.trim()) {
      setLocationError(
        'Enter your farm location.'
      );

      valid = false;
    }

    return valid;
  }

  async function handleSaveProfile() {
    if (!userId) {
      Alert.alert(
        'Session unavailable',
        'Please sign in again before updating your profile.'
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      /*
       * Only farmer-editable profile fields
       * are updated here.
       *
       * Role, verification state, block status
       * and other protected account fields are
       * intentionally excluded.
       */
      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .update({
          full_name:
            fullName.trim(),

          phone_number:
            phoneNumber.trim(),

          farm_location:
            farmLocation.trim(),
        })
        .eq(
          'id',
          userId
        )
        .select('id')
        .maybeSingle();

      if (error) {
        Alert.alert(
          'Profile not updated',
          error.message
        );

        return;
      }

      if (!data) {
        Alert.alert(
          'Profile unavailable',
          'Your farmer profile could not be updated.'
        );

        return;
      }

      await refreshProfile();

      setModalVisible(false);

      Alert.alert(
        'Profile updated',
        'Your farmer information has been saved.'
      );
    } catch (error) {
      console.error(
        'Farmer profile update failed:',
        error
      );

      Alert.alert(
        'Something went wrong',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setFailedAvatarUrl(null);

    try {
      await refreshProfile();
    } catch (error) {
      console.error(
        'Farmer profile refresh failed:',
        error
      );

      Alert.alert(
        'Refresh failed',
        'We could not refresh your profile.'
      );
    } finally {
      setRefreshing(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out of TheFarmYard?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign out',
          style: 'destructive',

          onPress: () => {
            void handleSignOut();
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      await signOut();

      router.replace(
        '/(auth)/login'
      );
    } catch (error) {
      console.error(
        'Farmer sign out failed:',
        error
      );

      Alert.alert(
        'Sign out failed',
        'We could not sign you out. Please try again.'
      );
    } finally {
      setSigningOut(false);
    }
  }

  // ------------------------------------------------------------------
  // Shared UI sections (rendered in both phone and tablet/desktop layouts)
  // ------------------------------------------------------------------

  const identitySection = (
    <View style={styles.profileHeader}>
      <View style={styles.avatar}>
        {showAvatarImage && avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
            resizeMode="cover"
            onError={() =>
              setFailedAvatarUrl(avatarUri)
            }
          />
        ) : (
          <Text style={styles.avatarText}>
            {initials}
          </Text>
        )}
      </View>

      <View style={styles.identityCopy}>
        <Text style={styles.identityName}>
          {profile?.full_name ||
            'TheFarmYard Farmer'}
        </Text>

        {profile?.is_verified ? (
          <View style={styles.verifiedRow}>
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={colors.emerald}
            />

            <Text style={styles.verifiedRowText}>
              Verified farmer
            </Text>
          </View>
        ) : (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              FARMER
            </Text>
          </View>
        )}

        <Text style={styles.email}>
          {user?.email || 'Email unavailable'}
        </Text>
      </View>
    </View>
  );

  const detailsSection = (
    <View style={styles.detailsCard}>
      <View style={styles.detailsHeader}>
        <Text style={styles.detailsTitle}>
          Contact information
        </Text>

        <Pressable
          onPress={openEditModal}
          hitSlop={8}
        >
          <Text style={styles.sectionAction}>
            Edit
          </Text>
        </Pressable>
      </View>

      <View style={styles.detailRow}>
        <Ionicons
          name="call-outline"
          size={17}
          color={colors.farmGreen}
        />

        <Text
          style={styles.detailValue}
          numberOfLines={1}
        >
          {profile?.phone_number ||
            'Phone not provided'}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.detailRow}>
        <Ionicons
          name="location-outline"
          size={17}
          color={colors.farmGreen}
        />

        <Text
          style={styles.detailValue}
        >
          {formatLocationLabel(
            profile?.farm_location
          ) || 'Farm location not provided'}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.detailRow}>
        <Ionicons
          name="mail-outline"
          size={17}
          color={colors.farmGreen}
        />

        <Text
          style={styles.detailValue}
        >
          {user?.email || 'Email not available'}
        </Text>
      </View>
    </View>
  );

  const verificationSection = (
    <View style={styles.verificationCard}>
      <View style={styles.verificationMark}>
        <Ionicons
          name={
            profile?.is_verified
              ? 'shield-checkmark-outline'
              : 'time-outline'
          }
          size={20}
          color={
            profile?.is_verified
              ? colors.emerald
              : colors.warning
          }
        />
      </View>

      <View style={styles.verificationContent}>
        <Text style={styles.verificationTitle}>
          {profile?.is_verified
            ? 'Verified farmer'
            : 'Verification pending'}
        </Text>

        <Text style={styles.verificationDescription}>
          {profile?.is_verified
            ? 'Buyers can see that your farm is verified by TheFarmYard.'
            : 'Verification is managed by TheFarmYard and cannot be changed here.'}
        </Text>
      </View>
    </View>
  );

  const accountActionsSection = (
    <>
      <View
        style={styles.sectionHeader}
      >
        <Text variant="subtitle">
          Account
        </Text>
      </View>

      <View
        style={styles.actionsCard}
      >
        <Pressable
          onPress={() =>
            void handleRefresh()
          }
          disabled={refreshing}
          style={({
            pressed,
          }) => [
            styles.actionRow,

            pressed &&
              !refreshing &&
              styles.actionPressed,
          ]}
        >
          <View
            style={styles.actionMark}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={colors.farmGreen}
              />
            ) : (
              <Ionicons
                name="refresh"
                size={18}
                color={colors.farmGreen}
              />
            )}
          </View>

          <View
            style={styles.actionContent}
          >
            <Text
              style={styles.actionTitle}
            >
              {refreshing
                ? 'Refreshing profile...'
                : 'Refresh profile'}
            </Text>

            <Text
              variant="caption"
              tone="muted"
              style={styles.actionSubtitle}
            >
              Reload your latest farm and verification information
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.muted}
          />
        </Pressable>

        <View
          style={styles.actionSeparator}
        />

        <Pressable
          onPress={() =>
            router.push(
              '/reset-password'
            )
          }
          style={({
            pressed,
          }) => [
            styles.actionRow,

            pressed &&
              styles.actionPressed,
          ]}
        >
          <View
            style={styles.actionMark}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.farmGreen}
            />
          </View>

          <View
            style={styles.actionContent}
          >
            <Text
              style={styles.actionTitle}
            >
              Change password
            </Text>

            <Text
              variant="caption"
              tone="muted"
              style={styles.actionSubtitle}
            >
              Update your sign-in password
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.muted}
          />
        </Pressable>
      </View>
    </>
  );

  const signOutSection = (
    <Pressable
      onPress={confirmSignOut}
      disabled={signingOut}
      style={({
        pressed,
      }) => [
        styles.signOutButton,

        pressed &&
          !signingOut &&
          styles.signOutButtonPressed,

        signingOut &&
          styles.signOutButtonDisabled,
      ]}
    >
      {signingOut ? (
        <ActivityIndicator
          size="small"
          color={colors.danger}
        />
      ) : null}

      <Text
        style={styles.signOutText}
      >
        {signingOut
          ? 'Signing out...'
          : 'Sign out'}
      </Text>
    </Pressable>
  );

  return (
    <Screen
      style={styles.screen}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.farmGreen}
          />
        }
      >
        <View style={styles.banner}>
          <Image
            source={profileBanner}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.sheet}>
          <View
            style={[
              styles.page,

              {
                width: '100%',

                maxWidth: Math.min(
                  layout.contentMaxWidth,
                  760
                ),

                paddingHorizontal:
                  layout.horizontalPadding,
              },
            ]}
          >
            {identitySection}

            <View
              style={[
                styles.sections,

                { gap: layout.sectionGap },
              ]}
            >
              {detailsSection}

              {verificationSection}

              {accountActionsSection}

              {signOutSection}

              <Text
                variant="caption"
                tone="muted"
                style={styles.footer}
              >
                TheFarmYard Mobile · Farmer
              </Text>
            </View>

            <View style={styles.footerSpacer} />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalRequestClose}
      >
        <View
          style={styles.modalRoot}
        >
          {pickerOpen ? (
            <View
              style={[
                styles.modalContainer,
                styles.modalContainerPicker,

                {
                  width: isPhone
                    ? '100%'
                    : undefined,

                  maxWidth: isPhone
                    ? undefined
                    : layout.modalMaxWidth,
                },
              ]}
            >
              <LocationPickerPanel
                value={farmLocation}
                maxWidth={
                  isPhone
                    ? undefined
                    : layout.modalMaxWidth
                }
                onCancel={() =>
                  setPickerOpen(false)
                }
                onConfirm={
                  handleLocationConfirm
                }
              />
            </View>
          ) : (
            <View
              style={[
                styles.modalContainer,

                {
                  width: isPhone
                    ? '100%'
                    : undefined,

                  maxWidth: isPhone
                    ? undefined
                    : layout.modalMaxWidth,
                },
              ]}
            >
              <View
                style={styles.modalHeader}
              >
                <Pressable
                  onPress={closeEditModal}
                  disabled={saving}
                  style={styles.modalHeaderButton}
                >
                  <Text
                    style={styles.modalCancelText}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Text variant="subtitle">
                  Edit profile
                </Text>

                <View style={styles.modalHeaderSpacer} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={
                  styles.modalContent
                }
              >
                <View
                  style={styles.modalIntro}
                >
                  <Text variant="hero">
                    Farm profile
                  </Text>

                  <Text
                    tone="muted"
                    style={styles.modalSubtitle}
                  >
                    Keep these details accurate so buyers know who they are dealing with and how to reach you.
                  </Text>
                </View>

                <Input
                  ref={fullNameRef}
                  label="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    phoneRef.current?.focus();
                  }}
                  error={fullNameError}
                />

                <Input
                  ref={phoneRef}
                  label="Phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="e.g. 024 000 0000"
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  error={phoneError}
                />

                <LocationField
                  label="Farm location"
                  value={farmLocation}
                  placeholder="Select your farm location"
                  error={locationError}
                  disabled={saving}
                  onPress={() => {
                    Keyboard.dismiss();
                    setPickerOpen(true);
                  }}
                />

                <View
                  style={styles.securityNotice}
                >
                  <View
                    style={styles.securityNoticeMark}
                  >
                    <View
                      style={styles.securityNoticeInner}
                    />
                  </View>

                  <View
                    style={styles.securityNoticeContent}
                  >
                    <Text
                      variant="subtitle"
                      style={styles.securityNoticeTitle}
                    >
                      Verification stays protected
                    </Text>

                    <Text
                      variant="caption"
                      tone="muted"
                      style={styles.securityNoticeText}
                    >
                      Farmer role, verification status and other protected account controls cannot be edited here.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    void handleSaveProfile()
                  }
                  disabled={saving}
                  style={({
                    pressed,
                  }) => [
                    styles.saveButton,

                    pressed &&
                      !saving &&
                      styles.saveButtonPressed,

                    saving &&
                      styles.saveButtonDisabled,
                  ]}
                >
                  {saving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator
                        size="small"
                        color={colors.white}
                      />

                      <Text
                        variant="subtitle"
                        tone="inverse"
                      >
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      variant="subtitle"
                      tone="inverse"
                    >
                      Save changes
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },

  scrollContent: {
    paddingBottom:
      spacing.xxxl + spacing.xl,
  },

  page: {
    alignSelf:
      'center',
  },

  sheet: {
    marginTop: -26,

    borderTopLeftRadius:
      radius.xl + 4,

    borderTopRightRadius:
      radius.xl + 4,

    backgroundColor:
      colors.background,
  },

  banner: {
    width: '100%',

    height: 158,

    backgroundColor:
      colors.mint,
  },

  bannerImage: {
    width: '100%',

    height: '100%',
  },

  profileHeader: {
    alignItems:
      'center',

    marginTop: -(AVATAR_SIZE / 2),

    paddingHorizontal:
      spacing.lg,

    width: '100%',
  },

  sections: {
    marginTop:
      spacing.xl,
  },

  avatar: {
    width: AVATAR_SIZE,

    height: AVATAR_SIZE,

    borderRadius: AVATAR_SIZE / 2,

    borderWidth: AVATAR_BORDER_WIDTH,

    borderColor:
      colors.white,

    backgroundColor:
      colors.white,

    alignItems:
      'center',

    justifyContent:
      'center',

    overflow: 'hidden',
  },

  avatarImage: {
    width: AVATAR_INNER_SIZE,
    height: AVATAR_INNER_SIZE,
    borderRadius: AVATAR_INNER_SIZE / 2,
  },

  avatarText: {
    color:
      colors.farmGreen,

    fontSize: 30,

    lineHeight: 36,

    fontWeight:
      '800',

    textAlign: 'center',

    includeFontPadding: false,
  },

  identityCopy: {
    width: '100%',

    alignItems:
      'flex-start',

    marginTop:
      spacing.sm,
  },

  identityName: {
    color:
      colors.text,

    fontSize: 23,

    fontWeight:
      '800',

    lineHeight: 29,

    textAlign:
      'left',

    maxWidth: '100%',

    flexShrink: 1,
  },

  verifiedRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap: 5,

    marginTop:
      spacing.xs,
  },

  verifiedRowText: {
    color:
      colors.emerald,

    fontSize: 12,

    fontWeight:
      '700',
  },

  roleBadge: {
    marginTop:
      spacing.xs,

    paddingHorizontal:
      spacing.sm,

    paddingVertical: 3,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.mint,
  },

  roleBadgeText: {
    color:
      colors.farmGreen,

    fontWeight:
      '800',

    fontSize: 10,

    letterSpacing: 0.4,
  },

  email: {
    marginTop:
      spacing.xs,

    color:
      colors.textSecondary,

    fontSize: 12.5,

    lineHeight: 18,

    textAlign:
      'left',

    maxWidth: '100%',

    flexShrink: 1,
  },

  sectionHeader: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    marginBottom:
      spacing.md,

    marginTop:
      spacing.sm,
  },

  sectionAction: {
    color:
      colors.farmGreen,

    fontSize: 13,

    fontWeight: '700',
  },

  detailsCard: {
    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,

    overflow:
      'hidden',
  },

  detailsHeader: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    paddingHorizontal:
      spacing.lg,

    paddingTop:
      spacing.lg,

    paddingBottom:
      spacing.sm,
  },

  detailsTitle: {
    color:
      colors.text,

    fontSize: 16,

    fontWeight: '700',
  },

  detailRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    paddingHorizontal:
      spacing.lg,

    paddingVertical:
      spacing.md,

    gap:
      spacing.md,
  },

  detailValue: {
    flex: 1,

    minWidth: 0,

    color:
      colors.textSecondary,

    fontSize: 13.5,

    fontWeight: '500',

    lineHeight: 19,
  },

  separator: {
    height: 1,

    marginHorizontal:
      spacing.lg,

    backgroundColor:
      colors.border,
  },

  verificationCard: {
    flexDirection:
      'row',

    alignItems:
      'center',

    padding:
      spacing.md,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surfaceMuted,
  },

  verificationMark: {
    width: 34,

    height: 34,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.white,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  verificationContent: {
    flex: 1,

    marginLeft:
      spacing.md,

    minWidth: 0,
  },

  verificationTitle: {
    color:
      colors.text,

    fontWeight: '700',

    fontSize: 13.5,
  },

  verificationDescription: {
    marginTop: 2,

    color:
      colors.textSecondary,

    fontSize: 11.5,

    lineHeight: 16,
  },

  actionsCard: {
    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,

    overflow:
      'hidden',
  },

  actionRow: {
    minHeight: 64,

    flexDirection:
      'row',

    alignItems:
      'center',

    paddingHorizontal:
      spacing.lg,

    paddingVertical:
      spacing.md,
  },

  actionPressed: {
    backgroundColor:
      colors.surfaceMuted,
  },

  actionMark: {
    width: 40,

    height: 40,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.mint,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  actionContent: {
    flex: 1,

    marginLeft:
      spacing.md,

    minWidth: 0,
  },

  actionTitle: {
    color:
      colors.text,

    fontWeight: '700',

    fontSize: 15,
  },

  actionSubtitle: {
    marginTop: 3,

    lineHeight: 18,
  },

  actionSeparator: {
    height: 1,

    backgroundColor:
      colors.border,
  },

  signOutButton: {
    minHeight: 50,

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      spacing.sm,

    marginTop:
      spacing.xl,

    borderWidth: 1,

    borderColor:
      '#FECACA',

    borderRadius:
      radius.md,

    backgroundColor:
      '#FEF2F2',
  },

  signOutButtonPressed: {
    backgroundColor:
      '#FEE2E2',
  },

  signOutButtonDisabled: {
    opacity: 0.6,
  },

  signOutText: {
    color:
      colors.danger,

    fontWeight: '700',

    fontSize: 15,
  },

  footer: {
    textAlign:
      'center',

    marginTop:
      spacing.xl,
  },

  footerSpacer: {
    height: 24,
  },

  modalRoot: {
    flex: 1,

    backgroundColor:
      colors.background,
  },

  modalContainer: {
    alignSelf:
      'center',

    backgroundColor:
      colors.background,
  },

  modalContainerPicker: {
    flex: 1,
  },

  modalHeader: {
    minHeight: 56,

    paddingHorizontal:
      spacing.lg,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    borderBottomWidth: 1,

    borderBottomColor:
      colors.border,
  },

  modalHeaderButton: {
    minWidth: 64,
  },

  modalHeaderSpacer: {
    width: 64,
  },

  modalCancelText: {
    color:
      colors.farmGreen,

    fontWeight: '600',
  },

  modalContent: {
    paddingHorizontal:
      spacing.lg,

    paddingTop:
      spacing.lg,

    paddingBottom:
      spacing.xl,

    gap:
      spacing.lg,
  },

  modalIntro: {
    marginBottom:
      spacing.sm,
  },

  modalSubtitle: {
    marginTop:
      spacing.sm,

    lineHeight: 21,
  },

  securityNotice: {
    flexDirection:
      'row',

    padding:
      spacing.lg,

    borderRadius:
      radius.lg,

    borderWidth: 1,

    borderColor:
      colors.mintStrong,

    backgroundColor:
      colors.mint,
  },

  securityNoticeMark: {
    width: 36,

    height: 36,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.white,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  securityNoticeInner: {
    width: 12,

    height: 14,

    borderWidth: 2,

    borderColor:
      colors.farmGreen,

    borderRadius: 4,
  },

  securityNoticeContent: {
    flex: 1,

    marginLeft:
      spacing.md,

    minWidth: 0,
  },

  securityNoticeTitle: {
    color:
      colors.farmGreen,

    fontWeight: '700',

    fontSize: 15,
  },

  securityNoticeText: {
    marginTop: 4,

    lineHeight: 18,
  },

  saveButton: {
    minHeight: 50,

    marginTop:
      spacing.md,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.farmGreen,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  saveButtonPressed: {
    opacity: 0.88,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  savingRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,
  },
});
