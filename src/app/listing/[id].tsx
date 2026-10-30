import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import { resolveImageUrl } from '@/lib/images/storage-image';
import { supabase } from '@/lib/supabase';

type Listing = {
  id: number;
  farmer_id: string;
  title: string;
  category: string;
  quantity_available: number | string | null;
  price_per_unit: number | string | null;
  price_unit: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
};

type FarmerProfile = {
  id: string;
  full_name: string | null;
  farm_location: string | null;
  is_verified: boolean | null;
  phone_number: string | null;
};

type ContactAction =
  | 'call'
  | 'whatsapp'
  | null;

function formatPrice(
  value: number | string | null,
  unit: string | null
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Price unavailable';
  }

  const numericValue =
    Number(value);

  const formatted =
    Number.isNaN(
      numericValue
    )
      ? String(value)
      : numericValue.toLocaleString(
          'en-GH',
          {
            maximumFractionDigits: 2,
          }
        );

  return unit
    ? `GH₵ ${formatted} / ${unit}`
    : `GH₵ ${formatted}`;
}

function formatQuantity(
  value: number | string | null,
  unit: string | null
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Not specified';
  }

  return unit
    ? `${value} ${unit}`
    : String(value);
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-GH',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function getInitials(
  name?: string | null
) {
  if (!name?.trim()) {
    return 'F';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase()
    )
    .join('');
}

function normalizeGhanaPhone(
  phone: string
) {
  const digits =
    phone.replace(
      /\D/g,
      ''
    );

  if (
    digits.startsWith(
      '233'
    )
  ) {
    return `+${digits}`;
  }

  if (
    digits.startsWith(
      '0'
    ) &&
    digits.length >= 10
  ) {
    return `+233${digits.slice(
      1
    )}`;
  }

  if (
    digits.length === 9
  ) {
    return `+233${digits}`;
  }

  return phone.trim();
}

function normalizeWhatsAppPhone(
  phone: string
) {
  return normalizeGhanaPhone(
    phone
  ).replace(/\D/g, '');
}

