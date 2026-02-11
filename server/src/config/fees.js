/**
 * Baytup Fee Structure Configuration
 *
 * Central source of truth for all commission rates and fees.
 * Change rates here to update them across the entire platform.
 */

module.exports = {
  // Guest service fee (charged on top of subtotal)
  GUEST_SERVICE_FEE_RATE: 0.08, // 8%

  // Host commission (deducted from host payout)
  HOST_COMMISSION_RATE: 0.03, // 3%

  // Combined platform revenue rate (for reference)
  TOTAL_PLATFORM_RATE: 0.11, // 11% (8% + 3%)
};
