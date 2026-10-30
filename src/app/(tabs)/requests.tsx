import type {
  ComponentProps,
} from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Input,
  type InputRef,
} from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

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

type RequestFilter =
  | 'all'
  | 'open'
  | 'past';

const categories = [
  'Crops & Grains',
  'Livestock',
  'Poultry',
  'Aquaculture',
  'Other',
];

/**
 * Requests store no produce photo, so each card shows a category mark
 * instead of an invented photograph.
 */
const categoryIcons: Record<
  string,
  ComponentProps<typeof Ionicons>['name']
> = {
  'Crops & Grains': 'nutrition-outline',
  Livestock: 'paw-outline',
  Poultry: 'egg-outline',
  Aquaculture: 'fish-outline',
  Other: 'leaf-outline',
};

const filters: {
  key: RequestFilter;
  label: string;
}[] = [
  {
    key: 'all',
    label: 'All',
  },
  {
    key: 'open',
    label: 'Open',
  },
  {
    key: 'past',
    label: 'Past',
  },
];

function getToday() {
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

function isRequestOpen(
  request: BuyRequest
) {
  const status =
    request.status ??
    'open';

  return (
    status === 'open' &&
    request.deadline >=
      getToday()
  );
}

function getDisplayStatus(
  request: BuyRequest
) {
  const status =
    request.status ??
    'open';

  if (
    status === 'cancelled'
  ) {
    return 'CANCELLED';
  }

  if (
    status === 'fulfilled'
  ) {
    return 'FULFILLED';
  }

  if (
    status === 'matched'
  ) {
    return 'MATCHED';
  }

  if (
    status === 'expired' ||
    request.deadline <
      getToday()
  ) {
    return 'PAST';
  }

  return 'OPEN';
}

function getStatusStyle(
  displayStatus: string
) {
  if (
    displayStatus === 'OPEN' ||
    displayStatus === 'FULFILLED' ||
    displayStatus === 'MATCHED'
  ) {
    return {
      bg: '#ECFDF5',
      dot: colors.emerald,
      text: colors.emerald,
    };
  }

  return {
    bg: colors.surfaceMuted,
    dot: colors.muted,
    text: colors.muted,
  };
}

export default function BuyerRequestsScreen() {
  const {
    user,
    profile,
  } = useAuth();

  const layout = useResponsiveLayout();
  const isPhone = layout.isPhone;
  const insets = useSafeAreaInsets();

  const commodityInputRef = useRef<InputRef>(null);
  const quantityInputRef = useRef<InputRef>(null);
  const deadlineInputRef = useRef<InputRef>(null);
  const deliveryInputRef = useRef<InputRef>(null);

  const userId =
    user?.id ?? null;

  const [
    requests,
    setRequests,
  ] =
    useState<BuyRequest[]>(
      []
    );

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<RequestFilter>(
      'all'
    );

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    cancellingId,
    setCancellingId,
  ] =
    useState<number | null>(
      null
    );

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    successVisible,
    setSuccessVisible,
  ] = useState(false);

  const [
    postedTitle,
    setPostedTitle,
  ] = useState('');

  const [
    editingRequest,
    setEditingRequest,
  ] =
    useState<BuyRequest | null>(
      null
    );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    commodityTitle,
    setCommodityTitle,
  ] = useState('');

  const [
    category,
    setCategory,
  ] =
    useState(
      categories[0]
    );

  const [
    quantity,
    setQuantity,
  ] = useState('');

  const [
    deliveryLocation,
    setDeliveryLocation,
  ] = useState('');

  const [
    deadline,
    setDeadline,
  ] = useState('');

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    commodityError,
    setCommodityError,
  ] = useState('');

  const [
    quantityError,
    setQuantityError,
  ] = useState('');

  const [
    locationError,
    setLocationError,
  ] = useState('');

  const [
    deadlineError,
    setDeadlineError,
  ] = useState('');

  const loadRequests =
    useCallback(async () => {
      if (!userId) {
        setRequests([]);
        setLoading(false);

        return;
      }

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
          'buyer_id',
          userId
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
          'Failed to load buyer requests:',
          error.message
        );

        setRequests([]);

        setErrorMessage(
          'We could not load your requests. Pull down to try again.'
        );

        return;
      }

      setRequests(
        (data ??
          []) as BuyRequest[]
      );
    }, [userId]);

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

  function clearErrors() {
    setCommodityError('');
    setQuantityError('');
    setLocationError('');
    setDeadlineError('');
  }

  function resetForm() {
    setEditingRequest(
      null
    );

    setCommodityTitle(
      ''
    );

    setCategory(
      categories[0]
    );

    setQuantity('');

    setDeliveryLocation(
      profile?.farm_location ??
        ''
    );

    setDeadline('');
    setNotes('');

    clearErrors();
  }

  function openCreateModal() {
    resetForm();

    setDeliveryLocation(
      profile?.farm_location ??
        ''
    );

    setModalVisible(
      true
    );
  }

  function openEditModal(
    request: BuyRequest
  ) {
    if (
      !isRequestOpen(
        request
      )
    ) {
      return;
    }

    clearErrors();

    setEditingRequest(
      request
    );

    setCommodityTitle(
      request.commodity_title
    );

    setCategory(
      categories.includes(
        request.category
      )
        ? request.category
        : 'Other'
    );

    setQuantity(
      request.quantity_required ??
        ''
    );

    setDeliveryLocation(
      request.delivery_location ??
        ''
    );

    setDeadline(
      request.deadline
    );

    setNotes(
      request.additional_notes ??
        ''
    );

    setModalVisible(
      true
    );
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setModalVisible(
      false
    );

    resetForm();
  }

  function validateDate(
    value: string
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {
      return false;
    }

    const [
      year,
      month,
      day,
    ] = value
      .split('-')
      .map(Number);

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    return (
      date.getFullYear() ===
        year &&
      date.getMonth() ===
        month - 1 &&
      date.getDate() ===
        day
    );
  }

  function validateForm() {
    let valid = true;

    clearErrors();

    if (
      !commodityTitle.trim()
    ) {
      setCommodityError(
        'Enter the produce you need.'
      );

      valid = false;
    }

    if (
      !quantity.trim()
    ) {
      setQuantityError(
        'Enter the quantity required.'
      );

      valid = false;
    }

    if (
      !deliveryLocation.trim()
    ) {
      setLocationError(
        'Enter the delivery or collection location.'
      );

      valid = false;
    }

    if (!deadline.trim()) {
      setDeadlineError(
        'Enter the date you need the produce.'
      );

      valid = false;
    } else if (
      !validateDate(
        deadline.trim()
      )
    ) {
      setDeadlineError(
        'Use a valid YYYY-MM-DD date.'
      );

      valid = false;
    } else if (
      deadline.trim() <
      getToday()
    ) {
      setDeadlineError(
        'The deadline cannot be in the past.'
      );

      valid = false;
    }

    return valid;
  }

  async function handleSaveRequest() {
    if (!userId) {
      Alert.alert(
        'Session unavailable',
        'Please sign in again before saving a request.'
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        commodity_title:
          commodityTitle.trim(),

        category,

        quantity_required:
          quantity.trim(),

        delivery_location:
          deliveryLocation.trim(),

        deadline:
          deadline.trim(),

        additional_notes:
          notes.trim() ||
          null,
      };

      if (editingRequest) {
        const {
          data,
          error,
        } = await supabase
          .from(
            'buy_requests'
          )
          .update(
            payload
          )
          .eq(
            'id',
            editingRequest.id
          )
          .eq(
            'buyer_id',
            userId
          )
          .eq(
            'status',
            'open'
          )
          .select('id')
          .maybeSingle();

        if (error) {
          Alert.alert(
            'Request not updated',
            error.message
          );

          return;
        }

        if (!data) {
          Alert.alert(
            'Request unavailable',
            'Only your open requests can be edited.'
          );

          await loadRequests();

          return;
        }

        setModalVisible(
          false
        );

        resetForm();

        await loadRequests();

        Alert.alert(
          'Request updated',
          'Farmers can now see the updated request.'
        );

        return;
      }

      const {
        error,
      } = await supabase
        .from(
          'buy_requests'
        )
        .insert({
          buyer_id:
            userId,

          ...payload,

          status:
            'open',
        });

      if (error) {
        console.error(
          'Failed to create buy request:',
          error.message
        );

        Alert.alert(
          'Request not created',
          error.message
        );

        return;
      }

      setModalVisible(
        false
      );

      resetForm();

      await loadRequests();

      setPostedTitle(
        payload.commodity_title
      );

      setSuccessVisible(true);
    } catch (error) {
      console.error(
        'Unexpected buyer request save error:',
        error
      );

      Alert.alert(
        'Something went wrong',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function confirmCancel(
    request: BuyRequest
  ) {
    Alert.alert(
      'Cancel request',
      `Stop farmers from seeing "${request.commodity_title}" as an open request?`,
      [
        {
          text:
            'Keep open',
          style:
            'cancel',
        },
        {
          text:
            'Cancel request',
          style:
            'destructive',

          onPress: () => {
            void handleCancelRequest(
              request
            );
          },
        },
      ]
    );
  }

  async function handleCancelRequest(
    request: BuyRequest
  ) {
    if (
      !userId ||
      cancellingId !==
        null
    ) {
      return;
    }

    setCancellingId(
      request.id
    );

    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          'buy_requests'
        )
        .update({
          status:
            'cancelled',
        })
        .eq(
          'id',
          request.id
        )
        .eq(
          'buyer_id',
          userId
        )
        .eq(
          'status',
          'open'
        )
        .select('id')
        .maybeSingle();

      if (error) {
        Alert.alert(
          'Request not cancelled',
          error.message
        );

        return;
      }

      if (!data) {
        Alert.alert(
          'Request unavailable',
          'This request is no longer open.'
        );

        await loadRequests();

        return;
      }

      await loadRequests();
    } catch (error) {
      Alert.alert(
        'Something went wrong',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setCancellingId(
        null
      );
    }
  }

  const filteredRequests =
    useMemo(() => {
      if (
        selectedFilter ===
        'open'
      ) {
        return requests.filter(
          isRequestOpen
        );
      }

      if (
        selectedFilter ===
        'past'
      ) {
        return requests.filter(
          (request) =>
            !isRequestOpen(
              request
            )
        );
      }

      return requests;
    }, [
      requests,
      selectedFilter,
    ]);

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

  const filterChips = filters.map(
    (filter) => {
      const active =
        selectedFilter ===
        filter.key;

      return (
        <Pressable
          key={
            filter.key
          }
          onPress={() =>
            setSelectedFilter(
              filter.key
            )
          }
          style={[
            styles.filterChip,

            active &&
              styles.filterChipActive,
          ]}
        >
          <Text
            style={[
              styles.filterText,

              active &&
                styles.filterTextActive,
            ]}
          >
            {
              filter.label
            }
          </Text>
        </Pressable>
      );
    }
  );

  const categoryChips = categories.map(
    (item) => {
      const active =
        category ===
        item;

      return (
        <Pressable
          key={
            item
          }
          onPress={() =>
            setCategory(
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

  return (
    <Screen
      style={styles.screen}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
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
            styles.hero,
            {
              paddingHorizontal:
                layout.horizontalPadding,
            },
          ]}
        >
          <View
            style={[
              styles.heroInner,
              {
                maxWidth:
                  layout.contentMaxWidth,
              },
            ]}
          >
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>
                Buyer requests
              </Text>

              <Text style={styles.heroText}>
                Let farmers know what you need and get the best offers.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create buyer request"
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.heroAction,
                pressed && styles.heroActionPressed,
              ]}
            >
              <Ionicons
                name="arrow-forward"
                size={17}
                color={colors.farmGreen}
              />

              <Text style={styles.heroActionText}>
                New request
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.page,
            styles.contentPanel,
            {
              width: '100%',
              maxWidth:
                layout.contentMaxWidth,

              paddingHorizontal:
                layout.horizontalPadding,
            },
          ]}
        >
          {isPhone ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={
                styles.filterScroller
              }
              contentContainerStyle={
                styles.filterRow
              }
            >
              {filterChips}
            </ScrollView>
          ) : (
            <View
              style={
                styles.filterRowWide
              }
            >
              {filterChips}
            </View>
          )}

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

              <Text tone="muted">
                Loading your requests...
              </Text>
            </View>
          ) : errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Text variant="subtitle">
                Requests unavailable
              </Text>

              <Text
                tone="muted"
                style={
                  styles.errorText
                }
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
                  style={
                    styles.retryText
                  }
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : filteredRequests.length ===
            0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyMark
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={colors.farmGreen}
                />
              </View>

              <Text variant="subtitle">
                {requests.length ===
                0
                  ? 'No requests yet'
                  : selectedFilter ===
                      'open'
                    ? 'No open requests'
                    : 'No past requests'}
              </Text>

              <Text
                tone="muted"
                style={
                  styles.emptyText
                }
              >
                {requests.length ===
                0
                  ? 'Post what you need and farmers can discover your demand.'
                  : 'Requests matching this view will appear here.'}
              </Text>

              {requests.length ===
              0 ? (
                <Pressable
                  onPress={
                    openCreateModal
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.emptyButton,

                    pressed &&
                      styles.emptyButtonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.emptyButtonText
                    }
                  >
                    Create request
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
              ]}
            >
              {filteredRequests.map(
                (request) => {
                  const open =
                    isRequestOpen(
                      request
                    );

                  const displayStatus =
                    getDisplayStatus(
                      request
                    );

                  const cancelling =
                    cancellingId ===
                    request.id;

                  const statusStyle =
                    getStatusStyle(
                      displayStatus
                    );

                  return (
                    <View
                      key={
                        request.id
                      }
                      style={[
                        styles.requestCard,

                        !isPhone &&
                          { width: cardWidth },
                      ]}
                    >
                      <View style={styles.cardMain}>
                        <View style={styles.cardThumb}>
                          <Ionicons
                            name={
                              categoryIcons[
                                request.category
                              ] ?? 'leaf-outline'
                            }
                            size={30}
                            color={colors.farmGreen}
                          />
                        </View>

                        <View style={styles.cardBody}>
                          <View style={styles.cardTop}>
                            <Text
                              variant="subtitle"
                              style={styles.title}
                              numberOfLines={2}
                            >
                              {request.commodity_title}
                            </Text>

                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor:
                                    statusStyle.bg,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusDot,
                                  {
                                    backgroundColor:
                                      statusStyle.dot,
                                  },
                                ]}
                              />

                              <Text
                                style={[
                                  styles.statusText,
                                  {
                                    color:
                                      statusStyle.text,
                                  },
                                ]}
                              >
                                {displayStatus}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={styles.metaLine}
                            numberOfLines={1}
                          >
                            {request.quantity_required ||
                              'Quantity not specified'}{' '}
                            •{' '}
                            {formatDate(request.deadline)}
                          </Text>

                          <View style={styles.locationRow}>
                            <Ionicons
                              name="location-outline"
                              size={13}
                              color={colors.muted}
                            />

                            <Text
                              variant="caption"
                              tone="muted"
                              numberOfLines={1}
                              style={styles.locationText}
                            >
                              {request.delivery_location ||
                                'Location not provided'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardTags}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {request.category}
                          </Text>
                        </View>

                        <Text style={styles.createdText}>
                          Posted{' '}
                          {formatCreatedAt(request.created_at)}
                        </Text>
                      </View>

                      {request.additional_notes ? (
                        <Text
                          tone="secondary"
                          style={styles.notesText}
                          numberOfLines={2}
                        >
                          {request.additional_notes}
                        </Text>
                      ) : null}

                      {open ? (
                        <View
                          style={
                            styles.actions
                          }
                        >
                          <Pressable
                            onPress={() =>
                              openEditModal(
                                request
                              )
                            }
                            disabled={
                              cancelling
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.editButton,

                              pressed &&
                                !cancelling &&
                                styles.editButtonPressed,
                            ]}
                          >
                            <Text
                              style={
                                styles.editButtonText
                              }
                            >
                              Edit request
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              confirmCancel(
                                request
                              )
                            }
                            disabled={
                              cancelling
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.cancelButton,

                              pressed &&
                                !cancelling &&
                                styles.cancelButtonPressed,

                              cancelling &&
                                styles.disabledButton,
                            ]}
                          >
                            <Text
                              style={
                                styles.cancelButtonText
                              }
                            >
                              {cancelling
                                ? 'Cancelling...'
                                : 'Cancel'}
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View
                          style={
                            styles.closedNotice
                          }
                        >
                          <Text
                            variant="caption"
                            tone="muted"
                            style={
                              styles.closedNoticeText
                            }
                          >
                            This request is no longer visible to farmers as active demand.
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

        <Modal
          visible={
            modalVisible
          }
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={
            closeModal
          }
        >
          <View
            style={
              styles.modalRoot
            }
          >
            <KeyboardAvoidingView
              behavior={
                Platform.OS === 'ios'
                  ? 'padding'
                  : undefined
              }
              style={[
                styles.modalContainer,

                {
                  width: '100%',

                  maxWidth: isPhone
                    ? undefined
                    : layout.modalMaxWidth,

                  paddingTop:
                    Platform.OS ===
                    'android'
                      ? insets.top
                      : 0,
                },
              ]}
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <Pressable
                  onPress={
                    closeModal
                  }
                  disabled={
                    submitting
                  }
                  style={
                    styles.modalHeaderButton
                  }
                >
                  <Text
                    style={
                      styles.cancelText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Text variant="subtitle">
                  {editingRequest
                    ? 'Edit request'
                    : 'New request'}
                </Text>

                <View
                  style={
                    styles.modalHeaderSpacer
                  }
                />
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={[
                  styles.modalContent,

                  {
                    paddingBottom:
                      spacing.xxl +
                      insets.bottom,
                  },
                ]}
              >
                <View
                  style={
                    styles.modalIntro
                  }
                >
                  <Text variant="hero">
                    {editingRequest
                      ? 'Update your request'
                      : 'What do you need?'}
                  </Text>

                  <Text
                    tone="muted"
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Give farmers enough information to decide whether they can supply you.
                  </Text>
                </View>

                <Input
                  ref={commodityInputRef}
                  label="Produce needed"
                  value={
                    commodityTitle
                  }
                  onChangeText={
                    setCommodityTitle
                  }
                  placeholder="e.g. Fresh tomatoes"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    quantityInputRef.current?.focus();
                  }}
                  error={
                    commodityError
                  }
                />

                <View
                  style={
                    styles.formGroup
                  }
                >
                  <Text
                    variant="caption"
                    tone="muted"
                    style={
                      styles.fieldLabel
                    }
                  >
                    CATEGORY
                  </Text>

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
                </View>

                <View
                  style={
                    styles.formDivider
                  }
                />

                {isPhone ? (
                  <>
                    <Input
                      ref={quantityInputRef}
                      label="Quantity required"
                      value={
                        quantity
                      }
                      onChangeText={
                        setQuantity
                      }
                      placeholder="e.g. 20 crates"
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        deadlineInputRef.current?.focus();
                      }}
                      error={
                        quantityError
                      }
                    />

                    <Input
                      ref={deadlineInputRef}
                      label="Needed by"
                      value={
                        deadline
                      }
                      onChangeText={
                        setDeadline
                      }
                      placeholder="YYYY-MM-DD"
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        deliveryInputRef.current?.focus();
                      }}
                      error={
                        deadlineError
                      }
                    />

                    <View
                      style={
                        styles.dateHint
                      }
                    >
                      <View
                        style={
                          styles.dateHintMark
                        }
                      />

                      <Text
                        variant="caption"
                        tone="muted"
                        style={
                          styles.dateHintText
                        }
                      >
                        Use YYYY-MM-DD, for example 2026-11-15.
                      </Text>
                    </View>
                  </>
                ) : (
                  <View
                    style={
                      styles.formRow
                    }
                  >
                    <View
                      style={
                        styles.formHalf
                      }
                    >
                      <Input
                        ref={quantityInputRef}
                        label="Quantity required"
                        value={
                          quantity
                        }
                        onChangeText={
                          setQuantity
                        }
                        placeholder="e.g. 20 crates"
                        returnKeyType="next"
                        onSubmitEditing={() => {
                          deadlineInputRef.current?.focus();
                        }}
                        error={
                          quantityError
                        }
                        style={{
                          width: '100%',
                        }}
                      />
                    </View>

                    <View
                      style={
                        styles.formHalf
                      }
                    >
                      <Input
                        ref={deadlineInputRef}
                        label="Needed by"
                        value={
                          deadline
                        }
                        onChangeText={
                          setDeadline
                        }
                        placeholder="YYYY-MM-DD"
                        keyboardType="numbers-and-punctuation"
                        returnKeyType="next"
                        onSubmitEditing={() => {
                          deliveryInputRef.current?.focus();
                        }}
                        error={
                          deadlineError
                        }
                        style={{
                          width: '100%',
                        }}
                      />

                      <View
                        style={
                          styles.dateHint
                        }
                      >
                        <View
                          style={
                            styles.dateHintMark
                          }
                        />

                        <Text
                          variant="caption"
                          tone="muted"
                          style={
                            styles.dateHintText
                          }
                        >
                          Use YYYY-MM-DD, for example 2026-11-15.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <Input
                  ref={deliveryInputRef}
                  label="Delivery / collection location"
                  value={
                    deliveryLocation
                  }
                  onChangeText={
                    setDeliveryLocation
                  }
                  placeholder="e.g. Koforidua, Eastern Region"
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  error={
                    locationError
                  }
                />

                <View
                  style={
                    styles.formDivider
                  }
                />

                <View
                  style={
                    styles.formGroup
                  }
                >
                  <Text
                    variant="caption"
                    tone="muted"
                    style={
                      styles.fieldLabel
                    }
                  >
                    ADDITIONAL NOTES
                  </Text>

                  <TextInput
                    value={notes}
                    onChangeText={
                      setNotes
                    }
                    placeholder="Optional details about quality, size, variety or collection..."
                    placeholderTextColor={
                      colors.muted
                    }
                    multiline
                    submitBehavior="newline"
                    textAlignVertical="top"
                    style={
                      styles.notesInput
                    }
                  />
                </View>

                <View
                  style={
                    styles.visibilityNotice
                  }
                >
                  <View
                    style={
                      styles.visibilityMark
                    }
                  >
                    <View
                      style={
                        styles.visibilityDot
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.visibilityContent
                    }
                  >
                    <Text
                      variant="subtitle"
                      style={
                        styles.visibilityTitle
                      }
                    >
                      Visible to farmers
                    </Text>

                    <Text
                      variant="caption"
                      tone="muted"
                      style={
                        styles.visibilityText
                      }
                    >
                      Open requests appear in the farmer marketplace so suitable farmers can call or WhatsApp you directly.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    void handleSaveRequest()
                  }
                  disabled={
                    submitting
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.submitButton,

                    pressed &&
                      !submitting &&
                      styles.submitButtonPressed,

                    submitting &&
                      styles.submitButtonDisabled,
                  ]}
                >
                  {submitting ? (
                    <View
                      style={
                        styles.submittingRow
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color={
                          colors.white
                        }
                      />

                      <Text
                        variant="subtitle"
                        tone="inverse"
                      >
                        {editingRequest
                          ? 'Saving...'
                          : 'Posting...'}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      variant="subtitle"
                      tone="inverse"
                    >
                      {editingRequest
                        ? 'Save changes'
                        : 'Post request'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={successVisible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setSuccessVisible(false)
          }
        >
          <View style={styles.successOverlay}>
            <Pressable
              style={styles.successBackdrop}
              accessibilityRole="button"
              accessibilityLabel="Dismiss success message"
              onPress={() =>
                setSuccessVisible(false)
              }
            />

            <View style={styles.successSheet}>
              <View style={styles.successHandle} />

              <View style={styles.successCircle}>
                <View style={styles.successCircleInner}>
                  <Ionicons
                    name="checkmark"
                    size={30}
                    color={colors.white}
                  />
                </View>
              </View>

              <Text style={styles.successTitle}>
                Request sent!
              </Text>

              <Text style={styles.successText}>
                Your request for {postedTitle} has been sent to the farmers. You&apos;ll be notified when someone responds.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSuccessVisible(false);

                  setSelectedFilter('all');
                }}
                style={({ pressed }) => [
                  styles.successButton,

                  pressed &&
                    styles.successButtonPressed,
                ]}
              >
                <Text style={styles.successButtonText}>
                  View requests
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setSuccessVisible(false)
                }
                style={styles.successDone}
              >
                <Text style={styles.successDoneText}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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

  hero: {
    width: '100%',

    backgroundColor:
      colors.farmGreen,

    paddingTop:
      spacing.xl,

    paddingBottom:
      spacing.xxl,
  },

  heroInner: {
    width: '100%',

    alignSelf:
      'center',

    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.lg,
  },

  heroCopy: {
    flex: 1,

    minWidth: 0,
  },

  heroTitle: {
    color:
      colors.white,

    fontSize: 26,

    fontWeight:
      '800',

    lineHeight: 32,
  },

  heroText: {
    marginTop:
      spacing.xs,

    maxWidth: 360,

    color:
      colors.onDarkMuted,

    fontSize: 13,

    lineHeight: 19,
  },

  heroAction: {
    minHeight: 42,

    flexDirection:
      'row',

    alignItems:
      'center',

    gap: 8,

    paddingHorizontal:
      spacing.lg,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.mintStrong,
  },

  heroActionText: {
    color:
      colors.farmGreen,

    fontSize: 12.5,

    fontWeight:
      '700',
  },

  heroActionPressed: {
    opacity: 0.86,
  },

  contentPanel: {
    marginTop:
      -spacing.lg,

    paddingTop:
      spacing.lg,

    borderTopLeftRadius:
      radius.xl,

    borderTopRightRadius:
      radius.xl,

    backgroundColor:
      colors.background,
  },

  filterScroller: {
    marginBottom:
      spacing.lg,
  },

  filterRow: {
    gap:
      spacing.sm,
  },

  filterRowWide: {
    flexDirection:
      'row',

    flexWrap:
      'wrap',

    gap:
      spacing.sm,
  },

  filterChip: {
    minHeight: 38,

    alignItems:
      'center',

    justifyContent:
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
  },

  filterChipActive: {
    borderColor:
      colors.farmGreen,

    backgroundColor:
      colors.farmGreen,
  },

  filterText: {
    color:
      colors.textSecondary,

    fontSize: 12.5,

    fontWeight:
      '600',
  },

  filterTextActive: {
    color:
      colors.white,

    fontWeight:
      '700',
  },

  requestList: {
    gap:
      spacing.md,
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
      spacing.sm + 2,
  },

  cardMain: {
    flexDirection:
      'row',

    alignItems:
      'flex-start',

    gap:
      spacing.md,
  },

  cardThumb: {
    width: 84,

    height: 84,

    flexShrink: 0,

    alignItems:
      'center',

    justifyContent:
      'center',

    borderRadius:
      radius.md,

    backgroundColor:
      colors.mint,
  },

  cardBody: {
    flex: 1,

    minWidth: 0,
  },

  cardTop: {
    flexDirection:
      'row',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    gap:
      spacing.sm,
  },

  statusBadge: {
    minHeight: 24,

    flexShrink: 0,

    flexDirection:
      'row',

    alignItems:
      'center',

    gap: 5,

    borderRadius:
      radius.pill,

    paddingHorizontal:
      spacing.sm,
  },

  statusDot: {
    width: 6,

    height: 6,

    borderRadius:
      radius.pill,
  },

  statusText: {
    fontWeight:
      '800',

    letterSpacing: 0.3,

    fontSize: 10,
  },

  createdText: {
    color:
      colors.muted,

    fontSize: 11,
  },

  title: {
    flex: 1,

    color:
      colors.text,

    fontSize: 16,

    fontWeight:
      '700',

    lineHeight: 20,
  },

  metaLine: {
    marginTop:
      spacing.xs,

    color:
      colors.textSecondary,

    fontSize: 12.5,
  },

  locationRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap: 4,

    marginTop:
      spacing.xs,
  },

  locationText: {
    flex: 1,

    fontSize: 12,
  },

  cardTags: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    gap:
      spacing.sm,

    marginTop:
      spacing.sm,
  },

  categoryBadge: {
    alignSelf:
      'flex-start',

    paddingHorizontal:
      spacing.sm,

    paddingVertical: 3,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.mint,
  },

  categoryBadgeText: {
    color:
      colors.farmGreen,

    fontWeight:
      '700',

    fontSize: 10.5,
  },

  notesText: {
    marginTop:
      spacing.sm,

    color:
      colors.textSecondary,

    fontSize: 12.5,

    lineHeight: 18,
  },

  actions: {
    flexDirection:
      'row',

    gap:
      spacing.sm,

    marginTop:
      spacing.lg,

    paddingTop:
      spacing.lg,

    borderTopWidth: 1,

    borderTopColor:
      colors.border,
  },

  editButton: {
    flex: 1,

    minHeight: 44,

    borderWidth: 1,

    borderColor:
      colors.farmGreen,

    borderRadius:
      radius.md,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      colors.surface,
  },

  editButtonPressed: {
    backgroundColor:
      colors.mint,
  },

  editButtonText: {
    color:
      colors.farmGreen,

    fontWeight:
      '700',

    fontSize: 14,
  },

  cancelButton: {
    flex: 1,

    minHeight: 44,

    borderWidth: 1,

    borderColor:
      colors.dangerBorder,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.dangerSoft,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  cancelButtonPressed: {
    backgroundColor:
      '#FEE2E2',
  },

  cancelButtonText: {
    color:
      colors.danger,

    fontWeight:
      '700',

    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.6,
  },

  closedNotice: {
    marginTop:
      spacing.lg,

    padding:
      spacing.md,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.surfaceMuted,
  },

  closedNoticeText: {
    lineHeight: 18,

    fontSize: 13,
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
      colors.dangerBorder,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.dangerSoft,

    padding:
      spacing.lg,

    justifyContent:
      'center',
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

    fontWeight:
      '700',
  },

  emptyCard: {
    minHeight: 220,

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
  },

  emptyMark: {
    width: 46,

    height: 46,

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

  emptyText: {
    textAlign:
      'center',

    lineHeight: 21,

    marginTop:
      spacing.sm,

    maxWidth: 290,
  },

  emptyButton: {
    minHeight: 46,

    marginTop:
      spacing.xl,

    paddingHorizontal:
      spacing.xl,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.farmGreen,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  emptyButtonPressed: {
    opacity: 0.88,
  },

  emptyButtonText: {
    color:
      colors.white,

    fontWeight:
      '700',
  },

  modalRoot: {
    flex: 1,

    backgroundColor:
      colors.background,
  },

  modalContainer: {
    flex: 1,

    alignSelf:
      'center',

    backgroundColor:
      colors.background,
  },

  modalScroll: {
    flex: 1,
  },

  modalHeader: {
    minHeight: 56,

    paddingHorizontal:
      spacing.lg,

    flexDirection:
      'row',

    alignItems:
      'center',

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

  cancelText: {
    color:
      colors.farmGreen,

    fontWeight:
      '600',
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

  formGroup: {
    gap:
      spacing.sm,
  },

  fieldLabel: {
    fontWeight:
      '700',

    letterSpacing: 0.4,
  },

  formDivider: {
    height: 1,

    backgroundColor:
      colors.border,

    marginVertical:
      spacing.sm,
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

    paddingHorizontal:
      spacing.md,

    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.surface,

    alignItems: 'center',

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

    fontWeight:
      '600',

    fontSize: 13,
  },

  categoryChipTextActive: {
    color:
      colors.white,

    fontWeight:
      '700',
  },

  formRow: {
    flexDirection:
      'row',

    gap:
      spacing.sm,

    alignItems:
      'flex-start',
  },

  formHalf: {
    flex: 1,

    minWidth: 0,
  },

  dateHint: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,

    marginTop:
      -spacing.sm,
  },

  dateHintMark: {
    width: 6,

    height: 6,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.farmGreen,
  },

  dateHintText: {
    flex: 1,

    lineHeight: 18,
  },

  notesInput: {
    minHeight: 112,

    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.surface,

    padding:
      spacing.md,

    color:
      colors.text,

    fontSize: 14,

    lineHeight: 20,
  },

  visibilityNotice: {
    flexDirection:
      'row',

    padding:
      spacing.lg,

    borderWidth: 1,

    borderColor:
      '#DCE9DA',

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.mint,
  },

  visibilityMark: {
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

  visibilityDot: {
    width: 8,

    height: 8,

    borderRadius:
      radius.pill,

    backgroundColor:
      colors.farmGreen,
  },

  visibilityContent: {
    flex: 1,

    marginLeft:
      spacing.md,
  },

  visibilityTitle: {
    color:
      colors.farmGreen,

    fontWeight:
      '700',
  },

  visibilityText: {
    marginTop: 4,

    lineHeight: 18,
  },

  submitButton: {
    minHeight: 50,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.farmGreen,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  submitButtonPressed: {
    opacity: 0.88,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submittingRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,
  },

  successOverlay: {
    flex: 1,

    justifyContent: 'flex-end',

    backgroundColor:
      'rgba(0,0,0,0.38)',
  },

  successBackdrop: {
    position: 'absolute',

    top: 0,

    right: 0,

    bottom: 0,

    left: 0,
  },

  successSheet: {
    width: '100%',

    maxWidth: 520,

    alignSelf: 'center',

    alignItems: 'center',

    paddingHorizontal:
      spacing.xl,

    paddingTop: spacing.sm,

    paddingBottom: spacing.xxl,

    borderTopLeftRadius:
      radius.xl,

    borderTopRightRadius:
      radius.xl,

    backgroundColor:
      colors.surface,
  },

  successHandle: {
    width: 40,

    height: 4,

    borderRadius: radius.pill,

    backgroundColor:
      colors.borderStrong,
  },

  successCircle: {
    width: 88,

    height: 88,

    borderRadius: radius.pill,

    marginTop: spacing.xl,

    backgroundColor:
      colors.mint,

    alignItems: 'center',

    justifyContent:
      'center',
  },

  successCircleInner: {
    width: 58,

    height: 58,

    borderRadius: radius.pill,

    backgroundColor:
      colors.farmGreen,

    alignItems: 'center',

    justifyContent:
      'center',
  },

  successTitle: {
    marginTop: spacing.lg,

    color: colors.text,

    fontSize: 21,

    fontWeight: '800',
  },

  successText: {
    marginTop: spacing.sm,

    maxWidth: 330,

    color:
      colors.textSecondary,

    fontSize: 13.5,

    lineHeight: 20,

    textAlign: 'center',
  },

  successButton: {
    width: '100%',

    minHeight: 50,

    marginTop: spacing.xl,

    alignItems: 'center',

    justifyContent:
      'center',

    borderRadius: radius.md,

    backgroundColor:
      colors.farmGreen,
  },

  successButtonPressed: {
    opacity: 0.88,
  },

  successButtonText: {
    color: colors.white,

    fontSize: 14.5,

    fontWeight: '700',
  },

  successDone: {
    minHeight: 46,

    marginTop: spacing.sm,

    paddingHorizontal:
      spacing.xl,

    alignItems: 'center',

    justifyContent:
      'center',
  },

  successDoneText: {
    color: colors.farmGreen,

    fontSize: 14,

    fontWeight: '700',
  },
});
