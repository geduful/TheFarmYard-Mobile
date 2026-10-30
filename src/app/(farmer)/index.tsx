import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
  colors,
  radius,
  spacing,
} from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import { resolveImageUrl } from '@/lib/images/storage-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Listing = {
  id: number;
  title: string;
  category: string;
  quantity_available:
    | number
    | string
    | null;
  price_per_unit:
    | number
    | string
    | null;
  price_unit: string | null;
  image_url: string | null;
  is_approved: boolean;
  created_at: string;
};

type DashboardCounts = {
  totalListings: number;
  liveListings: number;
};

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return 'Good morning,';
  }

  if (hour < 18) {
    return 'Good afternoon,';
  }

  return 'Good evening,';
}

function formatPrice(
  value:
    | number
    | string
    | null,
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
  value:
    | number
    | string
    | null,
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

export default function FarmerHomeScreen() {
  const {
    user,
    profile,
  } = useAuth();

  const layout = useResponsiveLayout();

  const userId =
    user?.id ?? null;

  const [
    listings,
    setListings,
  ] = useState<Listing[]>([]);

  const [
    resolvedImages,
    setResolvedImages,
  ] = useState<
    Record<number, string>
  >({});

  const [
    counts,
    setCounts,
  ] = useState<DashboardCounts>({
    totalListings: 0,
    liveListings: 0,
  });

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const resolveListingImages =
    useCallback(
      async (items: Listing[]) => {
        const entries =
          await Promise.all(
            items.map(
              async (listing) => {
                if (
                  !listing.image_url
                ) {
                  return [
                    listing.id,
                    null,
                  ] as const;
                }

                try {
                  const url =
                    await resolveImageUrl(
                      listing.image_url
                    );

                  return [
                    listing.id,
                    url,
                  ] as const;
                } catch (error) {
                  console.error(
                    `Failed to resolve farmer listing image ${listing.id}:`,
                    error
                  );

                  return [
                    listing.id,
                    null,
                  ] as const;
                }
              }
            )
          );

        const imageMap: Record<
          number,
          string
        > = {};

        for (const [
          listingId,
          url,
        ] of entries) {
          if (url) {
            imageMap[listingId] =
              url;
          }
        }

        setResolvedImages(
          imageMap
        );
      },
      []
    );

  const loadDashboard =
    useCallback(async () => {
      if (!userId) {
        setListings([]);
        setResolvedImages({});

        setCounts({
          totalListings: 0,
          liveListings: 0,
        });

        setLoading(false);

        return;
      }

      setErrorMessage('');

      const [
        listingsResult,
        totalCountResult,
        liveCountResult,
      ] = await Promise.all([
        supabase
          .from('listings')
          .select(
            `
              id,
              title,
              category,
              quantity_available,
              price_per_unit,
              price_unit,
              image_url,
              is_approved,
              created_at
            `
          )
          .eq(
            'farmer_id',
            userId
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(5),

        supabase
          .from('listings')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'farmer_id',
            userId
          ),

        supabase
          .from('listings')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq(
            'farmer_id',
            userId
          )
          .eq(
            'is_approved',
            true
          ),
      ]);

      const hasError =
        listingsResult.error ||
        totalCountResult.error ||
        liveCountResult.error;

      if (hasError) {
        console.error(
          'Farmer dashboard load issue:',
          {
            listings:
              listingsResult
                .error?.message,

            totalListings:
              totalCountResult
                .error?.message,

            liveListings:
              liveCountResult
                .error?.message,
          }
        );

        setErrorMessage(
          'Some dashboard information could not be loaded.'
        );
      }

      const nextListings =
        listingsResult.error
          ? []
          : ((
              listingsResult.data ??
              []
            ) as Listing[]);

      setListings(nextListings);

      if (
        nextListings.length >
        0
      ) {
        await resolveListingImages(
          nextListings
        );
      } else {
        setResolvedImages({});
      }

      setCounts({
        totalListings:
          totalCountResult.count ??
          0,

        liveListings:
          liveCountResult.count ??
          0,
      });
    }, [
      userId,
      resolveListingImages,
    ]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);

      try {
        await loadDashboard();
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [loadDashboard]);

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }

  const firstName =
    profile?.full_name
      ?.trim()
      .split(/\s+/)[0] ||
    'Farmer';

  const pendingListings =
    Math.max(
      counts.totalListings -
        counts.liveListings,
      0
    );

  const metricItems =
    useMemo(
      () => [
        {
          key: 'total',
          label: 'Total listings',
          value: counts.totalListings,
          icon: 'basket-outline' as const,
        },
        {
          key: 'active',
          label: 'Active',
          value: counts.liveListings,
          icon:
            'checkmark-circle-outline' as const,
        },
        {
          key: 'pending',
          label: 'Pending',
          value: pendingListings,
          icon: 'time-outline' as const,
        },
      ],
      [counts, pendingListings]
    );

  const listingItems =
    useMemo(
      () => listings.slice(0, 3),
      [listings]
    );

  function openAddListing() {
    router.push({
      pathname:
        '/(farmer)/listings',
      params: {
        create: String(Date.now()),
      },
    });
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void handleRefresh()
            }
            tintColor={
              colors.farmGreen
            }
          />
        }
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.heroInner,
              {
                maxWidth:
                  layout.contentMaxWidth,

                paddingHorizontal:
                  layout.horizontalPadding,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.greeting}>
                  {getGreeting()}
                </Text>

                <Text
                  style={styles.welcomeName}
                  numberOfLines={2}
                >
                  {firstName}
                </Text>

                <Text style={styles.welcomeSubtitle}>
                  Manage your farm and listings.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open farmer profile"
                onPress={() =>
                  router.push(
                    '/(farmer)/profile'
                  )
                }
                style={({ pressed }) => [
                  styles.avatar,
                  pressed &&
                    styles.avatarPressed,
                ]}
              >
                <Text style={styles.avatarText}>
                  {firstName
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </Pressable>
            </View>

            <View style={styles.statsCard}>
              {metricItems.map((metric) => (
                <View
                  key={metric.key}
                  style={styles.statItem}
                >
                  <Ionicons
                    name={metric.icon}
                    size={20}
                    color={colors.onDarkMuted}
                  />

                  <Text style={styles.statLabel}>
                    {metric.label}
                  </Text>

                  <Text style={styles.statValue}>
                    {loading
                      ? '—'
                      : metric.value}
                  </Text>
                </View>
              ))}
            </View>
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
          {errorMessage ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={openAddListing}
            style={({ pressed }) => [
              styles.addButton,
              pressed &&
                styles.addButtonPressed,
            ]}
          >
            <Ionicons
              name="add"
              size={19}
              color={colors.white}
            />

            <Text style={styles.addButtonText}>
              Add new listing
            </Text>
          </Pressable>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Recent listings
            </Text>

            <Pressable
              onPress={() =>
                router.push(
                  '/(farmer)/listings'
                )
              }
              hitSlop={8}
            >
              <Text style={styles.seeAll}>
                See all
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator
                size="small"
                color={colors.farmGreen}
              />

              <Text tone="muted">
                Loading your farm...
              </Text>
            </View>
          ) : listings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyMark}>
                <Ionicons
                  name="leaf-outline"
                  size={26}
                  color={colors.farmGreen}
                />
              </View>

              <Text variant="subtitle">
                No produce listed yet
              </Text>

              <Text
                tone="muted"
                style={styles.emptyText}
              >
                Add your first listing so buyers can discover what you sell.
              </Text>
            </View>
          ) : (
            <View style={styles.listingList}>
              {listingItems.map((listing) => {
                const imageUrl =
                  resolvedImages[
                    listing.id
                  ];

                return (
                  <Pressable
                    key={listing.id}
                    onPress={() =>
                      router.push(
                        `/listing/${listing.id}`
                      )
                    }
                    style={({ pressed }) => [
                      styles.listingRow,
                      pressed &&
                        styles.cardPressed,
                    ]}
                  >
                    <View style={styles.listingImageWrap}>
                      {imageUrl ? (
                        <Image
                          source={{
                            uri: imageUrl,
                          }}
                          style={
                            styles.listingImage
                          }
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="leaf-outline"
                          size={26}
                          color={colors.muted}
                        />
                      )}
                    </View>

                    <View style={styles.listingInfo}>
                      <Text
                        numberOfLines={2}
                        style={styles.listingTitle}
                      >
                        {listing.title}
                      </Text>

                      <Text style={styles.listingPrice}>
                        {formatPrice(
                          listing.price_per_unit,
                          listing.price_unit
                        )}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          listing.is_approved
                            ? styles.liveBadge
                            : styles.pendingBadge,
                        ]}
                      >
                        <Ionicons
                          name={
                            listing.is_approved
                              ? 'checkmark-circle'
                              : 'time-outline'
                          }
                          size={12}
                          color={
                            listing.is_approved
                              ? colors.emerald
                              : colors.warning
                          }
                        />

                        <Text
                          style={[
                            styles.statusText,
                            listing.is_approved
                              ? styles.liveText
                              : styles.pendingText,
                          ]}
                        >
                          {listing.is_approved
                            ? 'Active'
                            : 'Pending'}
                        </Text>
                      </View>

                      <Text
                        numberOfLines={1}
                        style={styles.listingMeta}
                      >
                        {formatQuantity(
                          listing.quantity_available,
                          listing.price_unit
                        )}{' '}
                        available
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

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

  scrollContent: {
    paddingBottom:
      spacing.xxxl + spacing.xl,
  },

  hero: {
    backgroundColor:
      colors.farmGreen,

    paddingTop: spacing.lg,

    paddingBottom: spacing.xxl,
  },

  heroInner: {
    width: '100%',

    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent:
      'space-between',

    gap: spacing.md,
  },

  headerText: {
    flex: 1,

    minWidth: 0,
  },

  greeting: {
    color: colors.onDarkMuted,

    fontSize: 13,

    fontWeight: '600',
  },

  welcomeName: {
    marginTop: 2,

    color: colors.white,

    fontSize: 30,

    fontWeight: '800',

    letterSpacing: -0.5,

    lineHeight: 36,
  },

  welcomeSubtitle: {
    marginTop: spacing.xs,

    color: colors.onDarkMuted,

    fontSize: 13.5,

    lineHeight: 19,
  },

  avatar: {
    width: 46,

    height: 46,

    borderRadius: radius.pill,

    borderWidth: 2,

    borderColor:
      'rgba(255,255,255,0.55)',

    backgroundColor: colors.white,

    alignItems: 'center',

    justifyContent: 'center',
  },

  avatarPressed: {
    opacity: 0.86,
  },

  avatarText: {
    color: colors.farmGreen,

    fontSize: 16,

    fontWeight: '800',
  },

  statsCard: {
    flexDirection: 'row',

    marginTop: spacing.xl,

    paddingVertical: spacing.lg,

    borderRadius: radius.lg,

    backgroundColor:
      'rgba(255,255,255,0.10)',
  },

  statItem: {
    flex: 1,

    alignItems: 'center',

    gap: 2,
  },

  statLabel: {
    color: colors.onDarkMuted,

    fontSize: 10.5,

    fontWeight: '600',
  },

  statValue: {
    color: colors.white,

    fontSize: 20,

    fontWeight: '800',

    lineHeight: 24,
  },

  page: {
    alignSelf: 'center',

    marginTop: -spacing.xl,

    paddingTop: spacing.xl,

    borderTopLeftRadius: radius.xl + 4,

    borderTopRightRadius: radius.xl + 4,

    backgroundColor:
      colors.background,
  },

  warningCard: {
    backgroundColor: '#FFF8EC',

    borderWidth: 1,

    borderColor: '#F2D6A7',

    borderRadius: radius.md,

    padding: spacing.md,

    marginBottom: spacing.md,
  },

  warningText: {
    color: colors.warning,

    lineHeight: 18,
  },

  addButton: {
    minHeight: 52,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: spacing.sm,

    borderRadius: radius.pill,

    backgroundColor: colors.farmGreen,
  },

  addButtonPressed: {
    opacity: 0.88,
  },

  addButtonText: {
    color: colors.white,

    fontSize: 14.5,

    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    marginTop: spacing.xl,

    marginBottom: spacing.md,
  },

  sectionTitle: {
    color: colors.text,

    fontSize: 17,

    fontWeight: '800',
  },

  seeAll: {
    color: colors.farmGreen,

    fontWeight: '700',

    fontSize: 12.5,
  },

  stateCard: {
    minHeight: 150,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.lg,

    alignItems: 'center',

    justifyContent: 'center',

    padding: spacing.lg,

    gap: spacing.sm,
  },

  emptyState: {
    minHeight: 190,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.lg,

    alignItems: 'center',

    justifyContent: 'center',

    padding: spacing.lg,
  },

  emptyMark: {
    width: 52,

    height: 52,

    borderRadius: radius.pill,

    backgroundColor: colors.mint,

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: spacing.md,
  },

  emptyText: {
    textAlign: 'center',

    lineHeight: 20,

    marginTop: spacing.sm,

    maxWidth: 290,
  },

  listingList: {
    gap: spacing.sm,
  },

  listingRow: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.lg,

    padding: spacing.sm,
  },

  cardPressed: {
    opacity: 0.9,
  },

  listingImageWrap: {
    width: 92,

    height: 92,

    flexShrink: 0,

    overflow: 'hidden',

    borderRadius: radius.md,

    backgroundColor: colors.mint,

    alignItems: 'center',

    justifyContent: 'center',
  },

  listingImage: {
    width: '100%',

    height: '100%',
  },

  listingInfo: {
    flex: 1,

    marginLeft: spacing.md,

    minWidth: 0,
  },

  listingTitle: {
    color: colors.text,

    fontSize: 14.5,

    fontWeight: '700',

    lineHeight: 19,
  },

  listingPrice: {
    marginTop: 4,

    color: colors.farmGreen,

    fontSize: 14.5,

    fontWeight: '800',
  },

  statusBadge: {
    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    marginTop: 6,

    paddingHorizontal: spacing.sm,

    paddingVertical: 3,

    borderRadius: radius.pill,
  },

  liveBadge: {
    backgroundColor:
      colors.successSoft,
  },

  pendingBadge: {
    backgroundColor: '#FFF4DE',
  },

  statusText: {
    fontSize: 10.5,

    fontWeight: '700',
  },

  liveText: {
    color: colors.emerald,
  },

  pendingText: {
    color: colors.warning,
  },

  listingMeta: {
    marginTop: 5,

    color: colors.muted,

    fontSize: 11,
  },

  footerSpacer: {
    height: spacing.xl,
  },
});
