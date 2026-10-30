import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
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
  farmer_id: string;
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
  description: string | null;
  created_at: string;
};

type FarmerProfile = {
  id: string;
  full_name: string | null;
  farm_location: string | null;
  is_verified: boolean | null;
};

type FarmerMap =
  Record<string, FarmerProfile>;

const featuredScrim = require('../../../assets/images/featured-scrim.png');

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k+`;
  }

  return String(value);
}

const categories = [
  'All',
  'Crops & Grains',
  'Livestock',
  'Poultry',
  'Aquaculture',
  'Other',
];

function getTodayDateString() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      now.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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

function getInitials(
  name?: string | null
) {
  if (!name?.trim()) {
    return 'TF';
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

  const numeric =
    Number(value);

  const formatted =
    Number.isNaN(numeric)
      ? String(value)
      : numeric.toLocaleString(
          'en-GH',
          {
            maximumFractionDigits: 2,
          }
        );

  return unit
    ? `GH₵ ${formatted} / ${unit}`
    : `GH₵ ${formatted}`;
}

export default function BuyerHomeScreen() {
  const {
    user,
    profile,
  } = useAuth();

  const layout =
    useResponsiveLayout();

  const userId =
    user?.id ?? null;

  const [
    listings,
    setListings,
  ] = useState<Listing[]>([]);

  const [
    farmers,
    setFarmers,
  ] =
    useState<FarmerMap>({});

  const [
    resolvedImages,
    setResolvedImages,
  ] = useState<
    Record<number, string>
  >({});

  const [
    openRequestCount,
    setOpenRequestCount,
  ] = useState(0);

  const [
    listingTotal,
    setListingTotal,
  ] = useState(0);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const firstName =
    profile?.full_name
      ?.trim()
      .split(/\s+/)[0] ??
    null;

  const contentWidth =
    Math.min(
      layout.width,
      layout.contentMaxWidth
    );

  const availableWidth =
    Math.max(
      0,
      contentWidth -
        layout.horizontalPadding *
          2
    );

  const popularCardWidth =
    layout.isPhone
      ? Math.min(
          300,
          Math.round(
            availableWidth * 0.78
          )
        )
      : 280;

  const resolveListingImages =
    useCallback(
      async (
        items: Listing[]
      ) => {
        const entries =
          await Promise.all(
            items.map(
              async (
                listing
              ) => {
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
                } catch (
                  error
                ) {
                  console.error(
                    `Failed to resolve marketplace image ${listing.id}:`,
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

        const imageMap:
          Record<
            number,
            string
          > = {};

        for (const [
          listingId,
          url,
        ] of entries) {
          if (url) {
            imageMap[
              listingId
            ] = url;
          }
        }

        setResolvedImages(
          imageMap
        );
      },
      []
    );

  const loadListings =
    useCallback(async () => {
      const {
        data,
        error,
        count,
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
          `,
          { count: 'exact' }
        )
        .eq(
          'is_approved',
          true
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(20);

      if (error) {
        console.error(
          'Buyer home listings failed:',
          error.message
        );

        setListings([]);
        setFarmers({});
        setResolvedImages(
          {}
        );
        setListingTotal(0);

        setErrorMessage(
          'We could not load the marketplace.'
        );

        return;
      }

      const fetchedListings =
        (data ??
          []) as Listing[];

      setListings(
        fetchedListings
      );

      setListingTotal(
        count ?? fetchedListings.length
      );

      await resolveListingImages(
        fetchedListings
      );

      const farmerIds =
        Array.from(
          new Set(
            fetchedListings
              .map(
                (
                  listing
                ) =>
                  listing.farmer_id
              )
              .filter(Boolean)
          )
        );

      if (
        farmerIds.length ===
        0
      ) {
        setFarmers({});
        return;
      }

      const {
        data:
          farmerData,
        error:
          farmerError,
      } =
        await supabase.rpc(
          'get_public_marketplace_farmer_profiles',
          {
            p_farmer_ids:
              farmerIds,
          }
        );

      if (farmerError) {
        console.error(
          'Buyer home public farmer profiles failed:',
          farmerError.message
        );

        setFarmers({});
        return;
      }

      const map:
        FarmerMap = {};

      for (const farmer of (farmerData ??
        []) as FarmerProfile[]) {
        map[farmer.id] =
          farmer;
      }

      setFarmers(map);
    }, [
      resolveListingImages,
    ]);

  const loadOpenRequests =
    useCallback(async () => {
      if (!userId) {
        setOpenRequestCount(
          0
        );

        return;
      }

      const {
        count,
        error,
      } = await supabase
        .from(
          'buy_requests'
        )
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq(
          'buyer_id',
          userId
        )
        .eq(
          'status',
          'open'
        )
        .gte(
          'deadline',
          getTodayDateString()
        );

      if (error) {
        console.error(
          'Buyer open request count failed:',
          error.message
        );

        setOpenRequestCount(
          0
        );

        return;
      }

      setOpenRequestCount(
        count ?? 0
      );
    }, [userId]);

  const loadHome =
    useCallback(async () => {
      setErrorMessage('');

      await Promise.all([
        loadListings(),
        loadOpenRequests(),
      ]);
    }, [
      loadListings,
      loadOpenRequests,
    ]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);

      try {
        await loadHome();
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loadHome]);

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadHome();
    } finally {
      setRefreshing(false);
    }
  }

  function openListing(
    listingId: number
  ) {
    router.push({
      pathname:
        '/listing/[id]',
      params: {
        id: String(
          listingId
        ),
      },
    });
  }

  function clearFilters() {
    setSearch('');
    setSelectedCategory(
      'All'
    );
  }

  const filteredListings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return listings.filter(
        (listing) => {
          if (
            selectedCategory !==
              'All' &&
            listing.category !==
              selectedCategory
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const farmer =
            farmers[
              listing.farmer_id
            ];

          const searchable =
            [
              listing.title,
              listing.category,
              listing.description,
              farmer?.full_name,
              farmer?.farm_location,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      farmers,
      listings,
      search,
      selectedCategory,
    ]);

  const freshListings =
    filteredListings.slice(
      0,
      6
    );

  const featuredListing =
    filteredListings[0] ??
    listings[0] ??
    null;

  const featuredImage =
    featuredListing
      ? resolvedImages[
          featuredListing.id
        ]
      : undefined;

  const localFarmerCount =
    Object.keys(farmers).length;

  const metrics = [
    {
      key: 'farmers',
      icon: 'people-outline' as const,
      value: formatCount(
        localFarmerCount
      ),
      label: 'Local farmers',
    },
    {
      key: 'listings',
      icon: 'basket-outline' as const,
      value: formatCount(
        listingTotal
      ),
      label: 'Fresh listings',
    },
    {
      key: 'requests',
      icon: 'chatbubbles-outline' as const,
      value: formatCount(
        openRequestCount
      ),
      label: 'Open requests',
    },
  ];

  return (
    <Screen
      style={
        styles.screen
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              void handleRefresh()
            }
            tintColor={
              colors.farmGreen
            }
          />
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.heroInner,
              {
                width: '100%',
                maxWidth:
                  layout.contentMaxWidth,

                paddingHorizontal:
                  layout.horizontalPadding,
              },
            ]}
          >
            <View
              style={
                styles.header
              }
            >
              <View
                style={
                  styles.headerCopy
                }
              >
                <Text style={styles.greeting}>
                  {getGreeting()}
                </Text>

                <Text
                  style={styles.welcomeName}
                  numberOfLines={2}
                >
                  {firstName || 'Customer'}
                </Text>

                <Text
                  style={styles.welcomeSubtitle}
                  numberOfLines={2}
                >
                  Find fresh produce from trusted farmers.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() =>
                  router.push(
                    '/(tabs)/profile'
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.profileButton,

                  pressed &&
                    styles.profileButtonPressed,
                ]}
              >
                <Text
                  style={
                    styles.profileInitials
                  }
                >
                  {getInitials(
                    profile?.full_name
                  )}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <View
            style={[
              styles.page,
              {
                width: '100%',
                maxWidth:
                  layout.contentMaxWidth,

                paddingHorizontal:
                  layout.horizontalPadding,
              },
            ]}
          >
          <View
            style={[
              styles.searchCard,
              !layout.isPhone &&
                styles.searchCardWide,
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search for produce, farmers or locations"
              placeholderTextColor={
                colors.muted
              }
              style={
                styles.searchInput
              }
              autoCapitalize="none"
              autoCorrect={
                false
              }
              returnKeyType="search"
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
            />

            {search ? (
              <Pressable
                onPress={() =>
                  setSearch('')
                }
                hitSlop={8}
                style={({
                  pressed,
                }) => [
                  styles.clearButton,

                  pressed &&
                    styles.clearButtonPressed,
                ]}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            style={
              styles.categoryScroller
            }
            contentContainerStyle={
              styles.categoryRow
            }
          >
            {categories.map(
              (category) => {
                const active =
                  selectedCategory ===
                  category;

                return (
                  <Pressable
                    key={
                      category
                    }
                    onPress={() =>
                      setSelectedCategory(
                        category
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.categoryChip,

                      active &&
                        styles.categoryChipActive,

                      pressed &&
                        styles.categoryChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,

                        active &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {
                        category
                      }
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          <View
            style={[
              styles.heroLayout,

              !layout.isPhone &&
                styles.heroLayoutWide,
            ]}
          >
            <View
              style={
                styles.heroMain
              }
            >
              {featuredListing ? (
                <Pressable
                  onPress={() =>
                    openListing(
                      featuredListing.id
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.featuredCard,

                    {
                      height:
                        layout.isPhone
                          ? 204
                          : layout.heroHeight,
                    },

                    pressed &&
                      styles.featuredCardPressed,
                  ]}
                >
                  {featuredImage ? (
                    <Image
                      source={{
                        uri:
                          featuredImage,
                      }}
                      style={
                        StyleSheet.absoluteFill
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={
                        styles.featuredPlaceholder
                      }
                    >
                      <Ionicons
                        name="leaf-outline"
                        size={44}
                        color={colors.farmGreen}
                      />

                      <Text
                        variant="caption"
                        tone="muted"
                      >
                        Produce photo unavailable
                      </Text>
                    </View>
                  )}

                  <Image
                    source={featuredScrim}
                    style={
                      styles.featuredOverlay
                    }
                    resizeMode="stretch"
                  />

                  <View
                    style={
                      styles.featuredContent
                    }
                  >
                    <Text
                      style={
                        styles.featuredEyebrow
                      }
                    >
                      Fresh &amp; Organic
                    </Text>

                    <Text
                      style={
                        styles.featuredHeadline
                      }
                    >
                      Quality produce,
                    </Text>

                    <Text
                      style={
                        styles.featuredSupporting
                      }
                    >
                      straight from our farmers.
                    </Text>

                    <View
                      style={
                        styles.featuredAction
                      }
                    >
                      <Text
                        style={
                          styles.featuredActionText
                        }
                      >
                        Explore Market
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={colors.farmGreen}
                      />
                    </View>
                  </View>
                </Pressable>
              ) : loading ? (
                <View
                  style={[
                    styles.featuredLoading,
                    {
                      height:
                        layout.heroHeight,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.farmGreen
                    }
                  />

                  <Text
                    tone="muted"
                  >
                    Loading fresh produce...
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.featuredLoading,
                    {
                      height:
                        layout.heroHeight,
                    },
                  ]}
                >
                  <Text
                    variant="subtitle"
                  >
                    Marketplace is ready
                  </Text>

                  <Text
                    tone="muted"
                    style={
                      styles.centerText
                    }
                  >
                    Fresh farmer listings will appear here.
                  </Text>
                </View>
              )}
            </View>

          </View>

          <View style={styles.metricsRow}>
            {metrics.map((metric) => (
              <View key={metric.key} style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Ionicons
                    name={metric.icon}
                    size={17}
                    color={colors.farmGreen}
                  />
                </View>

                <Text style={styles.metricValue}>
                  {metric.value}
                </Text>

                <Text style={styles.metricLabel}>
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text style={styles.sectionTitle}>
                Popular this week
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push(
                  '/(tabs)/listings'
                )
              }
              hitSlop={8}
            >
              <Text
                style={
                  styles.seeAllText
                }
              >
                See all
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View
              style={
                styles.stateCard
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
              >
                Loading marketplace...
              </Text>
            </View>
          ) : errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Text
                variant="subtitle"
              >
                Marketplace unavailable
              </Text>

              <Text
                tone="muted"
                style={
                  styles.errorMessage
                }
              >
                {
                  errorMessage
                }
              </Text>

              <Pressable
                onPress={() =>
                  void handleRefresh()
                }
                style={({
                  pressed,
                }) => [
                  styles.retryButton,

                  pressed &&
                    styles.retryButtonPressed,
                ]}
              >
                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : freshListings.length ===
            0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.emptyMark
                }
              >
                <Ionicons
                  name="leaf-outline"
                  size={26}
                  color={colors.farmGreen}
                />
              </View>

              <Text
                variant="subtitle"
              >
                No listings found
              </Text>

              <Text
                tone="muted"
                style={
                  styles.centerText
                }
              >
                Try a different search or category.
              </Text>

              {search ||
              selectedCategory !==
                'All' ? (
                <Pressable
                  onPress={
                    clearFilters
                  }
                  style={
                    styles.clearFiltersButton
                  }
                >
                  <Text
                    style={
                      styles.clearFiltersText
                    }
                  >
                    Clear filters
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.popularScroller}
              contentContainerStyle={styles.popularRow}
            >
              {freshListings.map(
                (listing) => {
                  const farmer =
                    farmers[
                      listing.farmer_id
                    ];

                  const image =
                    resolvedImages[
                      listing.id
                    ];

                  return (
                    <Pressable
                      key={
                        listing.id
                      }
                      onPress={() =>
                        openListing(
                          listing.id
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.productCard,

                        {
                          width:
                            popularCardWidth,
                        },

                        pressed &&
                          styles.productCardPressed,
                      ]}
                    >
                      <View
                        style={
                          styles.productImageWrapper
                        }
                      >
                        {image ? (
                          <Image
                            source={{
                              uri:
                                image,
                            }}
                            resizeMode="cover"
                            style={
                              styles.productImage
                            }
                          />
                        ) : (
                          <View
                            style={
                              styles.productPlaceholder
                            }
                          >
                            <Ionicons
                              name="leaf-outline"
                              size={30}
                              color={colors.muted}
                            />
                          </View>
                        )}

                        {farmer?.is_verified ? (
                          <View
                            style={
                              styles.verifiedBadge
                            }
                          >
                            <Ionicons
                              name="checkmark"
                              size={11}
                              color={colors.emerald}
                            />

                            <Text
                              variant="caption"
                              style={
                                styles.verifiedText
                              }
                            >
                              Verified
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.productBody
                        }
                      >
                        <Text
                          style={
                            styles.productCategory
                          }
                          numberOfLines={1}
                        >
                          {
                            listing.category
                          }
                        </Text>

                        <Text
                          style={
                            styles.productTitle
                          }
                          numberOfLines={1}
                        >
                          {
                            listing.title
                          }
                        </Text>

                        <Text
                          style={
                            styles.productPrice
                          }
                          numberOfLines={1}
                        >
                          {formatPrice(
                            listing.price_per_unit,
                            listing.price_unit
                          )}
                        </Text>

                        <Text
                          variant="caption"
                          tone="muted"
                          numberOfLines={1}
                          style={
                            styles.productFarmerName
                          }
                        >
                          {farmer?.full_name ||
                            'Farmer'}
                          {farmer?.farm_location
                            ? ` · ${farmer.farm_location}`
                            : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          )}

          <View
            style={
              styles.discoveryCard
            }
          >
            <View
              style={
                styles.discoveryMark
              }
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color={colors.farmGreen}
              />
            </View>

            <View
              style={
                styles.discoveryContent
              }
            >
              <Text
                variant="subtitle"
                style={
                  styles.discoveryTitle
                }
              >
                Can’t find what you need?
              </Text>

              <Text
                tone="muted"
                style={
                  styles.discoveryText
                }
              >
                Post a buyer request and let farmers who can supply it contact you.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push(
                  '/(tabs)/requests'
                )
              }
              style={({
                pressed,
              }) => [
                styles.requestButton,

                pressed &&
                  styles.requestButtonPressed,
              ]}
            >
              <Text
                style={
                  styles.requestButtonText
                }
              >
                Post request
              </Text>
            </Pressable>
          </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      paddingHorizontal: 0,
    },

    scrollContent: {
      paddingBottom:
        spacing.xxxl + spacing.xl,
    },

    page: {
      alignSelf: 'center',
    },

    sheet: {
      marginTop: -28,

      paddingTop: spacing.lg,

      paddingBottom: spacing.xl,

      borderTopLeftRadius: radius.xl + 4,

      borderTopRightRadius: radius.xl + 4,

      backgroundColor:
        colors.background,
    },

    hero: {
      backgroundColor:
        colors.farmGreen,

      paddingBottom: 52,
    },

    heroInner: {
      alignSelf: 'center',
    },

    header: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      paddingTop:
        spacing.lg + spacing.xs,
    },

    headerCopy: {
      flex: 1,

      minWidth: 0,

      paddingRight:
        spacing.md,
    },

    greeting: {
      color:
        colors.onDarkMuted,

      fontSize: 13,

      fontWeight: '600',
    },

    welcomeName: {
      marginTop: 2,

      color:
        colors.white,

      fontSize: 28,

      lineHeight: 34,

      fontWeight: '800',

      letterSpacing: -0.5,
    },

    welcomeSubtitle: {
      marginTop: spacing.xs,

      color:
        colors.onDarkMuted,

      fontSize: 14,

      lineHeight: 20,
    },

    profileButton: {
      width: 44,

      height: 44,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.white,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    profileButtonPressed: {
      opacity: 0.86,
    },

    profileInitials: {
      color:
        colors.farmGreen,

      fontWeight: '800',

      fontSize: 15,
    },

    searchCard: {
      minHeight: 50,

      flexDirection: 'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.lg,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surface,

      shadowColor:
        colors.black,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.05,

      shadowRadius: 10,

      elevation: 2,
    },

    searchCardWide: {
      maxWidth: 720,
    },

    searchIcon: {
      marginRight:
        spacing.sm,
    },

    searchInput: {
      flex: 1,

      color:
        colors.text,

      fontSize: 15,

      paddingVertical: 0,

      minHeight: 48,
    },

    clearButton: {
      width: 36,

      height: 36,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surfaceMuted,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    clearButtonPressed: {
      opacity: 0.75,
    },

    categoryScroller: {
      marginTop:
        spacing.lg,

      marginBottom:
        spacing.xl,
    },

    categoryRow: {
      gap:
        spacing.sm,

      paddingRight:
        spacing.lg,
    },

    categoryChip: {
      minHeight: 36,

      paddingHorizontal:
        spacing.lg,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surfaceMuted,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    categoryChipActive: {
      backgroundColor:
        colors.farmGreen,
    },

    categoryChipPressed: {
      opacity: 0.82,
    },

    categoryChipText: {
      color:
        colors.textSecondary,

      fontWeight: '600',

      fontSize: 12.5,
    },

    categoryChipTextActive: {
      color:
        colors.white,
    },

    heroLayout: {
      gap:
        spacing.md,

      marginBottom:
        spacing.md,
    },

    heroLayoutWide: {
      flexDirection: 'row',

      alignItems:
        'stretch',
    },

    heroMain: {
      flex: 2,
    },

    featuredCard: {
      position:
        'relative',

      overflow:
        'hidden',

      borderRadius:
        radius.xl,

      backgroundColor:
        colors.farmGreen,
    },

    featuredCardPressed: {
      opacity: 0.96,
    },

    featuredPlaceholder: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        colors.mintStrong,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    featuredOverlay: {
      ...StyleSheet.absoluteFill,

      width: '100%',

      height: '100%',
    },

    featuredContent: {
      flex: 1,

      justifyContent:
        'flex-end',

      padding:
        spacing.xl,

      maxWidth: 620,
    },

    featuredEyebrow: {
      color: colors.white,

      fontSize: 12.5,

      fontWeight: '700',

      letterSpacing: 0.1,
    },

    featuredHeadline: {
      marginTop: 2,

      color: colors.white,

      fontSize: 21,

      fontWeight: '800',

      lineHeight: 26,
    },

    featuredSupporting: {
      marginTop: 1,

      color: 'rgba(255,255,255,0.94)',

      fontSize: 12.5,

      lineHeight: 18,

      fontWeight: '500',
    },

    featuredAction: {
      alignSelf:
        'flex-start',

      flexDirection: 'row',

      alignItems:
        'center',

      gap: 6,

      marginTop:
        spacing.md,

      minHeight: 36,

      paddingHorizontal:
        spacing.md,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.white,
    },

    featuredActionText: {
      color:
        colors.farmGreen,

      fontWeight: '700',

      fontSize: 12.5,
    },

    featuredLoading: {
      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.xl,

      backgroundColor:
        colors.surface,

      alignItems: 'center',

      justifyContent:
        'center',

      gap:
        spacing.md,

      padding:
        spacing.xl,
    },

    metricsRow: {
      flexDirection: 'row',

      gap:
        spacing.sm,

      marginBottom:
        spacing.xxl,
    },

    metricCard: {
      flex: 1,

      minHeight: 96,

      alignItems: 'center',

      justifyContent:
        'center',

      paddingVertical:
        spacing.md,

      paddingHorizontal:
        spacing.xs,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.lg,

      backgroundColor:
        colors.surface,
    },

    metricIcon: {
      width: 34,

      height: 34,

      borderRadius:
        radius.pill,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.mint,

      marginBottom: 6,
    },

    metricValue: {
      color:
        colors.text,

      fontSize: 17,

      lineHeight: 22,

      fontWeight: '800',
    },

    metricLabel: {
      marginTop: 1,

      color:
        colors.muted,

      fontSize: 10.5,

      lineHeight: 14,

      textAlign: 'center',
    },

    sectionHeader: {
      flexDirection: 'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.lg,
    },

    sectionMeta: {
      marginTop: 4,
    },

    sectionTitle: {
      color:
        colors.text,

      fontSize: 17,

      fontWeight: '800',

      lineHeight: 22,
    },

    popularScroller: {
      marginBottom:
        spacing.sm,
    },

    popularRow: {
      gap:
        spacing.md,

      paddingRight:
        spacing.lg,
    },

    seeAllText: {
      color:
        colors.farmGreen,

      fontWeight: '700',
    },

    productGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      marginBottom:
        spacing.xxxl,
    },

    productCard: {
      overflow:
        'hidden',

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.lg,

      backgroundColor:
        colors.surface,
    },

    productCardPressed: {
      opacity: 0.92,
    },

    productImageWrapper: {
      position:
        'relative',

      height: 148,

      backgroundColor:
        colors.surfaceMuted,
    },

    productImage: {
      width: '100%',

      height: '100%',
    },

    productPlaceholder: {
      flex: 1,

      backgroundColor:
        colors.mint,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    verifiedBadge: {
      position:
        'absolute',

      top:
        spacing.sm,

      left:
        spacing.sm,

      flexDirection: 'row',

      alignItems:
        'center',

      gap: 4,

      paddingHorizontal: 7,

      paddingVertical: 5,

      borderRadius:
        radius.pill,

      backgroundColor:
        'rgba(255,255,255,0.94)',
    },

    verifiedText: {
      color:
        colors.emerald,

      fontWeight: '700',
    },

    productBody: {
      padding:
        spacing.md,
    },

    productCategory: {
      color:
        colors.farmGreen,

      fontWeight: '700',

      fontSize: 10,

      letterSpacing: 0.4,

      textTransform: 'uppercase',

      marginBottom: 3,
    },

    productTitle: {
      color:
        colors.text,

      fontSize: 15,

      fontWeight: '700',

      lineHeight: 20,
    },

    productPrice: {
      color:
        colors.farmGreen,

      fontWeight: '800',

      marginTop: 2,

      fontSize: 14.5,
    },

    productFooter: {
      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth: 1,

      borderTopColor:
        colors.border,
    },

    productFarmer: {
      flexDirection: 'row',

      alignItems:
        'center',
    },

    productAvatar: {
      width: 30,

      height: 30,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.mint,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    productAvatarText: {
      color:
        colors.farmGreen,

      fontSize: 10,

      fontWeight: '800',
    },

    productFarmerCopy: {
      flex: 1,

      marginLeft:
        spacing.sm,
    },

    productFarmerName: {
      marginTop: 4,

      color:
        colors.muted,

      fontSize: 11.5,

      fontWeight: '500',
    },

    stateCard: {
      minHeight: 190,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.lg,

      backgroundColor:
        colors.surface,

      alignItems: 'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,

      gap:
        spacing.sm,

      marginBottom:
        spacing.xxxl,
    },

    errorCard: {
      minHeight: 190,

      borderWidth: 1,

      borderColor:
        '#FECACA',

      borderRadius:
        radius.lg,

      backgroundColor:
        '#FEF2F2',

      justifyContent:
        'center',

      padding:
        spacing.xl,

      marginBottom:
        spacing.xxxl,
    },

    errorMessage: {
      marginTop:
        spacing.sm,

      lineHeight: 21,

      maxWidth: 460,
    },

    retryButton: {
      alignSelf:
        'flex-start',

      minHeight: 42,

      marginTop:
        spacing.lg,

      paddingHorizontal:
        spacing.lg,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.farmGreen,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    retryButtonPressed: {
      opacity: 0.86,
    },

    retryButtonText: {
      color:
        colors.white,

      fontWeight: '700',
    },

    emptyMark: {
      width: 48,

      height: 48,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.mint,

      alignItems: 'center',

      justifyContent:
        'center',

      marginBottom:
        spacing.sm,
    },

    centerText: {
      textAlign:
        'center',

      lineHeight: 20,

      maxWidth: 360,
    },

    clearFiltersButton: {
      minHeight: 42,

      paddingHorizontal:
        spacing.lg,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    clearFiltersText: {
      color:
        colors.farmGreen,

      fontWeight: '700',
    },

    discoveryCard: {
      flexDirection: 'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        colors.mintStrong,

      borderRadius:
        radius.lg,

      backgroundColor:
        colors.mint,

      padding:
        spacing.lg,

      gap:
        spacing.md,
    },

    discoveryMark: {
      width: 42,

      height: 42,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.white,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    discoveryContent: {
      flex: 1,
    },

    discoveryTitle: {
      color:
        colors.farmGreen,

      fontWeight: '700',
    },

    discoveryText: {
      marginTop: 3,

      lineHeight: 19,
    },

    requestButton: {
      minHeight: 44,

      paddingHorizontal:
        spacing.lg,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.farmGreen,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    requestButtonPressed: {
      opacity: 0.86,
    },

    requestButtonText: {
      color:
        colors.white,

      fontWeight: '700',
    },
  });