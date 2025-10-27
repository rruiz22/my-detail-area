/**
 * Stock Module Constants
 * Centralized configuration values to avoid magic numbers
 */

export const STOCK_CONSTANTS = {
  /**
   * Pagination settings
   */
  PAGINATION: {
    /** Default items per page for inventory table */
    ITEMS_PER_PAGE: 25,
    /** Max items per page for exports */
    MAX_EXPORT_ITEMS: 10000,
  },

  /**
   * Polling and caching settings
   */
  POLLING: {
    /** Polling interval in milliseconds (3 minutes) */
    INTERVAL: 180000,
    /** Stale time for React Query in milliseconds (30 seconds) */
    STALE_TIME: 30000,
    /** Garbage collection time in milliseconds (5 minutes) */
    GC_TIME: 300000,
  },

  /**
   * Search and filter settings
   */
  SEARCH: {
    /** Debounce delay for search input in milliseconds */
    DEBOUNCE_DELAY: 500,
    /** Minimum characters required for search */
    MIN_SEARCH_LENGTH: 2,
  },

  /**
   * CSV Upload settings
   */
  CSV: {
    /** Maximum file size in bytes (50MB) */
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    /** Valid CSV MIME types */
    VALID_MIME_TYPES: [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'text/comma-separated-values'
    ],
    /** Maximum number of rows to process */
    MAX_ROWS: 10000,
  },

  /**
   * DMS Sync settings
   */
  DMS: {
    /** Sync interval in milliseconds (1 hour) */
    SYNC_INTERVAL: 3600000,
    /** Timeout for DMS requests in milliseconds */
    REQUEST_TIMEOUT: 30000,
  },

  /**
   * Analytics settings
   */
  ANALYTICS: {
    /** Default time range in days */
    DEFAULT_TIME_RANGE: 30,
    /** Maximum data points for charts */
    MAX_CHART_POINTS: 100,
    /** Top N items to show in charts */
    TOP_N_ITEMS: 5,
  },

  /**
   * Validation limits
   */
  VALIDATION: {
    /** Maximum stock number length */
    MAX_STOCK_NUMBER_LENGTH: 50,
    /** Maximum VIN length */
    VIN_LENGTH: 17,
    /** Minimum valid year */
    MIN_YEAR: 1900,
    /** Maximum valid year (current year + 2) */
    MAX_YEAR: new Date().getFullYear() + 2,
  },

  /**
   * UI settings
   */
  UI: {
    /** Toast duration in milliseconds */
    TOAST_DURATION: 6000,
    /** Refresh button cooldown in milliseconds */
    REFRESH_COOLDOWN: 1000,
    /** Loading skeleton rows */
    SKELETON_ROWS: 5,
  },
} as const;

/**
 * Stock filter options
 */
export const STOCK_FILTERS = {
  STATUS: {
    ALL: 'all',
    AVAILABLE: 'available',
    SOLD: 'sold',
    PENDING: 'pending',
    RESERVED: 'reserved',
  },
  MAKE: {
    ALL: 'all',
  },
} as const;

/**
 * Stock sort columns
 */
export const STOCK_SORT_COLUMNS = {
  CREATED_AT: 'created_at',
  STOCK_NUMBER: 'stock_number',
  MAKE: 'make',
  MODEL: 'model',
  YEAR: 'year',
  PRICE: 'price',
  AGE_DAYS: 'age_days',
  DMS_STATUS: 'dms_status',
} as const;

/**
 * Price ranges for analytics
 */
export const PRICE_RANGES = [
  { range: '$0-20K', min: 0, max: 20000 },
  { range: '$20-40K', min: 20000, max: 40000 },
  { range: '$40-60K', min: 40000, max: 60000 },
  { range: '$60-80K', min: 60000, max: 80000 },
  { range: '$80K+', min: 80000, max: Infinity },
] as const;

/**
 * Age ranges for analytics
 */
export const AGE_RANGES = [
  { ageRange: '0-30 days', min: 0, max: 30 },
  { ageRange: '31-60 days', min: 31, max: 60 },
  { ageRange: '61-90 days', min: 61, max: 90 },
  { ageRange: '91+ days', min: 91, max: Infinity },
] as const;
