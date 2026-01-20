const SystemSettings = require('../models/SystemSettings');
const EventEmitter = require('events');

class FeatureFlagCache extends EventEmitter {
  constructor() {
    super();
    this.cache = null;
    this.cacheVersion = 0;
    this.lastFetch = null;
    this.TTL = 60000; // 60 seconds TTL as fallback
    this.isFetching = false;
  }

  /**
   * Get feature flags (from cache or database)
   */
  async getFlags() {
    // Return cached flags if valid
    if (this.cache && this.isCacheValid()) {
      return this.cache;
    }

    // Prevent concurrent fetches
    if (this.isFetching) {
      await this.waitForFetch();
      return this.cache;
    }

    return await this.refreshCache();
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid() {
    if (!this.lastFetch) return false;
    const age = Date.now() - this.lastFetch;
    return age < this.TTL;
  }

  /**
   * Refresh cache from database
   */
  async refreshCache() {
    try {
      this.isFetching = true;

      const settings = await SystemSettings.getSettings();

      this.cache = {
        features: settings.features,
        version: settings.version,
        lastModified: settings.lastModified
      };

      this.cacheVersion = settings.version;
      this.lastFetch = Date.now();

      // Emit cache refresh event
      this.emit('cache-refreshed', this.cache);

      return this.cache;
    } catch (error) {
      console.error('❌ Error refreshing feature flag cache:', error);

      // Return cached data even if stale (graceful degradation)
      if (this.cache) {
        console.warn('⚠️ Using stale cache due to refresh error');
        return this.cache;
      }

      // Fallback to safe defaults if no cache exists
      return {
        features: {
          vehiclesEnabled: true,
          accommodationsEnabled: true
        },
        version: 0,
        lastModified: new Date()
      };
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Wait for ongoing fetch to complete
   */
  async waitForFetch() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isFetching) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  /**
   * Invalidate cache (called when settings change)
   */
  async invalidate() {
    console.log('🔄 Invalidating feature flag cache...');
    this.cache = null;
    this.lastFetch = null;
    return await this.refreshCache();
  }

  /**
   * Check if a specific feature is enabled
   */
  async isFeatureEnabled(featureName) {
    const flags = await this.getFlags();
    return flags.features[featureName] !== false; // Default to true if undefined
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats() {
    return {
      cached: !!this.cache,
      version: this.cacheVersion,
      lastFetch: this.lastFetch,
      age: this.lastFetch ? Date.now() - this.lastFetch : null,
      valid: this.isCacheValid()
    };
  }
}

// Singleton instance
const featureFlagCache = new FeatureFlagCache();

module.exports = featureFlagCache;
