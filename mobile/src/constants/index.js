/**
 * Application-wide constants
 */

export const COLORS = {
  // Primary
  PRIMARY: '#007AFF',
  PRIMARY_DARK: '#0051D5',
  
  // Neutrals
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  GRAY_LIGHT: '#F2F2F7',
  GRAY_MID: '#8E8E93',
  GRAY_DARK: '#3C3C43',
  GRAY_BORDER: '#C7C7CC',
  GRAY_EMPTY: '#E5E5EA',
  
  // Semantic
  ERROR: '#C62828',
  ERROR_BG: '#FFEBEE',
  WARNING: '#FF9500',
  SUCCESS: '#34C759',
  
  // Overlay
  OVERLAY: 'rgba(0,0,0,0.5)',
  OVERLAY_LIGHT: 'rgba(0,0,0,0.3)',
};

export const TYPOGRAPHY = {
  // Font Sizes
  TITLE_LARGE: 34,
  TITLE: 28,
  TITLE_MEDIUM: 22,
  TITLE_SMALL: 20,
  BODY_LARGE: 17,
  BODY: 15,
  BODY_SMALL: 14,
  CAPTION: 13,
  CAPTION_SMALL: 11,
  
  // Line Heights
  LINE_HEIGHT_TIGHT: 1.2,
  LINE_HEIGHT_NORMAL: 1.4,
  LINE_HEIGHT_RELAXED: 1.6,
};

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
};

export const OCCASIONS = [
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '👕' },
  { id: 'date', label: 'Date', emoji: '🥂' },
  { id: 'formal', label: 'Formal', emoji: '🎩' },
  { id: 'active', label: 'Active', emoji: '👟' },
  { id: 'party', label: 'Party', emoji: '🎊' },
];

export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};
