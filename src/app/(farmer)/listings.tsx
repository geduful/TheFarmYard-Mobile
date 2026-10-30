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
  Image,
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
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Input,
  type InputRef,
} from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import { compressImage } from '@/lib/images/compress-image';
import {
  createListingImagePath,
  LISTING_IMAGES_BUCKET,
  resolveImageUrl,
} from '@/lib/images/storage-image';
import { uploadImage } from '@/lib/images/upload-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

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
  is_approved: boolean;
  created_at: string;
};

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
};

type ListingFilter =
  | 'all'
  | 'live'
  | 'not_live';

const categories = [
  'Crops & Grains',
  'Livestock',
  'Poultry',
  'Aquaculture',
  'Other',
];

const priceUnits = [
  'kg',
  'bag',
  'crate',
  'basket',
  'piece',
  'bunch',
  'tray',
  'litre',
];

const filters: {
  key: ListingFilter;
  label: string;
}[] = [
  {
    key: 'all',
    label: 'All',
  },
  {
    key: 'live',
    label: 'Live',
  },
  {
    key: 'not_live',
    label: 'Not live',
  },
];

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

  const numericValue = Number(value);

  const formattedValue = Number.isNaN(numericValue)
    ? String(value)
    : numericValue.toLocaleString('en-GH', {
        maximumFractionDigits: 2,
      });

  return unit
    ? `GH₵ ${formattedValue} / ${unit}`
    : `GH₵ ${formattedValue}`;
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

function getStoragePath(
  imageReference: string | null
) {
  if (!imageReference) {
    return null;
  }

  const prefix =
    `storage://${LISTING_IMAGES_BUCKET}/`;

  if (!imageReference.startsWith(prefix)) {
    return null;
  }

  return imageReference.slice(
    prefix.length
  );
}

