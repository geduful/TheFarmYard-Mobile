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
import { useResponsiveLayout } from '@/constants/responsive';
import {
  colors,
  radius,
  spacing,
} from '@/constants/tokens';
import { resolveImageUrl } from '@/lib/images/storage-image';
import { supabase } from '@/lib/supabase';

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

type SortMode =
  | 'newest'
  | 'price_low'
  | 'price_high';

const categories = [
  'All',
  'Crops & Grains',
  'Livestock',
  'Poultry',
  'Aquaculture',
  'Other',
];

const sortOptions: {
  value: SortMode;
  label: string;
}[] = [
  {
    value: 'newest',
    label: 'Newest',
  },
  {
    value: 'price_low',
    label: 'Price: Low',
  },
  {
    value: 'price_high',
    label: 'Price: High',
  },
];

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
    return 'Quantity not specified';
  }

  return unit
    ? `${value} ${unit}`
    : String(value);
}

function getNumericPrice(
  value:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const numeric =
    Number(value);

  return Number.isNaN(
    numeric
  )
    ? Number.POSITIVE_INFINITY
    : numeric;
}

export default function MarketScreen() {
  const layout =
    useResponsiveLayout();

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
    search,
    setSearch,
  ] = useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      'newest'
    );

  const [
    verifiedOnly,
    setVerifiedOnly,
  ] = useState(false);

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

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

  const columns =
    layout.isPhone
      ? 1
      : layout.marketColumns;

  const cardWidth =
    columns === 1
      ? availableWidth
      : Math.floor(
          (availableWidth -
            layout.cardGap *
              (columns -
                1)) /
            columns
        );

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
      setErrorMessage('');

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
          'is_approved',
          true
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          'Marketplace listings failed:',
          error.message
        );

        setListings([]);
        setFarmers({});
        setResolvedImages(
          {}
        );

        setErrorMessage(
          'We could not load the marketplace. Pull down to try again.'
        );

        return;
      }

      const fetchedListings =
        (data ??
          []) as Listing[];

      setListings(
        fetchedListings
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

      /*
       * Discovery intentionally uses the
       * public-safe marketplace RPC.
       *
       * Phone numbers are not needed here.
       * They are loaded only at the contact stage.
       */
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
          'Public marketplace farmer profiles failed:',
          farmerError.message
        );

        setFarmers({});
        return;
      }

      const farmerMap:
        FarmerMap = {};

      for (const farmer of (farmerData ??
        []) as FarmerProfile[]) {
        farmerMap[
          farmer.id
        ] = farmer;
      }

      setFarmers(
        farmerMap
      );
    }, [
      resolveListingImages,
    ]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);

      try {
        await loadListings();
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
  }, [loadListings]);

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadListings();
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
    setVerifiedOnly(false);
    setSortMode(
      'newest'
    );
  }

  const filteredListings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        listings.filter(
          (listing) => {
            const farmer =
              farmers[
                listing.farmer_id
              ];

            if (
              selectedCategory !==
                'All' &&
              listing.category !==
                selectedCategory
            ) {
              return false;
            }

            if (
              verifiedOnly &&
              !farmer?.is_verified
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

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

      return filtered.sort(
        (a, b) => {
          if (
            sortMode ===
            'price_low'
          ) {
            return (
              getNumericPrice(
                a.price_per_unit
              ) -
              getNumericPrice(
                b.price_per_unit
              )
            );
          }

          if (
            sortMode ===
            'price_high'
          ) {
            const aPrice =
              getNumericPrice(
                a.price_per_unit
              );

            const bPrice =
              getNumericPrice(
                b.price_per_unit
              );

            if (
              !Number.isFinite(
                aPrice
              ) &&
              !Number.isFinite(
                bPrice
              )
            ) {
              return 0;
            }

            if (
              !Number.isFinite(
                aPrice
              )
            ) {
              return 1;
            }

            if (
              !Number.isFinite(
                bPrice
              )
            ) {
              return -1;
            }

            return (
              bPrice -
              aPrice
            );
          }

          return (
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          );
        }
      );
    }, [
      farmers,
      listings,
      search,
      selectedCategory,
      sortMode,
      verifiedOnly,
    ]);

  const filtersActive =
    Boolean(search) ||
    selectedCategory !==
      'All' ||
    verifiedOnly ||
    sortMode !==
      'newest';

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
          <View style={styles.header}>
            <Text style={styles.heading}>Marketplace</Text>

            <Text style={styles.headerDescription}>
              Fresh produce, better prices
            </Text>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchCard}>
              <Ionicons
                name="search"
                size={18}
                color={colors.textSecondary}
                style={styles.searchIcon}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search products, farmers or locations"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
              />

              {search ? (
                <Pressable
                  onPress={() => setSearch('')}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.clearSearchButton,
                    pressed && styles.clearSearchButtonPressed,
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle marketplace filters"
              accessibilityState={{ expanded: filtersOpen }}
              onPress={() => setFiltersOpen((current) => !current)}
              style={({ pressed }) => [
                styles.filterButton,
                (filtersOpen || filtersActive) &&
                  styles.filterButtonActive,
                pressed && styles.controlPressed,
              ]}
            >
              <Ionicons
                name="options-outline"
                size={21}
                color={
                  filtersOpen || filtersActive
                    ? colors.white
                    : colors.farmGreen
                }
              />
            </Pressable>
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

          {filtersOpen ? (
            <View style={styles.controlSection}>
              <View style={styles.controlTopRow}>
                <Pressable
                  onPress={() => setVerifiedOnly((current) => !current)}
                  style={({ pressed }) => [
                    styles.verifiedControl,
                    verifiedOnly && styles.verifiedControlActive,
                    pressed && styles.controlPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.verificationDot,
                      verifiedOnly && styles.verificationDotActive,
                    ]}
                  />

                  <Text
                    style={[
                      styles.verifiedControlText,
                      verifiedOnly && styles.verifiedControlTextActive,
                    ]}
                  >
                    Verified farmers only
                  </Text>
                </Pressable>

                {filtersActive ? (
                  <Pressable onPress={clearFilters} hitSlop={8}>
                    <Text style={styles.clearFiltersText}>
                      Reset
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sortRow}
              >
                {sortOptions.map((option) => {
                  const active = sortMode === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setSortMode(option.value)}
                      style={({ pressed }) => [
                        styles.sortChip,
                        active && styles.sortChipActive,
                        pressed && styles.controlPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          active && styles.sortChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

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
          ) : filteredListings.length ===
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
                <View
                  style={
                    styles.emptyStem
                  }
                />

                <View
                  style={
                    styles.emptyLeaf
                  }
                />
              </View>

              <Text
                variant="subtitle"
              >
                No listings match
              </Text>

              <Text
                tone="muted"
                style={
                  styles.emptyText
                }
              >
                Adjust your search, category, verification or price filters.
              </Text>

              {filtersActive ? (
                <Pressable
                  onPress={
                    clearFilters
                  }
                  style={
                    styles.emptyResetButton
                  }
                >
                  <Text
                    style={
                      styles.emptyResetText
                    }
                  >
                    Clear all filters
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.grid,

                {
                  gap:
                    layout.cardGap,
                },
              ]}
            >
              {filteredListings.map(
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
                      key={listing.id}
                      onPress={() => openListing(listing.id)}
                      style={({ pressed }) => [
                        styles.card,
                        { width: cardWidth },
                        pressed && styles.cardPressed,
                      ]}
                    >
                      <View style={styles.imageWrapper}>
                        {image ? (
                          <Image
                            source={{ uri: image }}
                            style={styles.image}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <View style={styles.plantMark}>
                              <View style={styles.plantStem} />
                              <View style={styles.plantLeaf} />
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardBody}>
                        <View style={styles.cardTopMeta}>
                          <Text
                            variant="subtitle"
                            numberOfLines={2}
                            style={styles.title}
                          >
                            {listing.title}
                          </Text>

                          {farmer?.is_verified ? (
                            <View style={styles.verifiedBadge}>
                              <Ionicons
                                name="checkmark-circle"
                                size={13}
                                color={colors.emerald}
                              />

                              <Text
                                variant="caption"
                                style={styles.verifiedBadgeText}
                              >
                                Verified
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text
                          variant="caption"
                          tone="muted"
                          numberOfLines={1}
                          style={styles.metaText}
                        >
                          {listing.category}
                          {farmer?.farm_location
                            ? ` • ${farmer.farm_location}`
                            : ''}
                        </Text>

                        <Text style={styles.price} numberOfLines={1}>
                          {formatPrice(
                            listing.price_per_unit,
                            listing.price_unit
                          )}
                        </Text>

                        <View style={styles.cardFooter}>
                          <Text
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                            style={styles.farmerName}
                          >
                            {farmer?.full_name || 'TheFarmYard Farmer'}
                          </Text>

                          {listing.quantity_available !== null ? (
                            <Text
                              variant="caption"
                              tone="muted"
                              numberOfLines={1}
                            >
                              {formatQuantity(
                                listing.quantity_available,
                                listing.price_unit
                              )}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>
          )}

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

    header: {
      paddingTop: spacing.sm,

      marginBottom: spacing.md,

      gap: 2,
    },

    heading: {
      maxWidth: 420,

      color: colors.text,

      fontSize: 26,

      fontWeight: '800',

      lineHeight: 32,
    },

    headerDescription: {
      maxWidth: 570,

      color: colors.textSecondary,

      fontSize: 13,

      lineHeight: 18,
    },

    searchRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: spacing.sm,
    },

    searchCard: {
      flex: 1,

      minHeight: 50,

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: spacing.lg,

      borderWidth: 1,

      borderColor: colors.border,

      borderRadius: radius.pill,

      backgroundColor: colors.surface,
    },

    searchIcon: {
      marginRight: spacing.sm,
    },

    searchInput: {
      flex: 1,

      minHeight: 44,

      paddingVertical: 0,

      color: colors.text,

      fontSize: 14,
    },

    clearSearchButton: {
      width: 28,

      height: 28,

      borderRadius: radius.pill,

      backgroundColor: colors.surfaceMuted,

      alignItems: 'center',

      justifyContent: 'center',
    },

    clearSearchButtonPressed: {
      opacity: 0.7,
    },

    filterButton: {
      width: 48,

      height: 48,

      borderWidth: 1,

      borderColor: colors.border,

      borderRadius: radius.lg,

      backgroundColor: colors.surface,

      alignItems: 'center',

      justifyContent: 'center',
    },

    filterButtonActive: {
      borderColor: colors.farmGreen,

      backgroundColor: colors.farmGreen,
    },

    categoryScroller: {
      marginTop: spacing.md,

      marginBottom: spacing.sm,
    },

    categoryRow: {
      gap: spacing.sm,

      paddingRight: spacing.lg,
    },

    categoryChip: {
      minHeight: 34,

      paddingHorizontal: spacing.md,

      borderRadius: radius.pill,

      backgroundColor: colors.surfaceMuted,

      alignItems: 'center',

      justifyContent: 'center',
    },

    categoryChipActive: {
      backgroundColor: colors.farmGreen,
    },

    categoryChipPressed: {
      opacity: 0.82,
    },

    categoryChipText: {
      color: colors.textSecondary,

      fontWeight: '600',

      fontSize: 12.5,
    },

    categoryChipTextActive: {
      color: colors.white,
    },

    controlSection: {
      marginTop: spacing.sm,

      marginBottom: spacing.md,

      gap: spacing.md,

      padding: spacing.md,

      borderWidth: 1,

      borderColor: colors.border,

      borderRadius: radius.lg,

      backgroundColor: colors.surfaceMuted,
    },

    controlTopRow: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      gap: spacing.md,
    },

    verifiedControl: {
      minHeight: 42,

      flexDirection: 'row',

      alignItems: 'center',

      gap:
        spacing.sm,

      paddingHorizontal:
        spacing.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.surface,
    },

    verifiedControlActive: {
      borderColor:
        '#B7D6B4',

      backgroundColor:
        '#F1F7F1',
    },

    verificationDot: {
      width: 8,

      height: 8,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.muted,
    },

    verificationDotActive: {
      backgroundColor:
        colors.emerald,
    },

    verifiedControlText: {
      color:
        colors.textSecondary,

      fontWeight: '600',

      fontSize: 13,
    },

    verifiedControlTextActive: {
      color:
        colors.farmGreen,
    },

    sortRow: {
      gap:
        spacing.sm,

      paddingRight:
        spacing.lg,
    },

    sortChip: {
      minHeight: 42,

      paddingHorizontal:
        spacing.md,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    sortChipActive: {
      backgroundColor:
        colors.surfaceMuted,

      borderColor:
        colors.farmGreen,
    },

    sortChipText: {
      color:
        colors.textSecondary,

      fontSize: 13,

      fontWeight: '600',
    },

    sortChipTextActive: {
      color:
        colors.farmGreen,

      fontWeight: '700',
    },

    controlPressed: {
      opacity: 0.76,
    },

    clearFiltersText: {
      color: colors.farmGreen,

      fontWeight: '700',

      fontSize: 13,
    },

    grid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      marginTop: spacing.xs,

      marginBottom: spacing.xxxl,
    },

    card: {
      flexDirection: 'row',

      alignItems: 'center',

      padding: spacing.sm,

      overflow: 'hidden',

      borderWidth: 1,

      borderColor: colors.border,

      borderRadius: radius.lg,

      backgroundColor: colors.surface,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,

        height: 1,
      },

      shadowOpacity: 0.05,

      shadowRadius: 4,

      elevation: 1,
    },

    cardPressed: {
      opacity: 0.92,
    },

    imageWrapper: {
      width: 104,

      height: 104,

      position: 'relative',

      overflow: 'hidden',

      borderRadius: radius.md,

      backgroundColor: colors.surfaceMuted,
    },

    image: {
      width: '100%',

      height: '100%',
    },

    imagePlaceholder: {
      flex: 1,

      backgroundColor: '#F1F7F1',

      alignItems: 'center',

      justifyContent: 'center',
    },

    plantMark: {
      width: 46,

      height: 46,

      position:
        'relative',
    },

    plantStem: {
      position:
        'absolute',

      width: 3,

      height: 32,

      left: 22,

      bottom: 3,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.farmGreen,
    },

    plantLeaf: {
      position:
        'absolute',

      width: 21,

      height: 14,

      left: 23,

      top: 7,

      borderTopLeftRadius: 14,

      borderBottomRightRadius: 14,

      backgroundColor:
        colors.farmGreen,
    },

    verifiedBadge: {
      flexShrink: 0,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 3,

      marginLeft: spacing.sm,

      marginTop: 1,

      paddingHorizontal: 6,

      paddingVertical: 2,

      borderRadius: radius.pill,

      backgroundColor: colors.surfaceMuted,
    },

    verifiedBadgeText: {
      color: colors.emerald,

      fontSize: 10,

      fontWeight: '700',
    },

    cardBody: {
      flex: 1,

      justifyContent: 'center',

      minWidth: 0,

      paddingHorizontal: spacing.md,

      paddingVertical: spacing.xs,
    },

    cardTopMeta: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      justifyContent: 'space-between',
    },

    title: {
      flex: 1,

      color: colors.text,

      fontSize: 16,

      fontWeight: '700',

      lineHeight: 20,
    },

    metaText: {
      marginTop: 2,

      color: colors.textSecondary,

      fontSize: 11.5,

      lineHeight: 15,
    },

    price: {
      color: colors.text,

      fontSize: 16,

      fontWeight: '800',

      marginTop: spacing.xs,
    },

    cardFooter: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      gap: spacing.sm,

      marginTop: spacing.xs,
    },

    farmerName: {
      flexShrink: 1,

      color: colors.textSecondary,

      fontSize: 11,

      fontWeight: '500',
    },

    stateCard: {
      minHeight: 220,

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

      padding:
        spacing.xl,

      justifyContent:
        'center',

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
      width: 54,

      height: 54,

      position:
        'relative',

      marginBottom:
        spacing.sm,
    },

    emptyStem: {
      position:
        'absolute',

      width: 3,

      height: 34,

      left: 26,

      bottom: 4,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.farmGreen,
    },

    emptyLeaf: {
      position:
        'absolute',

      width: 22,

      height: 15,

      left: 27,

      top: 7,

      borderTopLeftRadius: 14,

      borderBottomRightRadius: 14,

      backgroundColor:
        colors.farmGreen,
    },

    emptyText: {
      maxWidth: 370,

      textAlign: 'center',

      lineHeight: 20,
    },

    emptyResetButton: {
      minHeight: 42,

      paddingHorizontal:
        spacing.lg,

      marginTop:
        spacing.sm,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    emptyResetText: {
      color:
        colors.farmGreen,

      fontWeight: '700',
    },
  });