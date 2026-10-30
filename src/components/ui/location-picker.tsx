import {
  type ComponentProps,
  useMemo,
  useState,
} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import {
  GHANA_LOCATIONS,
  GHANA_REGIONS,
  buildLocationValue,
  formatLocationLabel,
  getDistricts,
  getTotalMMDACount,
  getTowns,
  isLegacyLocation,
  parseKnownLocation,
} from '@/lib/ghana-locations';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type PickerStep = 'region' | 'district' | 'town';

type RegionOption = {
  kind: 'region';
  key: string;
  region: string;
  districtCount: number;
};

type DistrictOption = {
  kind: 'district';
  key: string;
  region: string;
  district: string;
  townCount: number;
};

type TownOption = {
  kind: 'town';
  key: string;
  region: string;
  district: string;
  town: string;
};

type DistrictOnlyOption = {
  kind: 'district-only';
  key: string;
  region: string;
  district: string;
};

type LocationOption =
  | RegionOption
  | DistrictOption
  | TownOption
  | DistrictOnlyOption;

type SearchOption =
  | RegionOption
  | DistrictOption
  | TownOption;

export type LocationFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  onPress: () => void;
};

export type LocationPickerPanelProps = {
  value: string;
  maxWidth?: number;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

/**
 * Pressable profile field that mirrors the app's Input styling without
 * allowing free-form text entry.
 */
export function LocationField({
  label,
  value,
  placeholder = 'Select your location',
  error,
  disabled = false,
  onPress,
}: LocationFieldProps) {
  const display = formatLocationLabel(value);
  const legacy = isLegacyLocation(value);

  return (
    <View style={styles.fieldWrapper}>
      <Text
        variant="caption"
        tone="muted"
        style={styles.fieldLabel}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${
          display || placeholder
        }`}
        accessibilityHint="Opens a searchable list of Ghanaian locations"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fieldShell,

          error ? styles.fieldShellError : null,

          pressed && !disabled
            ? styles.fieldShellPressed
            : null,

          disabled ? styles.fieldShellDisabled : null,
        ]}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color={colors.muted}
          style={styles.fieldIcon}
        />

        <View style={styles.fieldContent}>
          <Text
            style={[
              styles.fieldValue,

              !display
                ? styles.fieldPlaceholder
                : null,
            ]}
          >
            {display || placeholder}
          </Text>

          {legacy ? (
            <Text
              variant="caption"
              tone="muted"
              style={styles.fieldHint}
            >
              Saved location · choose to update
            </Text>
          ) : null}
        </View>

        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {error ? (
        <Text
          variant="caption"
          tone="danger"
          style={styles.fieldError}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Full-height picker rendered inside the existing profile edit modal. It
 * replaces the form while open; it is deliberately not a nested Modal.
 */
export function LocationPickerPanel({
  value,
  maxWidth,
  onCancel,
  onConfirm,
}: LocationPickerPanelProps) {
  const insets = useSafeAreaInsets();

  const initial = useMemo(
    () => parseKnownLocation(value),
    [value]
  );

  const [query, setQuery] = useState('');

  const [step, setStep] = useState<PickerStep>(
    initial?.district ? 'town' : 'region'
  );

  const [region, setRegion] = useState(
    initial?.region ?? ''
  );

  const [district, setDistrict] = useState(
    initial?.district ?? ''
  );

  const [pending, setPending] = useState(
    initial?.district
      ? buildLocationValue(
          initial.region,
          initial.district,
          initial.town
        )
      : ''
  );

  const regionOptions = useMemo<RegionOption[]>(
    () =>
      GHANA_REGIONS.map((regionName) => ({
        kind: 'region',
        key: `region:${regionName}`,
        region: regionName,
        districtCount: getDistricts(
          regionName
        ).length,
      })),
    []
  );

  const districtOptions = useMemo<
    DistrictOption[]
  >(() => {
    if (!region) {
      return [];
    }

    return getDistricts(region).map(
      (districtName) => ({
        kind: 'district',
        key: `district:${region}:${districtName}`,
        region,
        district: districtName,
        townCount: getTowns(
          region,
          districtName
        ).length,
      })
    );
  }, [region]);

  const townOptions = useMemo<TownOption[]>(() => {
    if (!region || !district) {
      return [];
    }

    return getTowns(region, district).map(
      (townName) => ({
        kind: 'town',
        key: `town:${region}:${district}:${townName}`,
        region,
        district,
        town: townName,
      })
    );
  }, [district, region]);

  const districtOnlyOption =
    useMemo<DistrictOnlyOption | null>(() => {
      if (!region || !district) {
        return null;
      }

      return {
        kind: 'district-only',
        key: `district-only:${region}:${district}`,
        region,
        district,
      };
    }, [district, region]);

  const allSearchOptions = useMemo<
    SearchOption[]
  >(() => {
    const options: SearchOption[] = [];

    for (const regionName of GHANA_REGIONS) {
      const districts =
        GHANA_LOCATIONS[regionName] ?? {};

      options.push({
        kind: 'region',
        key: `region:${regionName}`,
        region: regionName,
        districtCount: Object.keys(
          districts
        ).length,
      });

      for (const districtName of Object.keys(
        districts
      )) {
        options.push({
          kind: 'district',
          key: `district:${regionName}:${districtName}`,
          region: regionName,
          district: districtName,
          townCount:
            districts[districtName].length,
        });

        for (const townName of districts[
          districtName
        ]) {
          options.push({
            kind: 'town',
            key: `town:${regionName}:${districtName}:${townName}`,
            region: regionName,
            district: districtName,
            town: townName,
          });
        }
      }
    }

    return options;
  }, []);

  const searchOptions = useMemo<
    SearchOption[]
  >(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return allSearchOptions
      .map((option) => {
        const name =
          option.kind === 'region'
            ? option.region
            : option.kind === 'district'
              ? option.district
              : option.town;

        const lowerName = name.toLowerCase();

        const context =
          option.kind === 'region'
            ? 'region'
            : `${option.region} ${option.district}`.toLowerCase();

        let score = -1;

        if (lowerName.startsWith(term)) {
          score = 0;
        } else if (lowerName.includes(term)) {
          score = 1;
        } else if (context.includes(term)) {
          score = 2;
        }

        return { option, score, lowerName };
      })
      .filter((entry) => entry.score >= 0)
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.lowerName.localeCompare(
            b.lowerName
          ) ||
          a.option.key.localeCompare(
            b.option.key
          )
      )
      .map((entry) => entry.option);
  }, [allSearchOptions, query]);

  const listData = useMemo<
    LocationOption[]
  >(() => {
    if (query.trim()) {
      return searchOptions;
    }

    if (step === 'region') {
      return regionOptions;
    }

    if (step === 'district') {
      return districtOptions;
    }

    const options: LocationOption[] = [];

    if (districtOnlyOption) {
      options.push(districtOnlyOption);
    }

    options.push(...townOptions);

    return options;
  }, [
    districtOnlyOption,
    districtOptions,
    query,
    regionOptions,
    searchOptions,
    step,
    townOptions,
  ]);

  const legacy = isLegacyLocation(value);
  const canGoBack =
    Boolean(query.trim()) || step !== 'region';

  const pathLabel = query.trim()
    ? 'Search results'
    : step === 'region'
      ? 'Ghana'
      : step === 'district'
        ? region
        : `${district} · ${region}`;

  const sectionLabel = query.trim()
    ? `Results for “${query.trim()}”`
    : step === 'region'
      ? 'Regions'
      : step === 'district'
        ? `Districts in ${region}`
        : `Towns in ${district}`;

  function clearQuery() {
    setQuery('');
  }

  function selectRegion(regionName: string) {
    setRegion(regionName);
    setDistrict('');
    setStep('district');
    setQuery('');
  }

  function selectDistrict(
    regionName: string,
    districtName: string
  ) {
    setRegion(regionName);
    setDistrict(districtName);
    setStep('town');
    setQuery('');
  }

  function selectTown(
    regionName: string,
    districtName: string,
    townName: string
  ) {
    setRegion(regionName);
    setDistrict(districtName);
    setStep('town');
    setPending(
      buildLocationValue(
        regionName,
        districtName,
        townName
      )
    );
    setQuery('');
  }

  function selectDistrictOnly(
    regionName: string,
    districtName: string
  ) {
    setRegion(regionName);
    setDistrict(districtName);
    setStep('town');
    setPending(
      buildLocationValue(
        regionName,
        districtName
      )
    );
    setQuery('');
  }

  function handleBack() {
    if (query.trim()) {
      clearQuery();
      return;
    }

    if (step === 'town') {
      setStep('district');
      setDistrict('');
      return;
    }

    if (step === 'district') {
      setStep('region');
      setRegion('');
      setDistrict('');
    }
  }

  function handleOptionPress(option: LocationOption) {
    switch (option.kind) {
      case 'region':
        selectRegion(option.region);
        return;

      case 'district':
        selectDistrict(
          option.region,
          option.district
        );
        return;

      case 'district-only':
        selectDistrictOnly(
          option.region,
          option.district
        );
        return;

      case 'town':
        selectTown(
          option.region,
          option.district,
          option.town
        );
    }
  }

  function isSelected(option: LocationOption) {
    if (!pending) {
      return false;
    }

    if (option.kind === 'town') {
      return (
        pending ===
        buildLocationValue(
          option.region,
          option.district,
          option.town
        )
      );
    }

    if (option.kind === 'district-only') {
      return (
        pending ===
        buildLocationValue(
          option.region,
          option.district
        )
      );
    }

    return false;
  }

  function renderOption(option: LocationOption) {
    switch (option.kind) {
      case 'region':
        return (
          <LocationRow
            title={option.region}
            subtitle={`${option.districtCount} districts`}
            icon="map-outline"
            chevron
            onPress={() =>
              handleOptionPress(option)
            }
          />
        );

      case 'district':
        return (
          <LocationRow
            title={option.district}
            subtitle={`${option.townCount} major towns`}
            icon="business-outline"
            chevron
            onPress={() =>
              handleOptionPress(option)
            }
          />
        );

      case 'district-only':
        return (
          <LocationRow
            title="Use district only"
            subtitle={`${option.district} · ${option.region}`}
            icon="navigate-outline"
            selected={isSelected(option)}
            onPress={() =>
              handleOptionPress(option)
            }
          />
        );

      case 'town':
        return (
          <LocationRow
            title={option.town}
            subtitle={`${option.district} · ${option.region}`}
            icon="location-outline"
            selected={isSelected(option)}
            onPress={() =>
              handleOptionPress(option)
            }
          />
        );
    }
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.panel,
        maxWidth ? { maxWidth } : null,
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.panelHeader}>
        <View style={styles.headerSide}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                query.trim()
                  ? 'Clear search'
                  : 'Go back'
              }
              hitSlop={8}
              onPress={handleBack}
              style={({ pressed }) => [
                styles.headerIconButton,

                pressed
                  ? styles.headerIconPressed
                  : null,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.farmGreen}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerCenter}>
          <Text variant="subtitle">
            Select location
          </Text>

          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={styles.headerPath}
          >
            {pathLabel}
          </Text>
        </View>

        <View style={styles.headerSide} />
      </View>

      <View style={styles.searchArea}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search town, district or region"
          icon="search-outline"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search Ghana locations"
          rightAccessory={
            query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={clearQuery}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            ) : undefined
          }
        />

        <Text
          variant="caption"
          tone="muted"
          style={styles.coverageNote}
        >
          All {GHANA_REGIONS.length} regions
          and {getTotalMMDACount()} districts
          · major towns only
        </Text>
      </View>

      <View style={styles.listHeader}>
        {legacy && !pending ? (
          <View style={styles.legacyNotice}>
            <Ionicons
              name="bookmark-outline"
              size={16}
              color={colors.farmGreen}
            />

            <View style={styles.legacyContent}>
              <Text
                variant="caption"
                style={styles.legacyTitle}
              >
                Saved location
              </Text>

              <Text
                variant="caption"
                tone="muted"
                style={styles.legacyText}
              >
                {value.trim()}
              </Text>

              <Text
                variant="caption"
                tone="muted"
                style={styles.legacyHint}
              >
                Pick a location below to replace it.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionRow}>
          <Text
            numberOfLines={1}
            style={styles.sectionLabel}
          >
            {sectionLabel}
          </Text>

          <Text
            variant="caption"
            tone="muted"
            style={styles.sectionCount}
          >
            {listData.length}
          </Text>
        </View>
      </View>

      <View style={styles.listArea}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) =>
            renderOption(item)
          }
          ItemSeparatorComponent={
            RowSeparator
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            query.trim() ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyMark}>
                  <Ionicons
                    name="search-outline"
                    size={24}
                    color={colors.farmGreen}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No locations match your search.
                </Text>

                <Text
                  variant="caption"
                  tone="muted"
                  style={styles.emptyText}
                >
                  Try a town, district or region name.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={clearQuery}
                  style={({ pressed }) => [
                    styles.emptyAction,

                    pressed
                      ? styles.buttonPressed
                      : null,
                  ]}
                >
                  <Text
                    style={styles.emptyActionText}
                  >
                    Clear search
                  </Text>
                </Pressable>
              </View>
            ) : undefined
          }
        />
      </View>

      <View
        style={[
          styles.panelFooter,

          {
            paddingBottom: Math.max(
              insets.bottom,
              spacing.md
            ),
          },
        ]}
      >
        <View style={styles.footerSummary}>
          <Text
            variant="caption"
            tone="muted"
          >
            Selected location
          </Text>

          <Text
            numberOfLines={2}
            style={styles.footerValue}
          >
            {pending
              ? formatLocationLabel(pending)
              : 'No new location selected'}
          </Text>
        </View>

        <View style={styles.footerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,

              pressed
                ? styles.buttonPressed
                : null,
            ]}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: !pending,
            }}
            disabled={!pending}
            onPress={() => onConfirm(pending)}
            style={({ pressed }) => [
              styles.confirmButton,

              !pending
                ? styles.confirmButtonDisabled
                : null,

              pressed && pending
                ? styles.buttonPressed
                : null,
            ]}
          >
            <Text
              variant="subtitle"
              tone="inverse"
              style={styles.confirmButtonText}
            >
              Use this location
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

type LocationRowProps = {
  title: string;
  subtitle: string;
  icon: IoniconName;
  selected?: boolean;
  chevron?: boolean;
  onPress: () => void;
};

function LocationRow({
  title,
  subtitle,
  icon,
  selected = false,
  chevron = false,
  onPress,
}: LocationRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{
        selected,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,

        selected ? styles.rowSelected : null,

        pressed ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowMark}>
        <Ionicons
          name={icon}
          size={17}
          color={colors.farmGreen}
        />
      </View>

      <View style={styles.rowContent}>
        <Text
          numberOfLines={2}
          style={styles.rowTitle}
        >
          {title}
        </Text>

        <Text
          numberOfLines={2}
          style={styles.rowSubtitle}
        >
          {subtitle}
        </Text>
      </View>

      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={colors.emerald}
        />
      ) : chevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.muted}
        />
      ) : null}
    </Pressable>
  );
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

const styles = StyleSheet.create({
  fieldWrapper: {
    gap: spacing.xs,
  },

  fieldLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  fieldShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },

  fieldShellError: {
    borderColor: colors.danger,
  },

  fieldShellPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  fieldShellDisabled: {
    opacity: 0.6,
  },

  fieldIcon: {
    marginRight: spacing.sm,
  },

  fieldContent: {
    flex: 1,
    minWidth: 0,
  },

  fieldValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },

  fieldPlaceholder: {
    color: colors.muted,
  },

  fieldHint: {
    marginTop: 2,
  },

  fieldError: {
    marginTop: 2,
  },

  panel: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.background,
  },

  panelHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  headerSide: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconPressed: {
    backgroundColor: colors.mint,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerPath: {
    marginTop: 1,
  },

  searchArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  coverageNote: {
    marginTop: spacing.xs,
  },

  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },

  legacyNotice: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mintStrong,
    backgroundColor: colors.mint,
  },

  legacyContent: {
    flex: 1,
    minWidth: 0,
  },

  legacyTitle: {
    color: colors.farmGreen,
    fontWeight: '700',
  },

  legacyText: {
    marginTop: 1,
  },

  legacyHint: {
    marginTop: 2,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  sectionLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  sectionCount: {
    fontVariant: ['tabular-nums'],
  },

  listArea: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },

  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  rowSelected: {
    backgroundColor: colors.successSoft,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  rowMark: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },

  rowContent: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },

  rowSubtitle: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 17,
  },

  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },

  emptyMark: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },

  emptyTitle: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  emptyAction: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
  },

  emptyActionText: {
    color: colors.farmGreen,
    fontWeight: '700',
    fontSize: 13,
  },

  panelFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  footerSummary: {
    marginBottom: spacing.sm,
  },

  footerValue: {
    marginTop: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },

  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  cancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },

  cancelButtonText: {
    color: colors.farmGreen,
    fontSize: 14,
    fontWeight: '700',
  },

  confirmButton: {
    flex: 1.4,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.farmGreen,
  },

  confirmButtonDisabled: {
    opacity: 0.45,
  },

  confirmButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },

  buttonPressed: {
    opacity: 0.85,
  },
});