export default function FarmerListingsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    create?: string;
  }>();

  const layout = useResponsiveLayout();
  const isPhone = layout.isPhone;
  const insets = useSafeAreaInsets();

  const titleInputRef = useRef<InputRef>(null);
  const priceInputRef = useRef<InputRef>(null);
  const quantityInputRef = useRef<InputRef>(null);

  const handledCreateRequest = useRef<string | null>(
    null
  );

  const userId =
    user?.id ?? null;

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [
    resolvedImages,
    setResolvedImages,
  ] = useState<
    Record<number, string>
  >({});

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<ListingFilter>('all');

  const [search, setSearch] =
    useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    compressingImage,
    setCompressingImage,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<number | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    editingListing,
    setEditingListing,
  ] = useState<Listing | null>(null);

  const [title, setTitle] =
    useState('');

  const [category, setCategory] =
    useState(categories[0]);

  const [quantity, setQuantity] =
    useState('');

  const [price, setPrice] =
    useState('');

  const [priceUnit, setPriceUnit] =
    useState('kg');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<SelectedImage | null>(
      null
    );

  const [
    existingImageUrl,
    setExistingImageUrl,
  ] =
    useState<string | null>(null);

  const [
    removeExistingImage,
    setRemoveExistingImage,
  ] = useState(false);

  const [
    titleError,
    setTitleError,
  ] = useState('');

  const [
    quantityError,
    setQuantityError,
  ] = useState('');

  const [
    priceError,
    setPriceError,
  ] = useState('');

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
                    `Failed to resolve listing image ${listing.id}:`,
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
      if (!userId) {
        setListings([]);
        setResolvedImages({});
        setLoading(false);

        return;
      }

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
            is_approved,
            created_at
          `
        )
        .eq(
          'farmer_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          'Failed to load farmer listings:',
          error.message
        );

        setListings([]);
        setResolvedImages({});

        setErrorMessage(
          'We could not load your listings. Pull down to try again.'
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
    }, [
      resolveListingImages,
      userId,
    ]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);

      try {
        await loadListings();
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
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

  function clearFormErrors() {
    setTitleError('');
    setQuantityError('');
    setPriceError('');
  }

  function resetForm() {
    setEditingListing(null);

    setTitle('');
    setCategory(categories[0]);
    setQuantity('');
    setPrice('');
    setPriceUnit('kg');
    setDescription('');

    setSelectedImage(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(false);

    clearFormErrors();
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  useEffect(() => {
    const createRequest =
      typeof params.create === 'string'
        ? params.create
        : null;

    if (
      !createRequest ||
      createRequest === handledCreateRequest.current
    ) {
      return;
    }

    handledCreateRequest.current = createRequest;
    openCreateModal();
    router.setParams({ create: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.create]);

  function openEditModal(
    listing: Listing
  ) {
    clearFormErrors();

    setEditingListing(
      listing
    );

    setTitle(
      listing.title
    );

    setCategory(
      categories.includes(
        listing.category
      )
        ? listing.category
        : 'Other'
    );

    setQuantity(
      listing.quantity_available ===
        null ||
        listing.quantity_available ===
          undefined
        ? ''
        : String(
            listing.quantity_available
          )
    );

    setPrice(
      listing.price_per_unit ===
        null ||
        listing.price_per_unit ===
          undefined
        ? ''
        : String(
            listing.price_per_unit
          )
    );

    setPriceUnit(
      listing.price_unit ||
        'kg'
    );

    setDescription(
      listing.description ??
        ''
    );

    setSelectedImage(null);

    setExistingImageUrl(
      resolvedImages[
        listing.id
      ] ?? null
    );

    setRemoveExistingImage(
      false
    );

    setModalVisible(true);
  }

  function closeModal() {
    if (
      submitting ||
      compressingImage
    ) {
      return;
    }

    setModalVisible(false);
    resetForm();
  }

  function validateForm() {
    let valid = true;

    clearFormErrors();

    if (!title.trim()) {
      setTitleError(
        'Produce name is required.'
      );

      valid = false;
    }

    if (!quantity.trim()) {
      setQuantityError(
        'Quantity is required.'
      );

      valid = false;
    } else {
      const numericQuantity =
        Number(quantity);

      if (
        Number.isNaN(
          numericQuantity
        ) ||
        numericQuantity <= 0
      ) {
        setQuantityError(
          'Enter a valid quantity.'
        );

        valid = false;
      }
    }

    if (!price.trim()) {
      setPriceError(
        'Price is required.'
      );

      valid = false;
    } else {
      const numericPrice =
        Number(price);

      if (
        Number.isNaN(
          numericPrice
        ) ||
        numericPrice <= 0
      ) {
        setPriceError(
          'Enter a valid price.'
        );

        valid = false;
      }
    }

    return valid;
  }

  async function handlePickImage() {
    if (
      compressingImage ||
      submitting
    ) {
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo access required',
        'Allow TheFarmYard to access your photos so you can add a produce image.'
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync(
        {
          mediaTypes: [
            'images',
          ],

          allowsEditing: true,

          aspect: [4, 3],

          quality: 1,
        }
      );

    if (
      result.canceled ||
      !result.assets[0]
    ) {
      return;
    }

    const asset =
      result.assets[0];

    setCompressingImage(
      true
    );

    try {
      const compressed =
        await compressImage({
          uri: asset.uri,

          width:
            asset.width,

          height:
            asset.height,
        });

      setSelectedImage({
        uri:
          compressed.uri,

        width:
          compressed.width,

        height:
          compressed.height,
      });

      setRemoveExistingImage(
        false
      );
    } catch (error) {
      console.error(
        'Image compression failed:',
        error
      );

      Alert.alert(
        'Image could not be prepared',
        'Please choose another photo and try again.'
      );
    } finally {
      setCompressingImage(
        false
      );
    }
  }

  function removeCurrentPhoto() {
    setSelectedImage(null);
    setExistingImageUrl(null);

    if (
      editingListing?.image_url
    ) {
      setRemoveExistingImage(
        true
      );
    }
  }

  async function cleanupImageReference(
    imageReference: string | null
  ) {
    const storagePath =
      getStoragePath(
        imageReference
      );

    if (!storagePath) {
      return;
    }

    const {
      error,
    } =
      await supabase.storage
        .from(
          LISTING_IMAGES_BUCKET
        )
        .remove([
          storagePath,
        ]);

    if (error) {
      console.warn(
        'Listing saved, but previous image cleanup failed:',
        error.message
      );
    }
  }

  async function handleSaveListing() {
    if (!userId) {
      Alert.alert(
        'Session unavailable',
        'Please sign in again before saving a listing.'
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    let uploadedImagePath:
      | string
      | null = null;

    try {
      let imageReference:
        | string
        | null =
        editingListing?.image_url ??
        null;

      if (selectedImage) {
        uploadedImagePath =
          createListingImagePath(
            userId
          );

        imageReference =
          await uploadImage({
            uri:
              selectedImage.uri,

            bucket:
              LISTING_IMAGES_BUCKET,

            path:
              uploadedImagePath,
          });
      } else if (
        editingListing &&
        removeExistingImage
      ) {
        imageReference = null;
      }

      const payload = {
        title:
          title.trim(),

        category,

        quantity_available:
          Number(quantity),

        price_per_unit:
          Number(price),

        price_unit:
          priceUnit,

        image_url:
          imageReference,

        description:
          description.trim() ||
          null,
      };

      if (editingListing) {
        const {
          data,
          error,
        } = await supabase
          .from('listings')
          .update(payload)
          .eq(
            'id',
            editingListing.id
          )
          .eq(
            'farmer_id',
            userId
          )
          .select('id')
          .maybeSingle();

        if (error) {
          if (
            uploadedImagePath
          ) {
            await supabase.storage
              .from(
                LISTING_IMAGES_BUCKET
              )
              .remove([
                uploadedImagePath,
              ]);
          }

          Alert.alert(
            'Listing not updated',
            error.message
          );

          return;
        }

        if (!data) {
          if (
            uploadedImagePath
          ) {
            await supabase.storage
              .from(
                LISTING_IMAGES_BUCKET
              )
              .remove([
                uploadedImagePath,
              ]);
          }

          Alert.alert(
            'Listing unavailable',
            'This listing could not be updated.'
          );

          return;
        }

        const oldImage =
          editingListing.image_url;

        const imageChanged =
          selectedImage !==
            null ||
          removeExistingImage;

        if (
          imageChanged &&
          oldImage
        ) {
          await cleanupImageReference(
            oldImage
          );
        }

        setModalVisible(
          false
        );

        resetForm();

        await loadListings();

        Alert.alert(
          'Listing updated',
          'Your produce listing has been updated.'
        );

        return;
      }

      const {
        error,
      } = await supabase
        .from('listings')
        .insert({
          farmer_id:
            userId,

          ...payload,

          is_approved:
            true,
        });

      if (error) {
        if (
          uploadedImagePath
        ) {
          await supabase.storage
            .from(
              LISTING_IMAGES_BUCKET
            )
            .remove([
              uploadedImagePath,
            ]);
        }

        console.error(
          'Failed to create listing:',
          error.message
        );

        Alert.alert(
          'Listing not created',
          error.message
        );

        return;
      }

      setModalVisible(false);
      resetForm();

      await loadListings();

      Alert.alert(
        'Listing live',
        'Your listing is now visible to buyers.'
      );
    } catch (error) {
      if (
        uploadedImagePath
      ) {
        await supabase.storage
          .from(
            LISTING_IMAGES_BUCKET
          )
          .remove([
            uploadedImagePath,
          ]);
      }

      console.error(
        'Unexpected listing save error:',
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

  function confirmDelete(
    listing: Listing
  ) {
    Alert.alert(
      'Remove listing',
      `Remove "${listing.title}" from TheFarmYard?`,
      [
        {
          text: 'Keep listing',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void handleDeleteListing(
              listing
            );
          },
        },
      ]
    );
  }

  async function handleDeleteListing(
    listing: Listing
  ) {
    if (
      !userId ||
      deletingId !== null
    ) {
      return;
    }

    setDeletingId(
      listing.id
    );

    try {
      const {
        data,
        error,
      } = await supabase
        .from('listings')
        .delete()
        .eq(
          'id',
          listing.id
        )
        .eq(
          'farmer_id',
          userId
        )
        .select('id')
        .maybeSingle();

      if (error) {
        Alert.alert(
          'Could not remove listing',
          error.message
        );

        return;
      }

      if (!data) {
        Alert.alert(
          'Listing unavailable',
          'This listing could not be removed.'
        );

        await loadListings();

        return;
      }

      await cleanupImageReference(
        listing.image_url
      );

      setListings(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              listing.id
          )
      );

      setResolvedImages(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            listing.id
          ];

          return next;
        }
      );
    } catch (error) {
      Alert.alert(
        'Something went wrong',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filtersActive =
    Boolean(search.trim()) ||
    selectedCategory !== 'All' ||
    selectedFilter !== 'all';

  const filteredListings =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return listings.filter(
        (listing) => {
          if (
            selectedFilter ===
              'live' &&
            !listing.is_approved
          ) {
            return false;
          }

          if (
            selectedFilter ===
              'not_live' &&
            listing.is_approved
          ) {
            return false;
          }

          if (
            selectedCategory !==
              'All' &&
            listing.category !==
              selectedCategory
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          return (
            listing.title
              .toLowerCase()
              .includes(term) ||
            listing.category
              .toLowerCase()
              .includes(term)
          );
        }
      );
    }, [
      listings,
      search,
      selectedCategory,
      selectedFilter,
    ]);

  function showListingActions(
    listing: Listing
  ) {
    Alert.alert(
      listing.title,
      'Manage this listing',
      [
        {
          text: 'Edit listing',
          onPress: () =>
            openEditModal(listing),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            confirmDelete(listing),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  const previewImage =
    selectedImage?.uri ??
    existingImageUrl;

  const filterItems = [
    'All',
    ...categories,
  ].map((item) => {
    const active =
      selectedCategory === item;

    return (
      <Pressable
        key={item}
        onPress={() =>
          setSelectedCategory(item)
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
          {item}
        </Text>
      </Pressable>
    );
  });

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

  const unitChips = priceUnits.map(
    (unit) => {
      const active =
        priceUnit ===
        unit;

      return (
        <Pressable
          key={
            unit
          }
          onPress={() =>
            setPriceUnit(
              unit
            )
          }
          style={[
            styles.unitChip,

            active &&
              styles.unitChipActive,
          ]}
        >
          <Text
            variant="caption"
            style={[
              styles.unitChipText,

              active &&
                styles.unitChipTextActive,
            ]}
          >
            {
              unit
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>
                My Listings
              </Text>

              <Text style={styles.subtitle}>
                Manage your farm produce
              </Text>
            </View>

            <Pressable
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.addButton,
                pressed &&
                  styles.addButtonPressed,
              ]}
            >
              <Ionicons
                name="add"
                size={17}
                color={colors.white}
              />

              <Text style={styles.addButtonText}>
                Add listing
              </Text>
            </Pressable>
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
                placeholder="Search listings..."
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
                  style={styles.clearSearchButton}
                >
                  <Ionicons
                    name="close"
                    size={17}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle listing status filters"
              accessibilityState={{
                expanded: filtersOpen,
              }}
              onPress={() =>
                setFiltersOpen(
                  (current) => !current
                )
              }
              style={({ pressed }) => [
                styles.filterButton,
                (filtersOpen ||
                  selectedFilter !==
                    'all') &&
                  styles.filterButtonActive,
                pressed &&
                  styles.controlPressed,
              ]}
            >
              <Ionicons
                name="options-outline"
                size={21}
                color={
                  filtersOpen ||
                  selectedFilter !== 'all'
                    ? colors.white
                    : colors.farmGreen
                }
              />
            </Pressable>
          </View>

          {filtersOpen ? (
            <View style={styles.statusPanel}>
              {filters.map((filter) => {
                const active =
                  selectedFilter ===
                  filter.key;

                return (
                  <Pressable
                    key={filter.key}
                    onPress={() =>
                      setSelectedFilter(
                        filter.key
                      )
                    }
                    style={[
                      styles.statusChip,
                      active &&
                        styles.statusChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        active &&
                          styles.statusChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroller}
            contentContainerStyle={
              styles.filterRow
            }
          >
            {filterItems}
          </ScrollView>

          {loading ? (
            <View
              style={styles.stateCard}
            >
              <ActivityIndicator
                size="small"
                color={colors.farmGreen}
              />

              <Text tone="muted">
                Loading your listings...
              </Text>
            </View>
          ) : errorMessage ? (
            <View
              style={styles.errorCard}
            >
              <Text variant="subtitle">
                Listings unavailable
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
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : filteredListings.length ===
            0 ? (
            <View
              style={styles.emptyCard}
            >
              <View
                style={styles.emptyMark}
              >
                <Ionicons
                  name="leaf-outline"
                  size={24}
                  color={colors.farmGreen}
                />
              </View>

              <Text variant="subtitle">
                {listings.length === 0
                  ? 'No produce listed yet'
                  : filtersActive
                    ? 'No matching listings'
                    : 'No listings'}
              </Text>

              <Text
                tone="muted"
                style={styles.emptyText}
              >
                {listings.length === 0
                  ? 'Add what you currently have available so buyers can discover your farm.'
                  : 'Try a different search, category or status.'}
              </Text>

              {listings.length ===
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
                  <Text style={styles.emptyButtonText}>
                    Add listing
                  </Text>
                </Pressable>
              ) : filtersActive ? (
                <Pressable
                  onPress={() => {
                    setSearch('');
                    setSelectedCategory('All');
                    setSelectedFilter('all');
                  }}
                  style={({
                    pressed,
                  }) => [
                    styles.emptyButton,

                    pressed &&
                      styles.emptyButtonPressed,
                  ]}
                >
                  <Text style={styles.emptyButtonText}>
                    Clear filters
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.list}>
              {filteredListings.map(
                (listing) => {
                  const imageUrl =
                    resolvedImages[
                      listing.id
                    ];

                  const isDeleting =
                    deletingId ===
                    listing.id;

                  return (
                    <View
                      key={listing.id}
                      style={styles.listingCard}
                    >
                      <View style={styles.imageWrapper}>
                        {imageUrl ? (
                          <Image
                            source={{
                              uri: imageUrl,
                            }}
                            style={styles.image}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={
                              styles.imagePlaceholder
                            }
                          >
                            <Ionicons
                              name="leaf-outline"
                              size={32}
                              color={colors.muted}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.listingBody}>
                        <View style={styles.listingHeader}>
                          <Text
                            numberOfLines={2}
                            style={styles.listingName}
                          >
                            {listing.title}
                          </Text>

                          <View
                            style={[
                              styles.statusBadge,

                              listing.is_approved
                                ? styles.liveBadge
                                : styles.notLiveBadge,
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
                                  : styles.notLiveText,
                              ]}
                            >
                              {listing.is_approved
                                ? 'Active'
                                : 'Pending'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.price}>
                          {formatPrice(
                            listing.price_per_unit,
                            listing.price_unit
                          )}
                        </Text>

                        <View style={styles.listingFooter}>
                          <Text
                            numberOfLines={1}
                            style={styles.availableText}
                          >
                            Available:{' '}
                            {formatQuantity(
                              listing.quantity_available,
                              listing.price_unit
                            )}
                          </Text>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Manage ${listing.title}`}
                            onPress={() =>
                              showListingActions(
                                listing
                              )
                            }
                            disabled={isDeleting}
                            hitSlop={8}
                            style={styles.moreButton}
                          >
                            {isDeleting ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.muted}
                              />
                            ) : (
                              <Ionicons
                                name="ellipsis-horizontal"
                                size={18}
                                color={
                                  colors.textSecondary
                                }
                              />
                            )}
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                }
              )}
            </View>
          )}
        </View>

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeModal}
        >
          <View style={styles.modalRoot}>
            <KeyboardAvoidingView
              behavior={
                Platform.OS === 'ios'
                  ? 'padding'
                  : undefined
              }
              style={[
                styles.modalContainer,

                {
                  width: isPhone
                    ? '100%'
                    : undefined,

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
              <View style={styles.modalHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close listing form"
                  onPress={closeModal}
                  disabled={
                    submitting ||
                    compressingImage
                  }
                  style={styles.modalBackButton}
                >
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={colors.text}
                  />
                </Pressable>

                <Text style={styles.modalTitle}>
                  {editingListing
                    ? 'Edit listing'
                    : 'Create listing'}
                </Text>

                <View style={styles.modalHeaderSpacer} />
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
                <View style={styles.formGroup}>
                  {previewImage ? (
                    <View style={styles.selectedImageCard}>
                      <Image
                        source={{
                          uri: previewImage,
                        }}
                        style={styles.selectedImage}
                        resizeMode="cover"
                      />

                      <View style={styles.selectedImageActions}>
                        <Pressable
                          onPress={() =>
                            void handlePickImage()
                          }
                          disabled={
                            compressingImage ||
                            submitting
                          }
                          style={styles.imageActionButton}
                        >
                          <Text style={styles.changePhotoText}>
                            Replace photo
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={removeCurrentPhoto}
                          disabled={
                            compressingImage ||
                            submitting
                          }
                          style={styles.imageActionButton}
                        >
                          <Text style={styles.removePhotoText}>
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() =>
                        void handlePickImage()
                      }
                      disabled={
                        compressingImage ||
                        submitting
                      }
                      style={({ pressed }) => [
                        styles.photoPicker,

                        pressed &&
                          !compressingImage &&
                          !submitting &&
                          styles.photoPickerPressed,
                      ]}
                    >
                      {compressingImage ? (
                        <>
                          <ActivityIndicator
                            size="small"
                            color={colors.farmGreen}
                          />

                          <Text
                            style={styles.photoPickerTitle}
                          >
                            Preparing photo...
                          </Text>

                          <Text
                            style={styles.photoPickerText}
                          >
                            Optimizing the image for faster marketplace loading.
                          </Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.photoPickerMark}>
                            <Ionicons
                              name="camera-outline"
                              size={22}
                              color={colors.farmGreen}
                            />
                          </View>

                          <Text
                            style={styles.photoPickerTitle}
                          >
                            Add a photo
                          </Text>

                          <Text
                            style={styles.photoPickerText}
                          >
                            Tap to upload a produce photo
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                <Input
                  ref={titleInputRef}
                  label="Product name"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Maize"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    priceInputRef.current?.focus();
                  }}
                  error={titleError}
                />

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Category
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                      styles.categoryRow
                    }
                  >
                    {categoryChips}
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Price (GH₵)
                  </Text>

                  <View style={styles.priceRow}>
                    <View style={styles.priceInputWrap}>
                      <Input
                        ref={priceInputRef}
                        value={price}
                        onChangeText={setPrice}
                        placeholder="e.g. 15"
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        onSubmitEditing={() => {
                          quantityInputRef.current?.focus();
                        }}
                        error={priceError}
                      />
                    </View>

                    <View style={styles.unitSuffix}>
                      <Text style={styles.unitSuffixText}>
                        / {priceUnit}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Price per
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                      styles.unitRow
                    }
                  >
                    {unitChips}
                  </ScrollView>
                </View>

                <Input
                  ref={quantityInputRef}
                  label="Quantity available"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="e.g. 50"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  error={quantityError}
                />

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Description
                  </Text>

                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Variety, quality, harvest information or anything useful for buyers..."
                    placeholderTextColor={colors.muted}
                    multiline
                    submitBehavior="newline"
                    textAlignVertical="top"
                    style={styles.descriptionInput}
                  />
                </View>

                <Pressable
                  onPress={() =>
                    void handleSaveListing()
                  }
                  disabled={
                    submitting ||
                    compressingImage
                  }
                  style={({ pressed }) => [
                    styles.submitButton,

                    pressed &&
                      !submitting &&
                      !compressingImage &&
                      styles.submitButtonPressed,

                    (submitting ||
                      compressingImage) &&
                      styles.submitButtonDisabled,
                  ]}
                >
                  {submitting ? (
                    <View style={styles.submittingRow}>
                      <ActivityIndicator
                        size="small"
                        color={colors.white}
                      />

                      <Text
                        variant="subtitle"
                        tone="inverse"
                      >
                        {editingListing
                          ? 'Saving changes...'
                          : 'Publishing...'}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      variant="subtitle"
                      tone="inverse"
                    >
                      {editingListing
                        ? 'Save changes'
                        : 'Publish listing'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
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

  header: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    gap: spacing.md,

    paddingTop: spacing.md,

    marginBottom: spacing.md,
  },

  headerText: {
    flex: 1,

    minWidth: 0,
  },

  heading: {
    color: colors.text,

    fontSize: 26,

    fontWeight: '800',

    lineHeight: 32,
  },

  subtitle: {
    marginTop: 2,

    color: colors.textSecondary,

    fontSize: 13,

    lineHeight: 18,
  },

  addButton: {
    minHeight: 40,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    paddingHorizontal: spacing.md,

    borderRadius: radius.pill,

    backgroundColor:
      colors.farmGreen,
  },

  addButtonPressed: {
    opacity: 0.88,
  },

  addButtonText: {
    color: colors.white,

    fontSize: 12.5,

    fontWeight: '700',
  },

  searchRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    marginTop: spacing.sm,
  },

  searchCard: {
    flex: 1,

    minHeight: 46,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: spacing.md,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.lg,

    backgroundColor: colors.surface,
  },

  searchIcon: {
    marginRight: spacing.sm,
  },

  searchInput: {
    flex: 1,

    minHeight: 42,

    paddingVertical: 0,

    color: colors.text,

    fontSize: 13.5,
  },

  clearSearchButton: {
    width: 26,

    height: 26,

    borderRadius: radius.pill,

    backgroundColor: colors.surfaceMuted,

    alignItems: 'center',

    justifyContent: 'center',
  },

  filterButton: {
    width: 46,

    height: 46,

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

  controlPressed: {
    opacity: 0.76,
  },

  statusPanel: {
    flexDirection: 'row',

    gap: spacing.sm,

    marginTop: spacing.sm,

    padding: spacing.sm,

    borderRadius: radius.lg,

    backgroundColor: colors.surfaceMuted,
  },

  statusChip: {
    flex: 1,

    minHeight: 34,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: radius.pill,

    backgroundColor: colors.surface,
  },

  statusChipActive: {
    backgroundColor: colors.farmGreen,
  },

  statusChipText: {
    color: colors.textSecondary,

    fontSize: 12,

    fontWeight: '600',
  },

  statusChipTextActive: {
    color: colors.white,

    fontWeight: '700',
  },

  filterScroller: {
    marginTop: spacing.md,

    marginBottom: spacing.md,
  },

  filterRow: {
    gap: spacing.sm,

    paddingRight: spacing.lg,
  },

  filterChip: {
    minHeight: 34,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: spacing.md,

    borderRadius: radius.pill,

    backgroundColor:
      colors.surfaceMuted,
  },

  filterChipActive: {
    backgroundColor:
      colors.farmGreen,
  },

  filterText: {
    color: colors.textSecondary,

    fontSize: 12.5,

    fontWeight: '600',
  },

  filterTextActive: {
    color: colors.white,

    fontWeight: '700',
  },

  list: {
    gap: spacing.sm,
  },

  listingCard: {
    flexDirection: 'row',

    alignItems: 'center',

    padding: spacing.sm,

    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,
  },

  imageWrapper: {
    width: 104,

    height: 104,

    flexShrink: 0,

    overflow: 'hidden',

    borderRadius: radius.md,

    backgroundColor:
      colors.surfaceMuted,
  },

  image: {
    width: '100%',

    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      colors.mint,
  },

  statusBadge: {
    flexShrink: 0,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 3,

    marginTop: 1,

    paddingHorizontal: 6,

    paddingVertical: 3,

    borderRadius:
      radius.pill,
  },

  liveBadge: {
    backgroundColor:
      colors.successSoft,
  },

  notLiveBadge: {
    backgroundColor: '#FFF4DE',
  },

  statusText: {
    fontWeight: '700',

    fontSize: 10.5,
  },

  liveText: {
    color:
      colors.emerald,
  },

  notLiveText: {
    color:
      colors.warning,
  },

  listingBody: {
    flex: 1,

    marginLeft:
      spacing.md,

    minWidth: 0,
  },

  listingHeader: {
    flexDirection: 'row',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    gap:
      spacing.sm,
  },

  listingName: {
    flex: 1,

    color:
      colors.text,

    fontSize: 14.5,

    fontWeight: '700',

    lineHeight: 19,
  },

  price: {
    color:
      colors.farmGreen,

    fontSize: 14.5,

    fontWeight: '800',

    marginTop: 4,
  },

  listingFooter: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    gap:
      spacing.sm,

    marginTop: 4,
  },

  availableText: {
    flexShrink: 1,

    color:
      colors.muted,

    fontSize: 11,
  },

  moreButton: {
    width: 28,

    height: 28,

    alignItems: 'center',

    justifyContent:
      'center',
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

    position: 'relative',

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

    fontWeight: '700',
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
    minHeight: 60,

    paddingHorizontal:
      spacing.lg,

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.md,
  },

  modalBackButton: {
    width: 36,

    height: 36,

    alignItems: 'center',

    justifyContent:
      'center',

    marginLeft: -spacing.sm,
  },

  modalTitle: {
    flex: 1,

    color: colors.text,

    fontSize: 18,

    fontWeight: '800',
  },

  modalHeaderSpacer: {
    width: 36,
  },

  modalContent: {
    paddingHorizontal:
      spacing.lg,

    paddingTop:
      spacing.sm,

    paddingBottom:
      spacing.xxl,

    gap:
      spacing.lg,
  },

  formGroup: {
    gap:
      spacing.sm,
  },

  fieldLabel: {
    color: colors.textSecondary,

    fontSize: 13,

    fontWeight: '600',
  },

  photoPicker: {
    minHeight: 150,

    borderWidth: 1,

    borderColor:
      colors.borderStrong,

    borderRadius:
      radius.lg,

    backgroundColor:
      colors.surface,

    alignItems:
      'center',

    justifyContent:
      'center',

    padding:
      spacing.md,
  },

  photoPickerPressed: {
    backgroundColor:
      colors.surfaceMuted,
  },

  photoPickerMark: {
    width: 42,

    height: 42,

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

  photoPickerTitle: {
    color:
      colors.text,

    fontWeight: '700',

    fontSize: 14,
  },

  photoPickerText: {
    marginTop:
      spacing.xs,

    color:
      colors.textSecondary,

    fontSize: 11.5,

    lineHeight: 16,

    textAlign: 'center',

    maxWidth: 280,
  },

  priceRow: {
    flexDirection: 'row',

    alignItems:
      'flex-start',

    gap: spacing.sm,
  },

  priceInputWrap: {
    flex: 1,

    minWidth: 0,
  },

  unitSuffix: {
    minHeight: 52,

    minWidth: 58,

    alignItems: 'center',

    justifyContent:
      'center',

    paddingHorizontal:
      spacing.md,

    borderWidth: 1,

    borderColor:
      colors.border,

    borderRadius:
      radius.md,

    backgroundColor:
      colors.surfaceMuted,
  },

  unitSuffixText: {
    color: colors.textSecondary,

    fontSize: 13,

    fontWeight: '700',
  },

  selectedImageCard: {
    height: 200,

    borderRadius:
      radius.lg,

    overflow: 'hidden',

    backgroundColor:
      colors.surfaceMuted,

    position:
      'relative',
  },

  selectedImage: {
    width: '100%',

    height: '100%',
  },

  selectedImageActions: {
    position:
      'absolute',

    left:
      spacing.md,

    right:
      spacing.md,

    bottom:
      spacing.md,

    flexDirection: 'row',

    gap:
      spacing.sm,
  },

  imageActionButton: {
    flex: 1,

    minHeight: 42,

    borderRadius:
      radius.md,

    backgroundColor:
      'rgba(255,255,255,0.95)',

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  changePhotoText: {
    color:
      colors.farmGreen,

    fontWeight: '700',

    fontSize: 14,
  },

  removePhotoText: {
    color:
      colors.danger,

    fontWeight: '700',

    fontSize: 14,
  },

  categoryRow: {
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

  unitRow: {
    gap:
      spacing.sm,
  },

  unitChip: {
    minWidth: 56,

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

  unitChipActive: {
    backgroundColor:
      colors.mint,

    borderColor:
      colors.farmGreen,
  },

  unitChipText: {
    color:
      colors.textSecondary,

    fontWeight: '600',

    fontSize: 13,
  },

  unitChipTextActive: {
    color:
      colors.farmGreen,

    fontWeight: '700',
  },

  descriptionInput: {
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

  submitButton: {
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

});
