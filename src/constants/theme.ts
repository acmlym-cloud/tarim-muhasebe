import { Appearance, Dimensions, PixelRatio } from 'react-native';

// ==================== RESPONSIVE UTILS ====================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Samsung S24 Plus base dimensions (1440 x 3120)
const BASE_WIDTH = 393; // Logical width for S24 Plus
const BASE_HEIGHT = 852; // Logical height for S24 Plus

// Scale based on screen width
export const scale = (size: number): number => {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * ratio;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Moderate scale - less aggressive scaling
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

// Vertical scale based on screen height
export const verticalScale = (size: number): number => {
  const ratio = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * ratio));
};

// Device size categories
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
export const isTablet = SCREEN_WIDTH >= 768;

// Screen dimensions export
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallDevice,
  isMedium: isMediumDevice,
  isLarge: isLargeDevice,
  isTablet: isTablet,
};

// ==================== COLOR PALETTE ====================

// Light Theme Colors
export const lightColors = {
  // Primary - Deep Blue
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#42A5F5',
  primaryFaded: 'rgba(21, 101, 192, 0.1)',

  // Secondary - Orange
  secondary: '#EF6C00',
  secondaryDark: '#E65100',
  secondaryLight: '#FF9800',
  secondaryFaded: 'rgba(239, 108, 0, 0.1)',

  // Accent - Green
  accent: '#2E7D32',
  accentLight: '#4CAF50',

  // Background
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',
  card: '#FFFFFF',

  // Text
  text: '#1A1A2E',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Status
  error: '#DC2626',
  errorLight: '#FEE2E2',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Finance
  debt: '#DC2626',
  credit: '#16A34A',
  expense: '#EF6C00',
  income: '#1565C0',

  // UI Elements
  border: '#E2E8F0',
  divider: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  
  // Tab Bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#1565C0',
  tabInactive: '#94A3B8',

  // Input
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputText: '#1A1A2E',
  inputPlaceholder: '#94A3B8',

  // Modal
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark Theme Colors
export const darkColors = {
  // Primary - Lighter Blue for dark mode
  primary: '#42A5F5',
  primaryDark: '#1565C0',
  primaryLight: '#64B5F6',
  primaryFaded: 'rgba(66, 165, 245, 0.15)',

  // Secondary - Lighter Orange
  secondary: '#FF9800',
  secondaryDark: '#EF6C00',
  secondaryLight: '#FFB74D',
  secondaryFaded: 'rgba(255, 152, 0, 0.15)',

  // Accent - Lighter Green
  accent: '#4CAF50',
  accentLight: '#66BB6A',

  // Background - Dark
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  card: '#1E293B',

  // Text - Light for dark mode
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textDisabled: '#64748B',
  textOnPrimary: '#0F172A',

  // Status - Brighter for dark mode
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.2)',
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.2)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.2)',
  info: '#38BDF8',
  infoLight: 'rgba(56, 189, 248, 0.2)',

  // Finance - Brighter
  debt: '#EF4444',
  credit: '#22C55E',
  expense: '#FF9800',
  income: '#42A5F5',

  // UI Elements
  border: '#334155',
  divider: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Tab Bar
  tabBar: '#1E293B',
  tabBarBorder: '#334155',
  tabActive: '#42A5F5',
  tabInactive: '#64748B',

  // Input
  inputBackground: '#334155',
  inputBorder: '#475569',
  inputText: '#F8FAFC',
  inputPlaceholder: '#64748B',

  // Modal
  modalBackground: '#1E293B',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',
};

// Default to light colors for backward compatibility
export const colors = lightColors;

// Get colors based on theme
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;

// ==================== SPACING ====================

export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
};

// ==================== TYPOGRAPHY ====================

export const typography = {
  fontSizes: {
    xs: moderateScale(10),
    sm: moderateScale(12),
    md: moderateScale(14),
    lg: moderateScale(16),
    xl: moderateScale(18),
    xxl: moderateScale(24),
    xxxl: moderateScale(32),
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// ==================== BORDERS ====================

export const borders = {
  radius: {
    sm: scale(6),
    md: scale(10),
    lg: scale(14),
    xl: scale(20),
    round: 9999,
  },
};

// ==================== SHADOWS ====================

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
};

// ==================== LAYOUT ====================

export const layout = {
  // Card dimensions
  cardMinHeight: verticalScale(80),
  cardPadding: scale(16),
  
  // Touch targets (minimum 48dp for Android)
  touchTargetMin: 48,
  
  // Grid
  gridGap: scale(12),
  gridColumns: isTablet ? 3 : isLargeDevice ? 2 : 1,
  
  // Header
  headerHeight: verticalScale(56),
  
  // Tab bar
  tabBarHeight: verticalScale(60),
  
  // FAB
  fabSize: scale(56),
  fabMargin: scale(16),
  
  // Modal
  modalMaxWidth: isTablet ? 600 : SCREEN_WIDTH - scale(32),
  modalMaxHeight: SCREEN_HEIGHT * 0.85,
  
  // Input
  inputHeight: verticalScale(48),
  
  // Split view threshold (for tablets)
  splitViewThreshold: 768,
};
