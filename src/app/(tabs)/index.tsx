import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';

const categories = [
  { label: 'Vegetables', emoji: '🥬' },
  { label: 'Fruits', emoji: '🍍' },
  { label: 'Grains', emoji: '🌾' },
  { label: 'Livestock', emoji: '🐄' },
  { label: 'More', emoji: '•••' },
];

const products = [
  {
    id: '1',
    title: 'Fresh Tomatoes',
    price: 'GH₵ 120 / crate',
    location: 'Kumasi, Ashanti',
    rating: '4.8',
    image:
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=900&q=85',
  },
  {
    id: '2',
    title: 'Yellow Maize',
    price: 'GH₵ 80 / bag',
    location: 'Tamale, Northern',
    rating: '4.7',
    image:
      'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=900&q=85',
  },
];

export default function HomeScreen() {
  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text variant="caption" tone="muted">
              Good morning
            </Text>

            <Text variant="hero" style={styles.heading}>
              Explore Farm Produce
            </Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>⌕</Text>

          <View style={styles.searchInputWrapper}>
            <TextInput
              placeholder="Search produce, farmers, locations"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />

            <Text variant="caption" tone="muted">
              Tomatoes · Maize · Fruits · Livestock
            </Text>
          </View>

          <Pressable style={styles.filterButton}>
            <Text style={styles.filterIcon}>≡</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((category, index) => {
            const active = index === 0;

            return (
              <Pressable
                key={category.label}
                style={styles.categoryCard}
              >
                <View
                  style={[
                    styles.categoryImage,
                    active && styles.categoryImageActive,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>
                    {category.emoji}
                  </Text>
                </View>

                <Text
                  variant="caption"
                  style={[
                    styles.categoryLabel,
                    active && styles.categoryLabelActive,
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.featuredCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=88',
            }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.featuredOverlay} />

          <View style={styles.featuredContent}>
            <View style={styles.featuredBadge}>
              <Text variant="caption" style={styles.featuredBadgeText}>
                FEATURED FARM
              </Text>
            </View>

            <Text variant="title" tone="inverse" style={styles.featuredTitle}>
              Fresh Harvest Hub
            </Text>

            <Text variant="body" tone="inverse" style={styles.featuredSubtitle}>
              Verified farmers · Bulk and retail produce
            </Text>

            <Pressable style={styles.shopButton}>
              <Text style={styles.shopButtonText}>
                Shop now →
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="title">Fresh near you</Text>

          <Pressable>
            <Text variant="body" style={styles.seeAll}>
              See all
            </Text>
          </Pressable>
        </View>

        <View style={styles.productGrid}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              style={styles.productCard}
            >
              <View style={styles.productImageWrapper}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />

                <Pressable style={styles.favoriteButton}>
                  <Text style={styles.favoriteIcon}>♡</Text>
                </Pressable>
              </View>

              <View style={styles.productBody}>
                <Text variant="subtitle" numberOfLines={1}>
                  {product.title}
                </Text>

                <Text style={styles.productPrice}>
                  {product.price}
                </Text>

                <Text
                  variant="caption"
                  tone="muted"
                  numberOfLines={1}
                >
                  {product.location}
                </Text>

                <Text variant="caption" style={styles.rating}>
                  ★ {product.rating}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="title">Verified farmers</Text>

          <Pressable>
            <Text variant="body" style={styles.seeAll}>
              See all
            </Text>
          </Pressable>
        </View>

        <View style={styles.farmerCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=500&q=85',
            }}
            style={styles.farmerAvatar}
          />

          <View style={styles.farmerInfo}>
            <View style={styles.farmerNameRow}>
              <Text variant="subtitle">
                Kofi Mensah
              </Text>

              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            </View>

            <Text variant="body" tone="secondary">
              Vegetables & Grains
            </Text>

            <Text variant="caption" tone="muted">
              Kumasi · Ashanti Region
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
  },

  heading: {
    marginTop: 2,
    maxWidth: 280,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },

  notificationIcon: {
    fontSize: 19,
  },

  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
  },

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },

  searchIcon: {
    fontSize: 25,
    color: colors.text,
    marginRight: spacing.sm,
  },

  searchInputWrapper: {
    flex: 1,
  },

  searchInput: {
    fontSize: 14,
    color: colors.text,
    padding: 0,
    marginBottom: 2,
  },

  filterButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },

  filterIcon: {
    fontSize: 20,
    color: colors.farmGreen,
    transform: [{ rotate: '90deg' }],
  },

  categoriesRow: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  categoryCard: {
    width: 76,
    alignItems: 'center',
  },

  categoryImage: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  categoryImageActive: {
    borderColor: colors.farmGreen,
    borderWidth: 2,
    backgroundColor: '#F2F7F2',
  },

  categoryEmoji: {
    fontSize: 27,
  },

  categoryLabel: {
    color: colors.textSecondary,
  },

  categoryLabelActive: {
    color: colors.farmGreen,
    fontWeight: '700',
  },

  featuredCard: {
    height: 240,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xxl,
    backgroundColor: colors.farmGreen,
  },

  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 31, 11, 0.48)',
  },

  featuredContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },

  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.emerald,
    marginBottom: spacing.md,
  },

  featuredBadgeText: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  featuredTitle: {
    marginBottom: spacing.xs,
  },

  featuredSubtitle: {
    opacity: 0.9,
    marginBottom: spacing.lg,
  },

  shopButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.farmGreen,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },

  shopButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  seeAll: {
    color: colors.farmGreen,
    fontWeight: '600',
  },

  productGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },

  productCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  productImageWrapper: {
    height: 135,
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteIcon: {
    fontSize: 20,
    color: colors.text,
  },

  productBody: {
    padding: spacing.md,
  },

  productPrice: {
    color: colors.farmGreen,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },

  rating: {
    color: colors.warning,
    marginTop: 6,
    fontWeight: '600',
  },

  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },

  farmerAvatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },

  farmerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  farmerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },

  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },

  verifiedText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  chevron: {
    fontSize: 28,
    color: colors.muted,
  },
});