export default function ListingDetailsScreen() {
  const params =
    useLocalSearchParams<{
      id?: string;
    }>();

  const listingId =
    params.id;

  const layout = useResponsiveLayout();
  const [
    listing,
    setListing,
  ] =
    useState<Listing | null>(
      null
    );

  const [
    farmer,
    setFarmer,
  ] =
    useState<FarmerProfile | null>(
      null
    );

  const [
    resolvedImage,
    setResolvedImage,
  ] =
    useState<string | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    contacting,
    setContacting,
  ] =
    useState<ContactAction>(
      null
    );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(
      '/(tabs)/listings'
    );
  }

  useEffect(() => {
    let active = true;

    async function loadListing() {
      if (!listingId) {
        setErrorMessage(
          'Listing not found.'
        );

        setLoading(false);

        return;
      }

      setLoading(true);
      setErrorMessage('');
      setResolvedImage(null);
      setFarmer(null);

      try {
        const {
          data,
          error,
        } = await supabase
          .from('listings')
          .select(
            `
              id,
              farmer_id,
              title,
              category,
              quantity_available,
              price_per_unit,
              price_unit,
              image_url,
              description,
              created_at
            `
          )
          .eq(
            'id',
            listingId
          )
          .eq(
            'is_approved',
            true
          )
          .maybeSingle();

        if (
          error ||
          !data
        ) {
          if (active) {
            setErrorMessage(
              'This listing could not be loaded.'
            );

            setListing(
              null
            );
          }

          return;
        }

        const fetchedListing =
          data as Listing;

        if (!active) {
          return;
        }

        setListing(
          fetchedListing
        );

        if (
          fetchedListing.image_url
        ) {
          try {
            const imageUrl =
              await resolveImageUrl(
                fetchedListing.image_url
              );

            if (active) {
              setResolvedImage(
                imageUrl
              );
            }
          } catch (
            imageError
          ) {
            console.error(
              'Failed to resolve listing image:',
              imageError
            );

            if (active) {
              setResolvedImage(
                null
              );
            }
          }
        }

        const {
          data:
            farmerData,
          error:
            farmerError,
        } =
          await supabase.rpc(
            'get_marketplace_farmer_profile',
            {
              p_farmer_id:
                fetchedListing.farmer_id,
            }
          );

        if (farmerError) {
          console.error(
            'Failed to load marketplace farmer profile:',
            farmerError.message
          );

          if (active) {
            setFarmer(
              null
            );
          }

          return;
        }

        const farmerRows =
          (farmerData ??
            []) as FarmerProfile[];

        const marketplaceFarmer =
          farmerRows[0] ??
          null;

        if (active) {
          setFarmer(
            marketplaceFarmer
          );
        }
      } catch (error) {
        console.error(
          'Listing detail load error:',
          error
        );

        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Something went wrong while loading this listing.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      active = false;
    };
  }, [listingId]);

  async function handleCallFarmer() {
    if (
      !farmer?.phone_number?.trim()
    ) {
      Alert.alert(
        'Phone unavailable',
        'This farmer has not provided a phone number.'
      );

      return;
    }

    if (contacting) {
      return;
    }

    setContacting(
      'call'
    );

    try {
      const phone =
        normalizeGhanaPhone(
          farmer.phone_number
        );

      const url =
        `tel:${phone}`;

      const supported =
        await Linking.canOpenURL(
          url
        );

      if (!supported) {
        Alert.alert(
          'Unable to call',
          'Calling is not available on this device.'
        );

        return;
      }

      await Linking.openURL(
        url
      );
    } catch (error) {
      console.error(
        'Failed to open phone app:',
        error
      );

      Alert.alert(
        'Unable to call',
        'Your device could not open the phone app.'
      );
    } finally {
      setContacting(
        null
      );
    }
  }

  async function handleWhatsApp() {
    if (
      !farmer?.phone_number?.trim() ||
      !listing
    ) {
      Alert.alert(
        'WhatsApp unavailable',
        'This farmer has not provided a phone number.'
      );

      return;
    }

    if (contacting) {
      return;
    }

    setContacting(
      'whatsapp'
    );

    try {
      const phone =
        normalizeWhatsAppPhone(
          farmer.phone_number
        );

      const message = [
        `Hello ${
          farmer.full_name ||
          'Farmer'
        },`,
        '',
        `I found your "${listing.title}" listing on TheFarmYard.`,
        `Price: ${formatPrice(
          listing.price_per_unit,
          listing.price_unit
        )}`,
        `Available quantity: ${formatQuantity(
          listing.quantity_available,
          listing.price_unit
        )}`,
        '',
        'I would like to know more about the produce and availability.',
      ].join('\n');

      const url =
        `https://wa.me/${phone}` +
        `?text=${encodeURIComponent(
          message
        )}`;

      await Linking.openURL(
        url
      );
    } catch (error) {
      console.error(
        'Failed to open WhatsApp:',
        error
      );

      Alert.alert(
        'Unable to open WhatsApp',
        'Please make sure WhatsApp is available or try calling the farmer instead.'
      );
    } finally {
      setContacting(
        null
      );
    }
  }

  if (loading) {
    return (
      <Screen
        style={
          styles.centeredScreen
        }
      >
        <ActivityIndicator
          size="small"
          color={
            colors.farmGreen
          }
        />

        <Text
          tone="muted"
          style={
            styles.loadingText
          }
        >
          Loading listing...
        </Text>
      </Screen>
    );
  }

  if (
    !listing ||
    errorMessage
  ) {
    return (
      <Screen
        style={
          styles.centeredScreen
        }
      >
        <View
          style={
            styles.errorMark
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={26}
            color={colors.farmGreen}
          />
        </View>

        <Text variant="title">
          Listing unavailable
        </Text>

        <Text
          tone="muted"
          style={
            styles.errorText
          }
        >
          {errorMessage ||
            'This listing could not be found.'}
        </Text>

        <Pressable
          onPress={
            handleBack
          }
          style={({
            pressed,
          }) => [
            styles.backButton,

            pressed &&
              styles.backButtonPressed,
          ]}
        >
          <Text
            tone="inverse"
            style={
              styles.backButtonText
            }
          >
            Go back
          </Text>
        </Pressable>
      </Screen>
    );
  }

  const contactAvailable =
    Boolean(
      farmer?.phone_number?.trim()
    );

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.heroInner,
              {
                maxWidth: Math.min(
                  layout.contentMaxWidth,
                  760
                ),

                height:
                  layout.listingImageHeight,
              },
            ]}
          >
            {resolvedImage ? (
              <Image
                source={{
                  uri: resolvedImage,
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="leaf-outline"
                  size={44}
                  color={colors.muted}
                />

                <Text
                  tone="muted"
                  style={styles.placeholderText}
                >
                  Produce photo unavailable
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backTopButton,

                pressed &&
                  styles.backTopButtonPressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.text}
              />
            </Pressable>

            {farmer?.is_verified ? (
              <View style={styles.imageVerifiedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color={colors.emerald}
                />

                <Text style={styles.imageVerifiedText}>
                  Verified
                </Text>
              </View>
            ) : null}
          </View>
        </View>

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
          <View style={styles.titleBlock}>
            <Text style={styles.title}>
              {listing.title}
            </Text>

            <Text style={styles.price}>
              {formatPrice(
                listing.price_per_unit,
                listing.price_unit
              )}
            </Text>
          </View>

          <View style={styles.factsRow}>
            <View style={styles.factItem}>
              <View style={styles.factTop}>
                <Ionicons
                  name="basket-outline"
                  size={15}
                  color={colors.farmGreen}
                />

                <Text
                  style={styles.factValue}
                  numberOfLines={1}
                >
                  {formatQuantity(
                    listing.quantity_available,
                    listing.price_unit
                  )}
                </Text>
              </View>

              <Text style={styles.factLabel}>
                Available
              </Text>
            </View>

            <View style={styles.factDivider} />

            <View style={styles.factItem}>
              <View style={styles.factTop}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={colors.farmGreen}
                />

                <Text
                  style={styles.factValue}
                  numberOfLines={1}
                >
                  {farmer?.farm_location ||
                    'Not provided'}
                </Text>
              </View>

              <Text style={styles.factLabel}>
                Location
              </Text>
            </View>

            <View style={styles.factDivider} />

            <View style={styles.factItem}>
              <View style={styles.factTop}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={colors.farmGreen}
                />

                <Text
                  style={styles.factValue}
                  numberOfLines={1}
                >
                  {formatDate(
                    listing.created_at
                  )}
                </Text>
              </View>

              <Text style={styles.factLabel}>
                Listed
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Description
            </Text>

            <Text style={styles.description}>
              {listing.description?.trim() ||
                'The farmer has not added a description for this listing yet.'}
            </Text>
          </View>

          <View style={styles.farmerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(
                  farmer?.full_name
                )}
              </Text>
            </View>

            <View style={styles.farmerInfo}>
              <View style={styles.farmerNameRow}>
                <Text
                  numberOfLines={1}
                  style={styles.farmerName}
                >
                  {farmer?.full_name ||
                    'TheFarmYard Farmer'}
                </Text>

                {farmer?.is_verified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.emerald}
                  />
                ) : null}
              </View>

              <Text
                numberOfLines={2}
                style={styles.farmerLocation}
              >
                {farmer?.farm_location ||
                  'Location not provided'}
              </Text>
            </View>
          </View>

          {contactAvailable && farmer ? (
            <View style={styles.contactActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call farmer"
                onPress={() =>
                  void handleCallFarmer()
                }
                disabled={contacting !== null}
                style={({ pressed }) => [
                  styles.callButton,

                  pressed &&
                    contacting === null &&
                    styles.callButtonPressed,

                  contacting !== null &&
                    styles.disabledButton,
                ]}
              >
                {contacting === 'call' ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="call"
                      size={17}
                      color={colors.white}
                    />

                    <Text style={styles.callButtonText}>
                      Call
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Contact farmer on WhatsApp"
                onPress={() =>
                  void handleWhatsApp()
                }
                disabled={contacting !== null}
                style={({ pressed }) => [
                  styles.whatsappButton,

                  pressed &&
                    contacting === null &&
                    styles.whatsappButtonPressed,

                  contacting !== null &&
                    styles.disabledButton,
                ]}
              >
                {contacting === 'whatsapp' ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="logo-whatsapp"
                      size={17}
                      color={colors.white}
                    />

                    <Text
                      style={styles.whatsappButtonText}
                    >
                      WhatsApp
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.contactUnavailable}>
              <Ionicons
                name="call-outline"
                size={20}
                color={colors.muted}
              />

              <Text style={styles.contactUnavailableText}>
                This farmer has not provided a phone number for direct contact.
              </Text>
            </View>
          )}

          <Text style={styles.contactNote}>
            Confirm availability, quantity, price and delivery arrangements directly with the farmer.
          </Text>

          <View style={styles.footerSpacer} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },

  content: {
    paddingBottom:
      spacing.xxxl + spacing.xl,
  },

  centeredScreen: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal:
      spacing.xl,

    gap: spacing.md,
  },

  loadingText: {
    marginTop: spacing.sm,
  },

  errorMark: {
    width: 56,

    height: 56,

    borderRadius: radius.pill,

    backgroundColor: colors.mint,

    alignItems: 'center',

    justifyContent: 'center',
  },

  errorText: {
    textAlign: 'center',

    lineHeight: 21,

    maxWidth: 320,
  },

  backButton: {
    minHeight: 46,

    marginTop: spacing.sm,

    paddingHorizontal:
      spacing.xl,

    borderRadius: radius.pill,

    backgroundColor:
      colors.farmGreen,

    alignItems: 'center',

    justifyContent: 'center',
  },

  backButtonPressed: {
    opacity: 0.88,
  },

  backButtonText: {
    fontWeight: '700',

    fontSize: 14,
  },

  hero: {
    width: '100%',

    alignItems: 'center',
  },

  heroInner: {
    width: '100%',

    position: 'relative',

    overflow: 'hidden',

    backgroundColor:
      colors.surfaceMuted,
  },

  heroImage: {
    width: '100%',

    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    gap: spacing.sm,

    backgroundColor:
      colors.mint,
  },

  placeholderText: {
    fontSize: 12,
  },

  backTopButton: {
    position: 'absolute',

    top: spacing.lg,

    left: spacing.lg,

    width: 38,

    height: 38,

    borderRadius: radius.pill,

    backgroundColor:
      'rgba(255,255,255,0.94)',

    alignItems: 'center',

    justifyContent: 'center',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.12,

    shadowRadius: 6,

    elevation: 3,
  },

  backTopButtonPressed: {
    opacity: 0.82,
  },

  imageVerifiedBadge: {
    position: 'absolute',

    right: spacing.md,

    bottom: spacing.md,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    paddingHorizontal:
      spacing.sm,

    paddingVertical: 4,

    borderRadius: radius.pill,

    backgroundColor:
      'rgba(255,255,255,0.95)',
  },

  imageVerifiedText: {
    color: colors.emerald,

    fontSize: 11,

    fontWeight: '700',
  },

  page: {
    alignSelf: 'center',

    marginTop: -spacing.lg,

    paddingTop: spacing.xl,

    borderTopLeftRadius:
      radius.xl,

    borderTopRightRadius:
      radius.xl,

    backgroundColor:
      colors.background,
  },

  titleBlock: {
    gap: 2,
  },

  title: {
    color: colors.text,

    fontSize: 27,

    fontWeight: '800',

    lineHeight: 33,
  },

  price: {
    color: colors.farmGreen,

    fontSize: 19,

    fontWeight: '800',
  },

  factsRow: {
    flexDirection: 'row',

    alignItems: 'stretch',

    marginTop: spacing.lg,

    paddingVertical: spacing.md,

    borderTopWidth: 1,

    borderBottomWidth: 1,

    borderColor: colors.border,
  },

  factItem: {
    flex: 1,

    alignItems:
      'flex-start',

    gap: 3,

    paddingHorizontal: 4,

    minWidth: 0,
  },

  factTop: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap: 5,

    maxWidth: '100%',
  },

  factValue: {
    flexShrink: 1,

    color: colors.text,

    fontSize: 12,

    fontWeight:

      '700',

    lineHeight: 16,

    textAlign:
      'left',
  },

  factLabel: {
    color: colors.muted,

    fontSize: 10.5,

    textAlign:
      'left',
  },

  factDivider: {
    width: 1,

    backgroundColor:
      colors.border,
  },

  section: {
    marginTop: spacing.xl,
  },

  sectionTitle: {
    color: colors.text,

    fontSize: 15.5,

    fontWeight: '800',
  },

  description: {
    marginTop: spacing.sm,

    color: colors.textSecondary,

    fontSize: 13.5,

    lineHeight: 20,
  },

  farmerCard: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: spacing.xl,

    padding: spacing.md,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.lg,

    backgroundColor:
      colors.surface,
  },

  avatar: {
    width: 42,

    height: 42,

    borderRadius: radius.pill,

    backgroundColor:
      colors.mint,

    alignItems: 'center',

    justifyContent: 'center',
  },

  avatarText: {
    color: colors.farmGreen,

    fontSize: 13,

    fontWeight: '800',
  },

  farmerInfo: {
    flex: 1,

    marginLeft: spacing.md,

    minWidth: 0,
  },

  farmerNameRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,
  },

  farmerName: {
    flexShrink: 1,

    color: colors.text,

    fontSize: 14,

    fontWeight: '700',
  },

  farmerLocation: {
    marginTop: 2,

    color: colors.textSecondary,

    fontSize: 11.5,
  },

  contactActions: {
    flexDirection: 'row',

    gap: spacing.sm,

    marginTop: spacing.lg,
  },

  callButton: {
    flex: 1,

    minHeight: 50,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 7,

    borderRadius: radius.pill,

    backgroundColor:
      colors.farmGreen,
  },

  callButtonPressed: {
    opacity: 0.88,
  },

  callButtonText: {
    color: colors.white,

    fontSize: 14.5,

    fontWeight: '700',
  },

  whatsappButton: {
    flex: 1,

    minHeight: 50,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 7,

    borderRadius: radius.pill,

    backgroundColor:
      colors.farmGreenLight,
  },

  whatsappButtonPressed: {
    opacity: 0.88,
  },

  whatsappButtonText: {
    color: colors.white,

    fontSize: 14.5,

    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },

  contactUnavailable: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.md,

    marginTop: spacing.lg,

    padding: spacing.md,

    borderRadius: radius.lg,

    backgroundColor:
      colors.surfaceMuted,
  },

  contactUnavailableText: {
    flex: 1,

    color: colors.textSecondary,

    fontSize: 12.5,

    lineHeight: 18,
  },

  contactNote: {
    marginTop: spacing.md,

    color: colors.muted,

    fontSize: 11.5,

    lineHeight: 17,

    textAlign: 'center',
  },

  footerSpacer: {
    height: spacing.xl,
  },
});
