import { useWindowDimensions } from 'react-native';

export const breakpoints = {
  compact: 360,
  largePhone: 430,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export type DeviceClass =
  | 'compact'
  | 'phone'
  | 'large-phone'
  | 'tablet'
  | 'desktop'
  | 'wide';

export type ResponsiveLayout = {
  width: number;
  height: number;

  deviceClass: DeviceClass;

  isCompact: boolean;
  isPhone: boolean;
  isLargePhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;

  horizontalPadding: number;
  sectionGap: number;
  cardGap: number;

  contentMaxWidth: number;
  formMaxWidth: number;
  modalMaxWidth: number;

  marketColumns: number;
  dashboardColumns: number;

  heroHeight: number;
  listingImageHeight: number;

  tabBarHeight: number;
};

export function getResponsiveLayout(
  width: number,
  height: number
): ResponsiveLayout {
  const isCompact =
    width < breakpoints.compact;

  const isPhone =
    width < breakpoints.tablet;

  const isLargePhone =
    width >= breakpoints.largePhone &&
    width < breakpoints.tablet;

  const isTablet =
    width >= breakpoints.tablet &&
    width < breakpoints.desktop;

  const isDesktop =
    width >= breakpoints.desktop &&
    width < breakpoints.wide;

  const isWide =
    width >= breakpoints.wide;

  let deviceClass: DeviceClass =
    'phone';

  if (isCompact) {
    deviceClass = 'compact';
  } else if (isLargePhone) {
    deviceClass = 'large-phone';
  } else if (isTablet) {
    deviceClass = 'tablet';
  } else if (isDesktop) {
    deviceClass = 'desktop';
  } else if (isWide) {
    deviceClass = 'wide';
  }

  const horizontalPadding =
    isWide
      ? 40
      : isDesktop
        ? 36
        : isTablet
          ? 28
          : isCompact
            ? 16
            : 20;

  const sectionGap =
    isDesktop || isWide
      ? 32
      : isTablet
        ? 28
        : 24;

  const cardGap =
    isDesktop || isWide
      ? 18
      : isTablet
        ? 16
        : 12;

  const contentMaxWidth =
    isWide
      ? 1180
      : isDesktop
        ? 1080
        : isTablet
          ? 920
          : width;

  const formMaxWidth =
    isDesktop || isWide
      ? 680
      : isTablet
        ? 620
        : width;

  const modalMaxWidth =
    isDesktop || isWide
      ? 640
      : isTablet
        ? 600
        : width;

  const marketColumns =
    isWide
      ? 4
      : isDesktop
        ? 3
        : isTablet
          ? 3
          : isCompact
            ? 1
            : 2;

  const dashboardColumns =
    isDesktop || isWide
      ? 3
      : isTablet
        ? 2
        : 1;

  const heroHeight =
    isWide
      ? 350
      : isDesktop
        ? 330
        : isTablet
          ? 310
          : isCompact
            ? 220
            : 250;

  const listingImageHeight =
    isWide
      ? 260
      : isDesktop
        ? 240
        : isTablet
          ? 220
          : isCompact
            ? 190
            : 210;

  const tabBarHeight =
    isTablet ||
    isDesktop ||
    isWide
      ? 76
      : 72;

  return {
    width,
    height,

    deviceClass,

    isCompact,
    isPhone,
    isLargePhone,
    isTablet,
    isDesktop,
    isWide,

    horizontalPadding,
    sectionGap,
    cardGap,

    contentMaxWidth,
    formMaxWidth,
    modalMaxWidth,

    marketColumns,
    dashboardColumns,

    heroHeight,
    listingImageHeight,

    tabBarHeight,
  };
}

export function useResponsiveLayout() {
  const {
    width,
    height,
  } = useWindowDimensions();

  return getResponsiveLayout(
    width,
    height
  );
}