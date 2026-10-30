import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import { supabase } from '@/lib/supabase';

type BuyRequest = {
  id: number;
  buyer_id: string;
  commodity_title: string;
  category: string;
  quantity_required: string | null;
  delivery_location: string | null;
  deadline: string;
  additional_notes: string | null;
  status: string | null;
  created_at: string;
};

type BuyerProfile = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  farm_location: string | null;
};

type BuyerMap = Record<string, BuyerProfile>;

const categories = [
  'All',
  'Crops & Grains',
  'Livestock',
  'Poultry',
  'Aquaculture',
  'Other',
];

function getTodayDateString() {
  const now = new Date();

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

function formatDate(
  value: string
) {
  const date =
    new Date(
      `${value}T00:00:00`
    );

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

function formatCreatedAt(
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
    }
  );
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

function getInitials(
  name?: string | null
) {
  if (!name?.trim()) {
    return 'B';
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

export default function FarmerRequestsScreen() {
  const [
    requests,
    setRequests,
  ] =
    useState<BuyRequest[]>(
      []
    );

  const [
    buyers,
    setBuyers,
  ] =
    useState<BuyerMap>({});

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

  const [
    search,
    setSearch,
  ] = useState('');

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

  const [
    contactingKey,
    setContactingKey,
  ] =
    useState<string | null>(
      null
    );

  const layout = useResponsiveLayout();
  const isPhone = layout.isPhone;

  const loadRequests =
    useCallback(async () => {
      setErrorMessage('');

      const {
        data,
        error,
      } = await supabase
        .from(
          'buy_requests'
        )
        .select(
          `
            id,
            buyer_id,
            commodity_title,
            category,
            quantity_required,
            delivery_location,
            deadline,
            additional_notes,
            status,
            created_at
          `
        )
        .eq(
          'status',
          'open'
        )
        .gte(
          'deadline',
          getTodayDateString()
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

      if (error) {
        console.error(
          'Failed to load farmer buyer requests:',
          error.message
        );

        setRequests([]);
        setBuyers({});

        setErrorMessage(
          'We could not load buyer requests. Pull down to try again.'
        );

        return;
      }

      const requestRows =
        (data ??
          []) as BuyRequest[];

      setRequests(
        requestRows
      );

      if (
        requestRows.length ===
        0
      ) {
        setBuyers({});
        return;
      }

      const buyerIds =
        Array.from(
          new Set(
            requestRows
              .map(
                (request) =>
                  request.buyer_id
              )
              .filter(Boolean)
          )
        );

      if (
        buyerIds.length ===
        0
      ) {
        setBuyers({});
        return;
      }

      /*
       * Cross-user buyer profiles are loaded only
       * through the scoped marketplace RPC.
       */
      const {
        data: profileData,
        error: profileError,
      } = await supabase.rpc(
        'get_marketplace_buyer_profiles',
        {
          p_buyer_ids:
            buyerIds,
        }
      );

      if (profileError) {
        console.error(
          'Failed to load marketplace buyer profiles:',
          profileError.message
        );

        /*
         * Requests remain visible even if contact
         * profile loading fails.
         */
        setBuyers({});

        return;
      }

      const profileMap: BuyerMap =
        {};

      for (const profile of (
        profileData ?? []
      ) as BuyerProfile[]) {
        profileMap[
          profile.id
        ] = profile;
      }

      setBuyers(
        profileMap
      );
    }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);

      try {
        await loadRequests();
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [loadRequests]);

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadRequests();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCall(
    requestId: number,
    phoneNumber:
      string | null
  ) {
    if (
      !phoneNumber?.trim()
    ) {
      Alert.alert(
        'Phone unavailable',
        'This buyer has not provided a phone number.'
      );

      return;
    }

    const contactKey =
      `call-${requestId}`;

    if (contactingKey) {
      return;
    }

    setContactingKey(
      contactKey
    );

    try {
      const normalizedPhone =
        normalizeGhanaPhone(
          phoneNumber
        );

      const url =
        `tel:${normalizedPhone}`;

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
        'Failed to open phone:',
        error
      );

      Alert.alert(
        'Unable to call',
        'We could not open the phone app.'
      );
    } finally {
      setContactingKey(
        null
      );
    }
  }

  async function handleWhatsApp(
    request: BuyRequest,
    buyer: BuyerProfile
  ) {
    if (
      !buyer.phone_number?.trim()
    ) {
      Alert.alert(
        'Phone unavailable',
        'This buyer has not provided a phone number.'
      );

      return;
    }

    const contactKey =
      `whatsapp-${request.id}`;

    if (contactingKey) {
      return;
    }

    setContactingKey(
      contactKey
    );

    try {
      const whatsappPhone =
        normalizeWhatsAppPhone(
          buyer.phone_number
        );

      const message = [
        `Hello ${
          buyer.full_name ||
          'there'
        },`,
        '',
        `I saw your request for ${request.commodity_title} on TheFarmYard.`,
        `Quantity: ${
          request.quantity_required ||
          'Not specified'
        }`,
        `Location: ${
          request.delivery_location ||
          'Not specified'
        }`,
        `Needed by: ${formatDate(
          request.deadline
        )}`,
        '',
        'I may be able to supply it. Can we discuss the details?',
      ].join('\n');

      const url =
        `https://wa.me/${whatsappPhone}` +
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
        'WhatsApp unavailable',
        'We could not open WhatsApp on this device.'
      );
    } finally {
      setContactingKey(
        null
      );
    }
  }

  const filteredRequests =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const buyer =
            buyers[
              request.buyer_id
            ];

          const matchesCategory =
            selectedCategory ===
              'All' ||
            request.category ===
              selectedCategory;

          if (
            !matchesCategory
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchableText =
            [
              request.commodity_title,
              request.category,
              request.quantity_required,
              request.delivery_location,
              request.additional_notes,
              buyer?.full_name,
              buyer?.farm_location,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [
      buyers,
      requests,
      search,
      selectedCategory,
    ]);

  const filtersActive =
    search.trim().length >
      0 ||
    selectedCategory !==
      'All';

  function clearFilters() {
    setSearch('');

    setSelectedCategory(
      'All'
    );
  }

  const categoryChips = categories.map(
    (item) => {
      const active =
        selectedCategory ===
        item;

      return (
        <Pressable
          key={
            item
          }
          onPress={() =>
            setSelectedCategory(
              item
            )
          }
          style={[
            styles.categoryChip,

            active &&
              styles.categoryChipActive,
          ]}
        >
          <Text
            variant="caption"
            style={[
              styles.categoryChipText,

              active &&
                styles.categoryChipTextActive,
            ]}
          >
            {
              item
            }
          </Text>
        </Pressable>
      );
    }
  );

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

  const cardColumns =
    isPhone
      ? 1
      : 2;

  const cardWidth =
    cardColumns === 1
      ? availableWidth
      : Math.floor(
          (availableWidth -
            layout.cardGap *
              (cardColumns -
                1)) /
            cardColumns
        );

  const showEmptyState =
    !loading &&
    !errorMessage &&
    requests.length === 0 &&
    !filtersActive;

  if (showEmptyState) {
    return (
      <Screen style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.emptyScreenContent
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
          <View style={styles.emptyState}>
            <View style={styles.emptyMark}>
              <Ionicons
                name="leaf"
                size={34}
                color={colors.farmGreen}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No requests yet
            </Text>

            <Text style={styles.emptyText}>
              You&apos;ll see buyer requests here once you start getting demand for your listings.
            </Text>
          </View>
        </ScrollView>
      </Screen>
    );
  }

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
          <View
            style={
              styles.header
            }
          >
            <View
              style={styles.headerText}
            >
              <Text variant="hero">
                Buyer requests
              </Text>

              <Text
                tone="muted"
                style={[
                  styles.subtitle,

                  !isPhone &&
                    { maxWidth: 560 },
                ]}
              >
                Find active buyer demand and connect directly with buyers who need what you supply.
              </Text>
            </View>
          </View>

          <View
            style={styles.summaryCard}
          >
            <View
              style={styles.summaryContent}
            >
              <Text
                variant="caption"
                tone="muted"
                style={styles.summaryEyebrow}
              >
                MARKET DEMAND
              </Text>

              <Text
                variant="title"
                tone="inverse"
                style={styles.summaryTitle}
              >
                Find demand before you sell
              </Text>

              <Text
                variant="caption"
                tone="inverse"
                style={styles.summaryText}
              >
                These are active buyer requests that have not passed their deadline.
              </Text>
            </View>

            <View
              style={styles.summaryMetric}
            >
              <Text
                style={styles.summaryMetricValue}
              >
                {loading
                  ? '—'
                  : requests.length}
              </Text>

              <Text
                variant="caption"
                style={styles.summaryMetricLabel}
              >
                OPEN
              </Text>
            </View>
          </View>

          <View
            style={styles.searchCard}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.farmGreen}
              style={styles.searchIcon}
            />

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search produce, buyer or location"
              placeholderTextColor={
                colors.muted
              }
              style={
                styles.searchInput
              }
              autoCapitalize="none"
              autoCorrect={false}
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
                style={
                  styles.clearButton
                }
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>

          <View
            style={styles.categoryHeader}
          >
            <Text
              variant="caption"
              tone="muted"
              style={styles.categoryHeaderText}
            >
              CATEGORY
            </Text>

            {filtersActive ? (
              <Pressable
                onPress={
                  clearFilters
                }
                hitSlop={8}
              >
                <Text
                  style={styles.resetText}
                >
                  Reset
                </Text>
              </Pressable>
            ) : null}
          </View>

          {isPhone ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.categoryRow
              }
            >
              {categoryChips}
            </ScrollView>
          ) : (
            <View
              style={
                styles.categoryRowWide
              }
            >
              {categoryChips}
            </View>
          )}

          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text variant="title">
                Open demand
              </Text>

              {!loading ? (
                <Text
                  variant="caption"
                  tone="muted"
                  style={styles.sectionCount}
                >
                  {
                    filteredRequests.length
                  }{' '}
                  {filteredRequests.length ===
                  1
                    ? 'opportunity'
                    : 'opportunities'}
                </Text>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View
              style={styles.stateCard}
            >
              <ActivityIndicator
                size="small"
                color={
                  colors.farmGreen
                }
              />

              <Text tone="muted">
                Loading buyer requests...
              </Text>
            </View>
          ) : errorMessage ? (
            <View
              style={styles.errorCard}
            >
              <Text variant="subtitle">
                Requests unavailable
              </Text>

              <Text
                tone="muted"
                style={styles.errorText}
              >
                {errorMessage}
              </Text>

              <Pressable
                onPress={() =>
                  void handleRefresh()
                }
                style={
                  styles.retryButton
                }
              >
                <Text
                  style={styles.retryText}
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : filteredRequests.length ===
            0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyMark}>
                <Ionicons
                  name="leaf-outline"
                  size={30}
                  color={colors.farmGreen}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {filtersActive
                  ? 'No matching requests'
                  : 'No requests yet'}
              </Text>

              <Text
                style={styles.emptyText}
              >
                {filtersActive
                  ? 'Try another search or category.'
                  : "You'll see buyer requests here once you start getting demand for your listings."}
              </Text>

              {filtersActive ? (
                <Pressable
                  onPress={clearFilters}
                  style={styles.emptyButton}
                >
                  <Text style={styles.emptyButtonText}>
                    Clear filters
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.requestList,

                {
                  gap:
                    layout.cardGap,
                },

                !isPhone &&
                  styles.requestListGrid,
              ]}
            >
              {filteredRequests.map(
                (request) => {
                  const buyer =
                    buyers[
                      request.buyer_id
                    ];

                  const callKey =
                    `call-${request.id}`;

                  const whatsappKey =
                    `whatsapp-${request.id}`;

                  const contactingCall =
                    contactingKey ===
                    callKey;

                  const contactingWhatsApp =
                    contactingKey ===
                    whatsappKey;

                  const contactAvailable =
                    Boolean(
                      buyer?.phone_number?.trim()
                    );

                  return (
                    <View
                      key={request.id}
                      style={[
                        styles.requestCard,

                        !isPhone &&
                          { width: cardWidth },
                      ]}
                    >
                      <View
                        style={styles.cardTop}
                      >
                        <View
                          style={styles.openBadge}
                        >
                          <View
                            style={styles.openDot}
                          />

                          <Text
                            variant="caption"
                            style={styles.openBadgeText}
                          >
                            OPEN
                          </Text>
                        </View>

                        <Text
                          variant="caption"
                          tone="muted"
                        >
                          {formatCreatedAt(
                            request.created_at
                          )}
                        </Text>
                      </View>

                      <Text
                        variant="title"
                        numberOfLines={2}
                        style={styles.requestTitle}
                      >
                        {
                          request.commodity_title
                        }
                      </Text>

                      <View
                        style={styles.categoryBadge}
                      >
                        <Text
                          variant="caption"
                          style={styles.categoryBadgeText}
                        >
                          {
                            request.category
                          }
                        </Text>
                      </View>

                      <View
                        style={styles.detailsGrid}
                      >
                        <View
                          style={styles.detailCard}
                        >
                          <Text
                            variant="caption"
                            tone="muted"
                          >
                            QUANTITY
                          </Text>

                          <Text
                            style={styles.detailValue}
                            numberOfLines={2}
                          >
                            {request.quantity_required ||
                              'Not specified'}
                          </Text>
                        </View>

                        <View
                          style={styles.detailCard}
                        >
                          <Text
                            variant="caption"
                            tone="muted"
                          >
                            NEEDED BY
                          </Text>

                          <Text
                            style={styles.detailValue}
                          >
                            {formatDate(
                              request.deadline
                            )}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={styles.deliverySection}
                      >
                        <Text
                          variant="caption"
                          tone="muted"
                        >
                          DELIVERY / COLLECTION
                        </Text>

                        <Text
                          style={styles.deliveryValue}
                        >
                          {request.delivery_location ||
                            'Not specified'}
                        </Text>
                      </View>

                      {request.additional_notes ? (
                        <View
                          style={styles.notesCard}
                        >
                          <Text
                            variant="caption"
                            tone="muted"
                            style={styles.notesLabel}
                          >
                            BUYER NOTES
                          </Text>

                          <Text
                            tone="secondary"
                            style={styles.notesText}
                          >
                            {
                              request.additional_notes
                            }
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={styles.buyerSection}
                      >
                        <View
                          style={styles.buyerAvatar}
                        >
                          <Text
                            style={styles.buyerAvatarText}
                          >
                            {getInitials(
                              buyer?.full_name
                            )}
                          </Text>
                        </View>

                        <View
                          style={styles.buyerInfo}
                        >
                          <View
                            style={styles.buyerNameRow}
                          >
                            <Text
                              variant="subtitle"
                              numberOfLines={1}
                              style={styles.buyerName}
                            >
                              {buyer?.full_name ||
                                'TheFarmYard Buyer'}
                            </Text>

                            <View
                              style={styles.buyerLabel}
                            >
                              <Text
                                variant="caption"
                                style={styles.buyerLabelText}
                              >
                                BUYER
                              </Text>
                            </View>
                          </View>

                          <Text
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                            style={styles.buyerLocation}
                          >
                            {buyer?.farm_location ||
                              request.delivery_location ||
                              'Location not provided'}
                          </Text>
                        </View>
                      </View>

                      {contactAvailable &&
                      buyer ? (
                        <View style={styles.actions}>
                          <Pressable
                            onPress={() =>
                              void handleCall(
                                request.id,
                                buyer.phone_number
                              )
                            }
                            disabled={
                              contactingKey !==
                              null
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.callButton,

                              pressed &&
                                contactingKey ===
                                  null &&
                                styles.callButtonPressed,

                              contactingKey !==
                                null &&
                                styles.disabledButton,
                            ]}
                          >
                            {contactingCall ? (
                              <ActivityIndicator
                                size="small"
                                color={
                                  colors.farmGreen
                                }
                              />
                            ) : (
                              <>
                                <View
                                  style={styles.callIcon}
                                />

                                <Text
                                  style={styles.callButtonText}
                                >
                                  Call buyer
                                </Text>
                              </>
                            )}
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              void handleWhatsApp(
                                request,
                                buyer
                              )
                            }
                            disabled={
                              contactingKey !==
                              null
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.whatsappButton,

                              pressed &&
                                contactingKey ===
                                  null &&
                                styles.whatsappButtonPressed,

                              contactingKey !==
                                null &&
                                styles.disabledButton,
                            ]}
                          >
                            {contactingWhatsApp ? (
                              <ActivityIndicator
                                size="small"
                                color={
                                  colors.white
                                }
                              />
                            ) : (
                              <>
                                <View
                                  style={styles.whatsappIcon}
                                >
                                  <View
                                    style={styles.whatsappIconInner}
                                  />
                                </View>

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
                        <View
                          style={styles.noContactCard}
                        >
                          <View
                            style={styles.noContactMark}
                          />

                          <Text
                            variant="caption"
                            tone="muted"
                            style={styles.noContactText}
                          >
                            Buyer contact information is unavailable for this request.
                          </Text>
                        </View>
                      )}
                    </View>
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

  header: {
    paddingTop:
      spacing.lg,

    marginBottom:
      spacing.xl,
  },

  headerText: {
    flex: 1,
  },

  subtitle: {
    marginTop:
      spacing.xs,

    lineHeight: 21,

    maxWidth: 330,
  },

  summaryCard: {
    minHeight: 150,

    flexDirection:
      'row',

    alignItems:
      'center',

    borderRadius:
      radius.xl,

    backgroundColor:
      colors.farmGreen,

    padding:
      spacing.lg,

    marginTop:
      spacing.lg,

    marginBottom:
      spacing.xl,
  },

  summaryContent: {
    flex: 1,

    paddingRight:
      spacing.lg,
  },

  summaryEyebrow: {
    color:
      colors.onDarkMuted,

    fontWeight:
      '800',

    letterSpacing: 0.8,

    textTransform:
      'uppercase',
  },

  summaryTitle: {
    marginTop:
      spacing.sm,
  },

  summaryText: {
    marginTop:
      spacing.sm,

    lineHeight: 19,

    opacity: 0.86,
  },

  summaryMetric: {
    width: 64,

    height: 64,

    borderRadius:
      radius.lg,

    backgroundColor:
      'rgba(255, 255, 255, 0.12)',

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  summaryMetricValue: {
    color:
      colors.white,

    fontSize: 24,

    fontWeight:
      '800',
  },

  summaryMetricLabel: {
    color:
      colors.onDarkMuted,

    marginTop: 1,

    fontWeight:
      '700',
  },

  searchCard: {
    minHeight: 52,

    flexDirection:
      'row',

    alignItems:
      'center',

    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,

    paddingHorizontal:
      spacing.md,

    marginBottom:
      spacing.lg,
  },

  searchIcon: {
    marginRight:
      spacing.md,
  },

  searchInput: {
    flex: 1,

    color:
      colors.text,

    fontSize: 15,

    paddingVertical:
      spacing.md,
  },

  clearButton: {
    width: 34,

    height: 34,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.surfaceMuted,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  categoryHeader: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    marginBottom:
      spacing.sm,
  },

  categoryHeaderText: {
    fontWeight:
      '700',

    letterSpacing: 0.5,
  },

  resetText: {
    color:
      colors.farmGreen,

    fontSize: 14,

    fontWeight:
      '700',
  },

  categoryRow: {
    gap:
      spacing.sm,
  },

  categoryRowWide: {
    flexDirection:
      'row',

    flexWrap:
      'wrap',

    gap:
      spacing.sm,
  },

  categoryChip: {
    minHeight: 36,

    borderWidth: 1,

    borderColor:
      colors.border,

    backgroundColor:
      colors.surface,

    paddingHorizontal:
      spacing.md,

    borderRadius:
      radius.pill,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  categoryChipActive: {
    backgroundColor:
      colors.farmGreen,

    borderColor:
      colors.farmGreen,
  },

  categoryChipText: {
    color:
      colors.textSecondary,

    fontWeight: '600',

    fontSize: 13,
  },

  categoryChipTextActive: {
    color:
      colors.white,

    fontWeight: '700',
  },

  sectionHeader: {
    marginBottom:
      spacing.lg,
  },

  sectionCount: {
    marginTop: 3,
  },

  requestList: {
    gap:
      spacing.md,
  },

  requestListGrid: {
    flexDirection:
      'row',

    flexWrap:
      'wrap',
  },

  requestCard: {
    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,

    padding:
      spacing.md,
  },

  cardTop: {
    flexDirection:
      'row',

    justifyContent:
      'space-between',

    alignItems:
      'center',
  },

  openBadge: {
    minHeight: 26,

    flexDirection:
      'row',

    alignItems:
      'center',

    gap: 6,

    backgroundColor:
      '#ECFDF5',

    borderRadius:
      radius.pill,

    paddingHorizontal:
      spacing.sm,
  },

  openDot: {
    width: 6,

    height: 6,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.emerald,
  },

  openBadgeText: {
    color:
      colors.emerald,

    fontWeight:
      '800',

    letterSpacing: 0.4,

    fontSize: 11,
  },

  requestTitle: {
    marginTop:
      spacing.md,
  },

  categoryBadge: {
    alignSelf:
      'flex-start',

    marginTop:
      spacing.sm,

    backgroundColor:
      colors.mint,

    borderRadius:
      radius.pill,

    paddingHorizontal:
      spacing.sm,

    paddingVertical: 5,
  },

  categoryBadgeText: {
    color:
      colors.farmGreen,

    fontWeight: '700',

    fontSize: 11,
  },

  detailsGrid: {
    flexDirection:
      'row',

    gap:
      spacing.sm,

    marginTop:
      spacing.lg,
  },

  detailCard: {
    flex: 1,

    minHeight: 70,

    padding:
      spacing.md,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.surfaceMuted,
  },

  detailValue: {
    color:
      colors.text,

    fontWeight:
      '700',

    marginTop: 4,
  },

  deliverySection: {
    marginTop:
      spacing.md,

    paddingTop:
      spacing.md,

    borderTopWidth: 1,

    borderTopColor:
      colors.border,

    gap: 4,
  },

  deliveryValue: {
    color:
      colors.text,

    fontWeight: '600',

    lineHeight: 20,
  },

  notesCard: {
    marginTop:
      spacing.md,

    padding:
      spacing.md,

    borderRadius:
      radius.md,

    backgroundColor:
      '#F8FAF8',
  },

  notesLabel: {
    fontWeight: '600',

    marginBottom:
      spacing.xs,
  },

  notesText: {
    lineHeight: 20,
  },

  buyerSection: {
    flexDirection:
      'row',

    alignItems:
      'center',

    marginTop:
      spacing.lg,

    paddingTop:
      spacing.lg,

    borderTopWidth: 1,

    borderTopColor:
      colors.border,
  },

  buyerAvatar: {
    width: 44,

    height: 44,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.mint,

    borderWidth: 1,

    borderColor:
      '#DCE9DA',

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  buyerAvatarText: {
    color:
      colors.farmGreen,

    fontSize: 15,

    fontWeight: '800',
  },

  buyerInfo: {
    flex: 1,

    marginLeft:
      spacing.md,
  },

  buyerNameRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,
  },

  buyerName: {
    flexShrink: 1,
  },

  buyerLabel: {
    paddingHorizontal: 7,

    paddingVertical: 3,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.surfaceMuted,
  },

  buyerLabelText: {
    color:
      colors.textSecondary,

    fontSize: 10,

    fontWeight: '800',
  },

  buyerLocation: {
    marginTop: 3,
  },

  actions: {
    flexDirection:
      'row',

    gap:
      spacing.sm,

    marginTop:
      spacing.lg,
  },

  callButton: {
    flex: 1,

    minHeight: 44,

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      spacing.sm,

    borderWidth: 1,

    borderColor:
      colors.farmGreen,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.surface,
  },

  callButtonPressed: {
    backgroundColor:
      colors.mint,
  },

  callButtonText: {
    color:
      colors.farmGreen,

    fontWeight: '700',

    fontSize: 14,
  },

  callIcon: {
    width: 10,

    height: 18,

    borderWidth: 2,

    borderColor:
      colors.farmGreen,

    borderRadius: 5,

    transform: [
      {
        rotate: '-25deg',
      },
    ],
  },

  whatsappButton: {
    flex: 1.2,

    minHeight: 44,

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      spacing.sm,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.farmGreen,
  },

  whatsappButtonPressed: {
    opacity: 0.88,
  },

  whatsappButtonText: {
    color:
      colors.white,

    fontWeight: '700',

    fontSize: 14,
  },

  whatsappIcon: {
    width: 16,

    height: 16,

    borderRadius:
      radius.pill,

    borderWidth: 2,

    borderColor:
      colors.white,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  whatsappIconInner: {
    width: 5,

    height: 5,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.white,
  },

  disabledButton: {
    opacity: 0.55,
  },

  noContactCard: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,

    marginTop:
      spacing.lg,

    padding:
      spacing.md,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.surfaceMuted,
  },

  noContactMark: {
    width: 8,

    height: 8,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.muted,
  },

  noContactText: {
    flex: 1,

    lineHeight: 18,
  },

  stateCard: {
    minHeight: 160,

    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,

    alignItems:
      'center',

    justifyContent:
      'center',

    padding:
      spacing.lg,

    gap:
      spacing.sm,
  },

  errorCard: {
    minHeight: 150,

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
      spacing.lg,
  },

  errorText: {
    marginTop:
      spacing.sm,

    lineHeight: 21,
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

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  retryText: {
    color:
      colors.white,

    fontWeight: '700',
  },

  emptyScreenContent: {
    flexGrow: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical:
      spacing.xxxl,

    paddingHorizontal:
      spacing.xl,
  },

  emptyState: {
    alignItems: 'center',

    paddingHorizontal:
      spacing.xl,
  },

  emptyCard: {
    minHeight: 420,

    alignItems:
      'center',

    justifyContent:
      'center',

    padding:
      spacing.xl,
  },

  emptyMark: {
    width: 88,

    height: 88,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.mint,

    alignItems:
      'center',

    justifyContent:
      'center',

    marginBottom:
      spacing.lg,
  },

  emptyTitle: {
    color:
      colors.text,

    fontSize: 17,

    fontWeight:
      '800',
  },

  emptyText: {
    textAlign:
      'center',

    color:
      colors.textSecondary,

    fontSize: 13,

    lineHeight: 20,

    marginTop:
      spacing.sm,

    maxWidth: 260,
  },

  emptyButton: {
    minHeight: 42,

    marginTop:
      spacing.lg,

    paddingHorizontal:
      spacing.lg,

    borderWidth: 1,

    borderColor:
      colors.farmGreen,

    borderRadius:
      radius.md,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  emptyButtonText: {
    color:
      colors.farmGreen,

    fontWeight: '700',
  },
});
