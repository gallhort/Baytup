/**
 * Feature Flags Type Definitions
 * System-wide feature flags managed by admin
 */

export interface FeatureFlags {
  vehiclesEnabled: boolean;
  accommodationsEnabled: boolean;
}

export interface FeatureFlagsResponse {
  status: 'success' | 'error';
  data: {
    features: FeatureFlags;
    version: number;
  };
}

export interface SystemSettingsResponse {
  status: 'success' | 'error';
  data: {
    settings: {
      _id: string;
      features: FeatureFlags;
      version: number;
      lastModified: string;
      modifiedBy?: string;
      changeHistory: ChangeHistoryEntry[];
      createdAt: string;
      updatedAt: string;
    };
  };
}

export interface ChangeHistoryEntry {
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface UpdateFeatureRequest {
  enabled: boolean;
  reason?: string;
}

export interface UpdateFeatureResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    features: FeatureFlags;
    version: number;
  };
}

export interface FeatureFlagsUpdateEvent {
  feature: string;
  enabled: boolean;
  version: number;
  updatedBy?: {
    id: string;
    name: string;
  };
}
