/**
 * Console Filter - Suppress Third-Party Extension Errors
 *
 * This file filters out console errors from browser extensions (ReasonLabs, Grammarly, etc.)
 * that clutter the developer console during development.
 *
 * These errors are NOT from your application - they're from browser extensions
 * making their own API calls.
 *
 * Only active in development mode.
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // List of third-party domains to filter out
  const thirdPartyDomains = [
    'reasonlabsapi.com',      // ReasonLabs antivirus
    'chrome-extension://',    // Chrome extensions
    'moz-extension://',       // Firefox extensions
    'safari-extension://',    // Safari extensions
    'grammarly.com',          // Grammarly extension
    'honeyextension.com',     // Honey extension
    'lastpass.com',           // LastPass extension
  ];

  // Common error patterns from extensions
  const extensionErrorPatterns = [
    'reasonlabsapi',
    'chrome-extension',
    'moz-extension',
    'Access to resource at',
    'Access to fetch at',
    'blocked by CORS policy',
    'from origin \'http://localhost:3000\' has been blocked',
    'ERR_BLOCKED_BY_CLIENT',
    'Failed to load resource',
  ];

  /**
   * Check if an error message is from a third-party extension
   */
  const isThirdPartyExtensionError = (...args: any[]): boolean => {
    const errorString = args.join(' ').toLowerCase();

    // Check if error contains any third-party domain
    for (const domain of thirdPartyDomains) {
      if (errorString.includes(domain.toLowerCase())) {
        return true;
      }
    }

    // Check if error matches extension patterns
    // Only filter if it's clearly from an external domain
    for (const pattern of extensionErrorPatterns) {
      if (errorString.includes(pattern.toLowerCase())) {
        // Make sure it's not about our own localhost or API
        if (!errorString.includes('localhost:5000') &&
            !errorString.includes('baytup.fr') &&
            !errorString.includes('/api/')) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Filtered console.error - suppresses third-party extension errors
   */
  console.error = (...args: any[]) => {
    if (isThirdPartyExtensionError(...args)) {
      // Optionally log suppressed errors (uncomment to debug)
      // originalLog('[Suppressed Extension Error]:', ...args);
      return;
    }
    originalError.apply(console, args);
  };

  /**
   * Filtered console.warn - suppresses third-party extension warnings
   */
  console.warn = (...args: any[]) => {
    if (isThirdPartyExtensionError(...args)) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Log that filter is active
  originalLog(
    '%c🧹 Console Filter Active',
    'color: #10B981; font-weight: bold; font-size: 12px; background: #ECFDF5; padding: 4px 8px; border-radius: 4px;',
    '- Suppressing third-party extension errors'
  );

  // Show what's being filtered
  originalLog(
    '%cFiltered domains:',
    'color: #6B7280; font-size: 11px;',
    thirdPartyDomains.join(', ')
  );
}

// Export for testing purposes
export {};
