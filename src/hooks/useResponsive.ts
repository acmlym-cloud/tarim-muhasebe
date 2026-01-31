import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { scale, moderateScale, verticalScale, screen, layout } from '../constants/theme';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  columns: number;
  cardWidth: number;
  scale: typeof scale;
  moderateScale: typeof moderateScale;
  verticalScale: typeof verticalScale;
}

export const useResponsive = (): ResponsiveInfo => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isLandscape = width > height;
  const isSmall = width < 375;
  const isMedium = width >= 375 && width < 414;
  const isLarge = width >= 414 && width < 768;
  const isTablet = width >= 768;

  // Calculate optimal columns based on screen size
  let columns = 1;
  if (isTablet) {
    columns = isLandscape ? 4 : 3;
  } else if (isLarge) {
    columns = isLandscape ? 3 : 2;
  } else if (isLandscape) {
    columns = 2;
  }

  // Calculate card width based on columns
  const gridGap = scale(12);
  const padding = scale(16) * 2;
  const cardWidth = (width - padding - (gridGap * (columns - 1))) / columns;

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    isLandscape,
    columns,
    cardWidth,
    scale,
    moderateScale,
    verticalScale,
  };
};

export default useResponsive;
